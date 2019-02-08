
/*
 *@file system.js
 *@author Jarel Pellew
 *@desc Handler for Admin functions on backend
 */

const { raw, transaction } = require('objection');
const excel   = require('exceljs');
const log     = require('./../../config/logging');
const Student = require('./../models/students');
const knex    = Student.knex();
const sock    = require('./../services/socket_service');

exports.get = async (req, res) => {
  try {
    const filter = JSON.parse(req.params.filter);
    let sort = filter.sort;
    if(Object.keys(sort).length === 0) {
      sort = {headerTable: "students", header: "id", direction: "DESC"};
    }
    let rowFilters = filter.rowFilters;
    await transaction(knex, async (trx) => {
      const start   = new Date().getTime();
      const [students, total] = await Promise.all([
        Student.query().select('students.*', 'school.name AS school', raw('GROUP_CONCAT(therapists.therapists_id) AS therapists_ids'))
        .joinRelation('[school]')
        .leftJoinRelation('therapists')
        .limit(filter.limit).offset(filter.page * filter.limit).groupBy('students.id').orderBy(sort.headerTable !== "" ? sort.headerTable + "." + sort.header : sort.header, sort.direction)
        .where(b => student_filter_where(b, req, rowFilters)),
        Student.query(trx).countDistinct('students.id as total').joinRelation('[school, therapists]')
        .where(b => student_filter_where(b, req, rowFilters))
        .first(),
      ]);
      log.info("Query Time:", new Date().getTime() - start, "ms");
      //log.info("Students", total);
      return res.send({students: students, ...total});
    });
  } catch (err) {
    log.error("Error Grabbing Students", err);
    log.error(err);
    return res.status(400).send(err);
  }
}

exports.getAll = async (req, res) => {
  try {
    const students = await Student.query().select(raw('CONCAT(first_name, " ", last_name) AS label'), 'id as value');
    log.info("Student Length", students.length);
    res.send({students: students});
  } catch (err) {
    log.error("Error Grabbing Student Names", err);
    //log.fatal(err);
    return res.status(500).send(err.message);
  }
}

exports.add = async (req, res) => {
  try {
    const body = req.body;
    body.dob = new Date(body.dob);
    await transaction(knex, async (trx) => {
      const student = await Student.query(trx).insertGraphAndFetch(body, {relate: 'school'});
      //Temporary Hopefully while i fix above
      const new_students = await Student.query(trx).select('students.*', 'school.name AS school').joinRelation('school').where("students.id", student.id).first();
      student.$query(trx).joinRelation('school');
      log.info("Adding Student", new_students);
      sock.emit('new_student', new_students);
      res.send();
    });
  } catch (err) {
    log.error(err, "Error Adding Student");
    res.status(400).send(err.message);
  }
}

exports.edit = async (req, res) => {
  try {
    const start   = new Date().getTime();
    const student = await Student.query().select().joinEager('school').findById(req.params.id).first().debug();
    log.info("Query Time:", new Date().getTime() - start, "ms");
      return res.send(student);
  } catch (err) {
    log.error(err, "Error Editting Students");
    return res.status(400).send(err.message);
  }
}

exports.update = async (req, res) => {
  try {
    const body = req.body;
    body.dob = new Date(body.dob);
    await transaction(knex, async (trx) => {
      await Student.query(trx).upsertGraph(body);
      log.info("Updating Student", body);
      res.send();
      sock.emit('upd_student', body);
    });
  } catch (err) {
    log.error(err, "Error Updating Student");
    res.status(400).send(err.message);
  }
}

exports.delete = async (req, res) => {
  try {
    const ids = req.params.ids.split(',');
    await transaction(knex, async (trx) => {
      //await Student.query(trx).delete().whereIn("id", ids);
      await Student.query().whereIn('id', ids).map(async (s) => {await s.$query().delete();});
    });
    res.send();
    sock.emit('del_student', ids);
  } catch (err) {
    log.error(err, "Error Deleting Students");
    return res.status(400).send(err.message);
  }
}

