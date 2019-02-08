
/*
 *@file client_logs.js
 *@author Jarel Pellew
 *@desc Handler for ClientLog asyncs on backend
 */

const { raw, transaction } = require('objection');
const { format } = require('date-fns');
const excel = require('exceljs');
const log   = require('./../../config/logging');
const Client    = require('./../models/clients');
const Therapist = require('./../models/therapists');
const ClientLog = require('./../models/clientlogs');
const knex  = ClientLog.knex();
const sock  = require('./../services/socket_service');

exports.get = async (req, res) => {
  try {
    //log.info("REAL ID", req.user.therapist.real_id);
    const filter = JSON.parse(req.params.filter);
    let sort = filter.sort;
    if(Object.keys(sort).length === 0) {
      sort = {headerTable: "client_logs", header: "id", direction: "DESC"};
    }
    let rowFilters = filter.rowFilters;
    await transaction(knex, async (trx) => {
      const start = new Date().getTime();
      const [client_logs, total] = await Promise.all([
        ClientLog.query(trx).select('client_logs.*', raw('TIME(client_logs.date) as time'), raw('CONCAT(therapist.first_name, " ", therapist.last_name) AS therapist_name'), knex.raw('CONCAT(client.first_name, " ", client.last_name) AS client_name'))
        .joinRelation('[therapist, client]')
        .where((b) => {
          if (req.user.user_types_id === 2) {
            b.whereIn('client_logs.clients_id', knex('assigned_clients').where({therapists_id: req.user.real_id}).select('clients_id'))
          }
        })
        .limit(filter.limit).offset(filter.page * filter.limit).orderBy(sort.headerTable !== "" ? sort.headerTable + "." + sort.header : sort.header, sort.direction),

        ClientLog.query(trx).count('* as total').sum('time as total_time')
        .where((b) => {
          if (req.user.user_types_id === 2) {
            b.whereIn('client_logs.clients_id', knex('assigned_clients').where({therapists_id: req.user.real_id}).select('clients_id'))
          }
        })
        .first(),
      ]);
      log.info("Query Time:", new Date().getTime() - start, "ms");
      //log.info("ClientLogs", client_logs);
      log.info("Totals", total);
      return res.send({client_logs: client_logs, ...total});
    });
  } catch (err) {
    log.error(err, "Error Grabbing Client Logs");
    return res.status(500).send(err.message);
  }
}

exports.add = async (req, res) => {
  try {
    const body = req.body;
    await transaction(knex, async (trx) => {
      body.therapists_id = req.user.real_id;
      body.therapist_types_id = req.user.therapist_types_id;
      body.date = new Date(body.date.substring(0, body.date.length - 1));
      const client_billing = await Client.query(trx).select(
        raw(`IF(${req.user.therapist_types_id = 3}, ot_bill_per_hour, bill_per_hour) as bill`), 
        raw(`IF(${req.user.therapist_types_id = 3}, ot_bill_per_hour_missed, bill_per_hour_missed) as missed_bill`)).findById(body.clients_id).debug();

      if (body.billable) {
        log.info("billable");
        if (body.missed) {
          body.cost = (client_billing.missed_bill * ((body.time + body.doc_time) / 60));
          body.therapist_cost = (req.user.client_bill/2 * ((body.time + body.doc_time)/60));
        } else {
          body.cost = (client_billing.bill * ((body.time + body.doc_time) / 60));
          body.therapist_cost = (req.user.client_bill * ((body.time + body.doc_time)/60));
        }
      }
      log.info("OK THIS SHOULD BE FINE", client_billing);
      const client_log = await ClientLog.query(trx).insertGraph(body);
      log.info("Adding ClientLog", body);
    });
    sock.emit('new_client_log', req.user);
    return res.send();
  } catch (err) {
    log.error(err, "Error Adding ClientLog");
    return res.status(400).send(err.message);
  }
}

exports.update = async (req, res) => {
  try {
    const body = req.body;
    await transaction(knex, async (trx) => {
    const therapist_bill = await Therapist.query().select('bill_per_hour_clients as client_bill').where({id: body.therapists_id}).first();
      body.date = new Date(body.date);
      const client_billing = await Client.query(trx).select(
        raw(`IF(${body.therapist_types_id = 3}, ot_bill_per_hour, bill_per_hour) as bill`), 
        raw(`IF(${body.therapist_types_id = 3}, ot_bill_per_hour_missed, bill_per_hour_missed) as missed_bill`)).findById(body.clients_id).debug();

      if (body.billable) {
        log.info("billable");
        if (body.missed) {
          body.cost = (client_billing.missed_bill * ((body.time + body.doc_time) / 60));
          body.therapist_cost = (therapist_bill.client_bill/2 * ((body.time + body.doc_time)/60));
        } else {
          body.cost = (client_billing.bill * ((body.time + body.doc_time) / 60));
          body.therapist_cost = (therapist_bill.client_bill/2 * ((body.time + body.doc_time)/60));
        }
      }
      await ClientLog.query(trx).upsertGraph(body);
      log.info("Updating ClientLog", body);
      res.send();
      sock.emit('upd_client_log', body);
    });

  } catch (err) {
    log.error(err, "Error Updating ClientLog");
    log.fatal(err);
    res.status(400).send(err.message);
  }
}

exports.delete = async (req, res) => {
  try {
    const ids = req.params.ids.split(',');
    await transaction(knex, async (trx) => {
      await Promise.all([
         ClientLog.query(trx).delete().whereIn("id", ids),
      ]);
    });
    res.send();
    sock.emit('del_client_log', ids);
  } catch (err) {
    log.error(err, "Error Deleting ClientLogs");
    return res.status(400).send(err.message);
  }
}

exports.export = async (req, res) => {
  try {
    log.info("Exporting ClientLog Table");
    const workbook          = new excel.Workbook();
    workbook.creator        = 'System';
    workbook.lastModifiedBy = 'System';
    const date = new Date();
    workbook.created    = date;
    workbook.modified   = date;
    workbook.lastPrinted= date;

    const sheet = workbook.addWorksheet('ClientLog Export');
    sheet.columns = [
      {header: 'ID', key: 'id'},
      {header: 'Name', key: 'name'},
      {header: 'Email', key: 'email'},
      {header: 'Type', key: 'type'},
    ];

    const client_logs  = JSON.stringify(await ClientLog.query().select('client_logs.*', 'type.type').joinRelation('type'));
    sheet.addRows(JSON.parse(client_logs));
    res.setHeader('Content-Type', 'application/vnd.openxmlformats');
    res.setHeader('Content-Disposition', "attachment;");
    res.setHeader('name', `ClientLog_Export_${format(date, 'MM/DD/YYYY')}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
    //const buffer = await workbook.xlsx.writeBuffer();
    //res.send(buffer);
  } catch (err) {
    log.error(err, "Error Exporting ClientLog Table");
    return res.status(400).send(err.message);
  }
}

