

/*
 *@file school_logs.js
 *@author Jarel Pellew
 *@desc Handler for SchoolLog asyncs on backend
 */

const { raw, transaction } = require('objection');
const { format } = require('date-fns');
const excel         = require('exceljs');
const log           = require('./../../config/logging');
const Therapist     = require('./../models/therapists');
const School        = require('./../models/schools');
const SchoolLog     = require('./../models/school_logs');
const knex          = SchoolLog.knex();
const sock          = require('./../services/socket_service');

exports.get = async (req, res) => {
  try {
    const filter = JSON.parse(req.params.filter);
    let sort = filter.sort;
    if(Object.keys(sort).length === 0) {
      sort = {headerTable: "school_logs", header: "id", direction: "DESC"};
    }
    let rowFilters = filter.rowFilters;
    await transaction(knex, async (trx) => {
      const start = new Date().getTime();
      const [school_logs, total] = await Promise.all([
        SchoolLog.query().select('school_logs.*', 'type.type', 'school.name', raw('CONCAT(therapist.first_name, " ", therapist.last_name) AS therapist_name'))
        .joinRelation('[therapist, type, school]')
        .limit(filter.limit).offset(filter.page * filter.limit).orderBy(sort.headerTable !== "" ? sort.headerTable + "." + sort.header : sort.header, sort.direction)
        .where(b => school_log_filter_where(b, req, rowFilters)),
        SchoolLog.query(trx).count('* as total').joinRelation('[therapist, type, school]')
        .where(b => school_log_filter_where(b, req, rowFilters))
        .first(),
      ]);
      log.info("Query Time:", new Date().getTime() - start, "ms");
      log.info("SchoolLogs", school_logs);
      return res.send({school_logs: school_logs, ...total});
    });
  } catch (err) {
    log.error(err, "Error Grabbing SchoolLogs");
    return res.status(500).send(err.message);
  }
}

exports.add = async (req, res) => {
  try {
    const body = req.body;
    log.info("BODY", body);
    body.therapists_id = req.user.real_id;
    body.therapist_cost = (req.user.school_bill * (body.time/60));
    body.date = new Date(body.date);
    body.therapist_types_id = req.user.therapist_types_id;
    await transaction(knex, async (trx) => {
      const school    = await School.query(trx).select('bill_per_hour').findById(body.schools_id);
      body.cost       = ( school.bill_per_hour * (body.time/60));
      const school_log = await SchoolLog.query(trx).insertGraph(body);
      log.info("Adding SchoolLog", body);
      sock.emit('new_school_log', school_log);
      return res.send();
    });
  } catch (err) {
    log.error(err, "Error Adding SchoolLog");
    return res.status(400).send(err.message);
  }
}

exports.edit = async (req, res) => {
  try {
    const start = new Date().getTime();
    const school_log  = await SchoolLog.query().select().findById(req.params.id).first().debug();
    log.info("Query Time:", new Date().getTime() - start, "ms");
      return res.send(school_log);
  } catch (err) {
    log.error(err, "Error Grabbing SchoolLogs");
    return res.status(400).send(err.message);
  }
}

exports.update = async (req, res) => {
  try {
    const body = req.body;

    await transaction(knex, async (trx) => {
      const [school_bill, school] = await Promise.all([
        Therapist.query(trx).select('bill_per_hour_schools as school_bill').where({id: body.therapists_id}).first(),
        School.query(trx).select('bill_per_hour').findById(body.schools_id),
      ]);

      body.cost = ( school.bill_per_hour * (body.time/60));
      body.date = new Date(body.date);
      body.therapist_cost = (school_bill['school_bill'] * (body.time/60));

      await SchoolLog.query(trx).upsertGraph(body);
      log.info("Updating SchoolLog", body);
      res.send();
      sock.emit('upd_school_log', body);
    });

  } catch (err) {
    log.error(err, "Error Updating SchoolLog");
    log.fatal(err);
    res.status(400).send(err.message);
  }
}

exports.delete = async (req, res) => {
  try {
    const ids = req.params.ids.split(',');
    await transaction(knex, async (trx) => {
      await Promise.all([
         SchoolLog.query(trx).delete().whereIn("id", ids),
      ]);
    });
    res.send();
    sock.emit('del_school_log', ids);
  } catch (err) {
    log.error(err, "Error Deleting SchoolLogs");
    return res.status(400).send(err.message);
  }
}

exports.export = async (req, res) => {
  try {
    log.info("Exporting SchoolLog Table");
    const workbook          = new excel.Workbook();
    workbook.creator        = 'System';
    workbook.lastModifiedBy = 'System';
    const date = new Date();
    workbook.created    = date;
    workbook.modified   = date;
    workbook.lastPrinted= date;

    const sheet = workbook.addWorksheet('SchoolLog Export');
    sheet.columns = [
      {header: 'ID', key: 'id'},
      {header: 'Therapist Name', key: 'therapist_name'},
      {header: 'School Name', key: 'school_name'},
      {header: 'Type', key: 'type'},
      {header: 'Note', key: 'note'},
    ];

    const school_logs = JSON.stringify(await SchoolLog.query().select('school_logs.*', 'type.type', 'school.name AS school_name', raw('CONCAT(therapist.first_name, " ", therapist.last_name) AS therapist_name'))
      .joinRelation('[therapist, type, school]'));
    sheet.addRows(JSON.parse(school_logs));
    res.setHeader('Content-Type', 'application/vnd.openxmlformats');
    res.setHeader('Content-Disposition', "attachment;");
    res.setHeader('name', `SchoolLog_Export_${format(date, 'MM-DD-YYYY-hh:mm:ss')}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
    //const buffer = await workbook.xlsx.writeBuffer();
    //res.send(buffer);
  } catch (err) {
    log.error(err, "Error Exporting SchoolLog Table");
    return res.status(400).send(err.message);
  }
}

school_log_filter_where = (b, req, rowFilters = {}) => {
  if (req.user.user_types_id === 2) {
    b.where('school_logs.therapists_id', req.user.real_id)
  }
  if (req.user.user_types_id === 3) {
    b.where('school_logs.schools_id', req.user.real_id)
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
