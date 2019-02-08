
/*
 *@file screening_logs.js
 *@author Jarel Pellew
 *@desc Handler for ScreeningLog asyncs on backend
 */

const { raw, transaction } = require('objection');
const { format } = require('date-fns');
const excel = require('exceljs');
const log   = require('./../../config/logging');
const Therapist     = require('./../models/therapists');
const ScreeningLog  = require('./../models/screeninglogs');
const knex  = ScreeningLog.knex();
const sock  = require('./../services/socket_service');

exports.get = async (req, res) => {
  try {
    const filter = JSON.parse(req.params.filter);
    let sort = filter.sort;
    if(Object.keys(sort).length === 0) {
      sort = {headerTable: "screening_logs", header: "id", direction: "DESC"};
    }
    let rowFilters = filter.rowFilters;
    await transaction(knex, async (trx) => {
      log.info("I wonder if the socket id is in there", req.user.socket_id);
      const start = new Date().getTime();
      const [screening_logs, total] = await Promise.all([
        ScreeningLog.query().select('screening_logs.*', 'type.type', raw('CONCAT(therapist.first_name, " ", therapist.last_name) AS therapist_name'))
        .joinRelation('[therapist, type]')
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
        ScreeningLog.query(trx).count('* as total').joinRelation('[therapist, type]').where(b => {
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
      log.info("ScreeningLogs", screening_logs);
      return res.send({screening_logs: screening_logs, ...total});
    });
  } catch (err) {
    log.error(err, "Error Grabbing ScreeningLogs");
    return res.status(500).send(err.message);
  }
}

exports.add = async (req, res) => {
  try {
    const body = req.body;
    body.therapists_id = req.user.real_id;
    body.therapist_cost = (req.user.client_bill * (body.time/60));
    body.date = new Date(body.date);
    body.therapist_types_id = req.user.therapist_types_id;
    await transaction(knex, async (trx) => {
      const screening_log = await ScreeningLog.query(trx).insertGraph(body);
      log.info("Adding ScreeningLog", body);
      sock.emit('new_screening_log', screening_log);
      return res.send();
    });
  } catch (err) {
    log.error(err, "Error Adding ScreeningLog");
    return res.status(400).send(err.message);
  }
}

exports.edit = async (req, res) => {
  try {
    const start = new Date().getTime();
    const screening_log  = await ScreeningLog.query().select().findById(req.params.id).first().debug();
    log.info("Query Time:", new Date().getTime() - start, "ms");
      return res.send(screening_log);
  } catch (err) {
    log.error(err, "Error Grabbing ScreeningLogs");
    return res.status(400).send(err.message);
  }
}

exports.update = async (req, res) => {
  try {
    const body = req.body;
    const client_bill = await Therapist.query().select('bill_per_hour_clients as client_bill').where({id: body.therapists_id}).first();
    body.therapist_cost = (client_bill['client_bill'] * (body.time/60));
    body.date = new Date(body.date);
    await transaction(knex, async (trx) => {
      await ScreeningLog.query(trx).upsertGraph(body);
      log.info("Updating ScreeningLog", body);
      res.send();
      sock.emit('upd_screening_log', body);
    });

  } catch (err) {
    log.error(err, "Error Updating ScreeningLog");
    log.fatal(err);
    res.status(400).send(err.message);
  }
}

exports.delete = async (req, res) => {
  try {
    const ids = req.params.ids.split(',');
    const screening_log_ids  = await ScreeningLog.query().select('screening_log_id').whereIn("id", ids).map((screening_log) => {
      return screening_log["screening_log_id"];
    });
    await transaction(knex, async (trx) => {
      await Promise.all([
         ScreeningLog.query(trx).delete().whereIn("id", ids),
         ScreeningLog.query(trx).delete().whereIn("id", screening_log_ids)
      ]);
    });
    res.send();
    sock.emit('del_screening_log', ids);
  } catch (err) {
    log.error(err, "Error Deleting ScreeningLogs");
    return res.status(400).send(err.message);
  }
}

exports.export = async (req, res) => {
  try {
    log.info("Exporting ScreeningLog Table");
    const workbook          = new excel.Workbook();
    workbook.creator        = 'System';
    workbook.lastModifiedBy = 'System';
    const date = new Date();
    workbook.created    = date;
    workbook.modified   = date;
    workbook.lastPrinted= date;

    const sheet = workbook.addWorksheet('ScreeningLog Export');
    sheet.columns = [
      {header: 'ID', key: 'id'},
      {header: 'Name', key: 'name'},
      {header: 'Email', key: 'email'},
      {header: 'Type', key: 'type'},
    ];

    const screening_logs  = JSON.stringify(await ScreeningLog.query().select('screening_logs.*', 'type.type').joinRelation('type'));
    sheet.addRows(JSON.parse(screening_logs));
    res.setHeader('Content-Type', 'application/vnd.openxmlformats');
    res.setHeader('Content-Disposition', "attachment;");
    res.setHeader('name', `ScreeningLog_Export_${format(date, 'MM/DD/YYYY')}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
    //const buffer = await workbook.xlsx.writeBuffer();
    //res.send(buffer);
  } catch (err) {
    log.error(err, "Error Exporting ScreeningLog Table");
    return res.status(400).send(err.message);
  }
}

