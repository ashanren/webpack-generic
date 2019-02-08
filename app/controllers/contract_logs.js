
/*
 *@file contract_logs.js
 *@author Jarel Pellew
 *@desc Handler for ContractLog asyncs on backend
 */

const { raw, transaction } = require('objection');
const { format } = require('date-fns');
const excel = require('exceljs');
const log   = require('./../../config/logging');
const Therapist   = require('./../models/therapists');
const ContractLog = require('./../models/contractlogs');
const knex  = ContractLog.knex();
const sock  = require('./../services/socket_service');

exports.get = async (req, res) => {
  try {
    const filter = JSON.parse(req.params.filter);
    let sort = filter.sort;
    if(Object.keys(sort).length === 0) {
      sort = {headerTable: "contract_logs", header: "id", direction: "DESC"};
    }
    let rowFilters = filter.rowFilters;
    await transaction(knex, async (trx) => {
      const start = new Date().getTime();
      const [contract_logs, total] = await Promise.all([
        ContractLog.query(trx).select('contract_logs.*', 'type.type', raw('CONCAT(therapist.first_name, " ", therapist.last_name) AS therapist_name'))
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
        ContractLog.query(trx).count('* as total').joinRelation('[therapist, type]').where(b => {
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
      log.info("ContractLogs", contract_logs);
      return res.send({contract_logs: contract_logs, ...total});
    });
  } catch (err) {
    log.error(err, "Error Grabbing ContractLogs");
    return res.status(500).send(err.message);
  }
}

exports.add = async (req, res) => {
  try {
    const body = req.body;
    body.therapists_id = req.user.real_id;
    body.therapist_cost = (req.user.school_bill * (body.time/60));
    body.date = new Date(body.date);
    body.therapist_types_id = req.user.therapist_types_id;
    await transaction(knex, async (trx) => {
      const [name, contract_log] = await Promise.all([
        Therapist.query(trx).select(raw('CONCAT(first_name, " ", last_name) AS therapist_name')).findById(body.therapists_id),
        ContractLog.query(trx).insertGraphAndFetch(body)
      ]);
      log.info("Adding Contract Log", contract_log);
      contract_log.therapist_name = name.therapist_name;
      sock.emit('new_contract_log', contract_log);
      return res.send();
    });
  } catch (err) {
    log.error(err, "Error Adding Contract Log");
    return res.status(400).send(err.message);
  }
}

exports.update = async (req, res) => {
  try {

    const body = req.body;
    log.info("Bill Being updated", body);
    const school_bill = await Therapist.query().select('bill_per_hour_schools as school_bill').where({id: body.therapists_id}).first();
    body.therapist_cost = (school_bill['school_bill'] * (body.time/60));
    body.date = new Date(body.date);
    await transaction(knex, async (trx) => {
      await ContractLog.query(trx).upsertGraph(body);
      log.info("Updating ContractLog", body);
      res.send();
      sock.emit('upd_contract_log', body);
    });

  } catch (err) {
    log.error(err, "Error Updating ContractLog");
    log.fatal(err);
    res.status(400).send(err.message);
  }
}

exports.delete = async (req, res) => {
  try {
    const ids = req.params.ids.split(',');
    await transaction(knex, async (trx) => {
      await Promise.all([
         ContractLog.query(trx).delete().whereIn("id", ids),
      ]);
    });
    res.send();
    sock.emit('del_contract_log', ids);
  } catch (err) {
    log.error(err, "Error Deleting ContractLogs");
    return res.status(400).send(err.message);
  }
}

exports.export = async (req, res) => {
  try {
    log.info("Exporting ContractLog Table");
    const workbook          = new excel.Workbook();
    workbook.creator        = 'System';
    workbook.lastModifiedBy = 'System';
    const date = new Date();
    workbook.created    = date;
    workbook.modified   = date;
    workbook.lastPrinted= date;

    const sheet = workbook.addWorksheet('ContractLog Export');
    sheet.columns = [
      {header: 'ID', key: 'id'},
      {header: 'Name', key: 'name'},
      {header: 'Email', key: 'email'},
      {header: 'Type', key: 'type'},
    ];

    const contract_logs  = JSON.stringify(await ContractLog.query().select('contract_logs.*', 'type.type').joinRelation('type'));
    sheet.addRows(JSON.parse(contract_logs));
    res.setHeader('Content-Type', 'application/vnd.openxmlformats');
    res.setHeader('Content-Disposition', "attachment;");
    res.setHeader('name', `ContractLog_Export_${format(date, 'MM/DD/YYYY')}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
    //const buffer = await workbook.xlsx.writeBuffer();
    //res.send(buffer);
  } catch (err) {
    log.error(err, "Error Exporting ContractLog Table");
    return res.status(400).send(err.message);
  }
}