exports.disable = async (req, res) => {
  try {
    const ids = req.body.ids;
    log.info("Attempting to disable", ids);
    await Student.query().whereIn('id', ids).update({active: 0});
    return res.send();
  } catch (err) {
    log.error("Unable to Disable Students", err);
    log.error(err);
    return res.status(400).send(err.message);
  }
}

exports.enable = async (req, res) => {
  try {
    const ids = req.body.ids;
    log.info("Attempting to enable", ids);
    await Student.query().whereIn('id', ids).update({active: 1});
    return res.send();
  } catch (err) {
    log.error("Unable to Disable Students", err);
    log.error(err);
    return res.status(400).send(err.message);
  }
}

exports.import = async (req, res) => {
  try {
    const file = req.files.file;
    const path = `/var/tmp/${file.name}`;
    await file.mv(path);
    const therapists = await csv({delimiter: "\t"}).fromFile(path);
    log.info("Therapists being uploaded", therapists);
    await Promise.all(therapists.map(async (t) => {
      await transaction(knex, async (trx) => {
        const state_ids = t.states && t.states.split(",") || null;
        const states = state_ids && await State.query().select('id AS states_id')
          .whereIn('id', state_ids)
          .orWhereIn('full_name', state_ids)
          .orWhereIn('abbrev', state_ids) || undefined;
        const type  = t.therapist_type && (await Types.query().select('id AS value', 'type AS label')
          .where('id', t.therapist_type).orWhere('type', t.therapist_type)
          .orWhere('abbrev', t.therapist_type))[0] || undefined;
        const user = {
          id: t.id || undefined,
          first_name: t.first_name || undefined,
          last_name: t.last_name || undefined,
          dob: t.dob || undefined,
          k12_student_id: t.k12_student_id || undefined,
        };
        log.info("USER", user);
        user.password = (User.generateHash(t.password)) || undefined;
        await User.query(trx).upsertGraph(user);
        res.send();
      });
    }));
    res.send();
  } catch (err) {
    log.error(err, "Error Exporting Therapist Table");
    return res.status(400).send(err.message);
  }
}

exports.export = async (req, res) => {
  try {
    log.info("Exporting Student Table");
    const workbook          = new excel.Workbook();
    workbook.creator        = 'System';
    workbook.lastModifiedBy = 'System';
    const date = new Date();
    workbook.created    = date;
    workbook.modified   = date;
    workbook.lastPrinted= date;

    const sheet = workbook.addWorksheet('Student Export');
    sheet.columns = [
      {header: 'ID', key: 'id'},
      {header: 'Name', key: 'name'},
      {header: 'Log Count', key: 'log_count'},
    ];

    const students = JSON.stringify(await Student.query().select('*'));
    sheet.addRows(JSON.parse(students));
    res.setHeader('Content-Type', 'application/vnd.openxmlformats');
    res.setHeader('Content-Disposition', "attachment;");
    res.setHeader('name', "Student_Export.xlsx");
    await workbook.xlsx.write(res);
    res.end();
    //const buffer = await workbook.xlsx.writeBuffer();
    //res.send(buffer);
  } catch (err) {
    log.error("Error Exporting Student Table", err);
    log.error(err);
    return res.status(400).send(err);
  }
}

student_filter_where = (b, req, rowFilters = {}) => {
  if (req.user.user_types_id === 2) {
    b.whereIn('id', knex('assigned_students').where({therapists_id: req.user.real_id}).select('students_id'))
  }
  let keys = Object.keys(rowFilters)
  for(key of keys) {
    let values = rowFilters[key];
    if(typeof(values) === "object" && values.length !== 0) {
      b.whereIn(key, values)
    } else if (typeof(values === "string")) {
      b.where(key, 'LIKE', `%${values}%`)
    }
  }
}

