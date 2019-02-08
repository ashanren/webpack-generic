
/*
 *@file student_logs.js
 *@author Jarel Pellew
 *@desc Handler for StudentLog asyncs on backend
 */

const { raw, transaction } = require('objection');
const { format } = require('date-fns');
const excel = require('exceljs');
const log   = require('./../../config/logging');
const StudentLog = require('./../models/studentlogs');
const knex  = StudentLog.knex();
const sock  = require('./../services/socket_service');

exports.get = async (req, res) => {
  try {
    const filter = JSON.parse(req.params.filter);
    let sort = filter.sort;
    if(Object.keys(sort).length === 0) {
      sort = {headerTable: "student_logs", header: "id", direction: "DESC"};
    }
    let rowFilters = filter.rowFilters;
    await transaction(knex, async (trx) => {
      const start   = new Date().getTime();
      log.info("I wonder if the socket id is in there", req.user);
      
      const [student_logs, total] = await Promise.all([
        StudentLog.query().select('student_logs.*', 'type.type').joinRelation('type')
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
        StudentLog.query(trx).count('* as total').joinRelation('type').where(b => {
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
      
      log.info("Query Time:", new Date().getTime() - start, "ms");
        log.info("StudentLogs", student_logs);
      return res.send({student_logs: student_logs, ...total});
    });
  } catch (err) {
    log.error(err, "Error Grabbing StudentLogs");
    return res.status(500).send(err.message);
  }
}

exports.add = async (req, res) => {
  try {
    const body = req.body;
    await transaction(knex, async (trx) => {
      const student_log = await StudentLog.query(trx).insertGraph(body);
      log.info("Adding StudentLog", body);
      sock.emit('new_student_log', student_log);
      return res.send();
    });
  } catch (err) {
    log.error(err, "Error Adding StudentLog");
    return res.status(400).send(err.message);
  }
}

exports.edit = async (req, res) => {
  try {
    const start = new Date().getTime();
    const student_log  = await StudentLog.query().select().findById(req.params.id).first().debug();
    log.info("Query Time:", new Date().getTime() - start, "ms");
      return res.send(student_log);
  } catch (err) {
    log.error(err, "Error Grabbing StudentLogs");
    return res.status(400).send(err.message);
  }
}

exports.update = async (req, res) => {
  try {
    const body = req.body;
    await transaction(knex, async (trx) => {
      body.password = body.password ? StudentLog.generateHash(body.password) : undefined;
      await StudentLog.query(trx).upsertGraph(body);
      log.info("Updating StudentLog", body);
      res.send();
      sock.emit('upd_student_log', body);
    });

  } catch (err) {
    log.error(err, "Error Updating StudentLog");
    log.fatal(err);
    res.status(400).send(err.message);
  }
}

exports.delete = async (req, res) => {
  try {
    const ids = req.params.ids.split(',');
    const student_log_ids  = await StudentLog.query().select('student_log_id').whereIn("id", ids).map((student_log) => {
      return student_log["student_log_id"];
    });
    await transaction(knex, async (trx) => {
      await Promise.all([
         StudentLog.query(trx).delete().whereIn("id", ids),
         StudentLog.query(trx).delete().whereIn("id", student_log_ids)
      ]);
    });
    res.send();
    sock.emit('del_student_log', ids);
  } catch (err) {
    log.error(err, "Error Deleting StudentLogs");
    return res.status(400).send(err.message);
  }
}

exports.export = async (req, res) => {
  try {
    log.info("Exporting StudentLog Table");
    const workbook          = new excel.Workbook();
    workbook.creator        = 'System';
    workbook.lastModifiedBy = 'System';
    const date = new Date();
    workbook.created    = date;
    workbook.modified   = date;
    workbook.lastPrinted= date;

    const sheet = workbook.addWorksheet('StudentLog Export');
    sheet.columns = [
      {header: 'ID', key: 'id'},
      {header: 'Name', key: 'name'},
      {header: 'Email', key: 'email'},
      {header: 'Type', key: 'type'},
    ];

    const student_logs  = JSON.stringify(await StudentLog.query().select('student_logs.*', 'type.type').joinRelation('type'));
    sheet.addRows(JSON.parse(student_logs));
    res.setHeader('Content-Type', 'application/vnd.openxmlformats');
    res.setHeader('Content-Disposition', "attachment;");
    res.setHeader('name', `StudentLog_Export_${format(date, 'MM/DD/YYYY')}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
    //const buffer = await workbook.xlsx.writeBuffer();
    //res.send(buffer);
  } catch (err) {
    log.error(err, "Error Exporting StudentLog Table");
    return res.status(400).send(err.message);
  }
}

