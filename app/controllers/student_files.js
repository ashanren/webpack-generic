
/*
 *@file system.js
 *@author Jarel Pellew
 *@desc Handler for Admin functions on backend
 */

const { raw, transaction } = require('objection');
const log   = require('./../../config/logging');
const StudentFiles = require('./../models/studentfiles');
const knex  = StudentFiles.knex();
const sock  = require('./../services/socket_service');

exports.get = async (req, res) => {
  try {
    const filter = JSON.parse(req.params.filter);
    let sort = filter.sort;
    if(Object.keys(sort).length === 0) {
      sort = {headerTable: "student_files", header: "id", direction: "DESC"};
    }
    let rowFilters = filter.rowFilters;
    await transaction(knex, async (trx) => {
      const start   = new Date().getTime();
      const [files, total] = await Promise.all([
        StudentFiles.query().select('student_files.*', raw('CONCAT(student.first_name, " ", student.last_name) AS student_name')).joinRelation('student')
          .limit(filter.limit).offset(filter.page * filter.limit).orderBy(sort.headerTable !== "" ? sort.headerTable + "." + sort.header : sort.header, sort.direction).where(b => {
            let keys = Object.keys(rowFilters)
            for(key of keys) {
              let values = rowFilters[key].values.map((value) => {
                return value.value;
              });
              if(values.length !== 0) {
                b.whereIn(rowFilters[key].headerTable !== "" ? rowFilters[key].headerTable + "." + key : key, values)
              }
            }
          }),
        StudentFiles.query(trx).count('* as total').joinRelation('student').where(b => {
          let keys = Object.keys(rowFilters)
          for(key of keys) {
            let values = rowFilters[key].values.map((value) => {
              return value.value;
            });
            if(values.length !== 0) {
              b.whereIn(rowFilters[key].headerTable !== "" ? rowFilters[key].headerTable + "." + key : key, values)
            }
          }
        }).first(),
      ]);
      log.info("StudentFiles", files);
      log.info("Query Time:", new Date().getTime() - start, "ms");
      return res.send({student_files: files, ...total});
    });
  } catch (err) {
    log.error("Error Grabbing StudentFiless", err);
    return res.status(400).send(err);
  }
}

exports.add = async (req, res) => {
  try {
    const body = req.body;
    await transaction(knex, async (trx) => {
      const body  = JSON.parse(req.body.body);
      let file    = req.files.file;
      const files = [];
      if (!file.length) {
        log.info("Single File Upload");
        files.push(file);
        file = [file];
      }

      log.info("Length lets see if its true", file.length);
      for await (const f of createAsyncIterable(file)) {
        const path  = `${__dirname}/../../student_files/${body.students_id}/${f.name}`;
        log.info("Path:", path);
        await Promise.all([
          f.mv(path),
          StudentFiles.query(trx).insertGraph({students_id: body.students_id, filename: f.name}),
        ]);
      }
      log.info("", body);
      //log.info("Adding StudentFiles", body);
      res.send();
    });
    return sock.emit('new_student_file');
  } catch (err) {
    log.error(err, "Error Adding Student Files");
    res.status(400).send(err.message);
  }
}

exports.delete = async (req, res) => {
  try {
    const ids = req.params.ids.split(',');
    await transaction(knex, async (trx) => {
      await StudentFiles.query(trx).whereIn('id', ids).map(async (s) => {await s.$query().delete();})
    });
    res.send();
    sock.emit('del_student_file', ids);
  } catch (err) {
    log.error(err, "Error Deleting Student Files");
    return res.status(400).send(err.message);
  }
}

async function* createAsyncIterable(iterable) {
  for (const elem of iterable) {
    yield elem;
  }
}

