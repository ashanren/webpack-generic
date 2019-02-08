
/*
 *@file clients.js
 *@author Jarel Pellew
 *@desc Handler for Client functions on backend
 */

const { raw, transaction } = require('objection');
const excel   = require('exceljs');
const log     = require('./../../config/logging');
const Client  = require('./../models/clients');
const knex    = Client.knex();
const sock    = require('./../services/socket_service');

exports.get = async (req, res) => {
  try {
    const filter = JSON.parse(req.params.filter);
    let sort = filter.sort;
    if(Object.keys(sort).length === 0) {
      sort = {headerTable: "clients", header: "id", direction: "DESC"};
    }
    let rowFilters = filter.rowFilters;
    log.info("Row Filter", rowFilters);
    await transaction(knex, async (trx) => {
      const start = new Date().getTime();
      const [clients, total] = await Promise.all([
        Client.query(trx).select('clients.*', 'state.full_name', 'billing.billing', raw('GROUP_CONCAT(therapists.therapists_id) AS therapists_ids'))
        .countDistinct('logs.id as log_count')
        .joinRelation('[state, billing, therapists]')
        .leftJoinRelation('logs')
        .limit(filter.limit).offset(filter.page * filter.limit).groupBy('clients.id').orderBy(sort.headerTable !== "" ? sort.headerTable + "." + sort.header : sort.header, sort.direction)
        .where(b => client_filter_where(b, req, rowFilters)),
        Client.query(trx).countDistinct('clients.id as total').joinRelation('[state, billing, therapists]')
        .where(b => client_filter_where(b, req, rowFilters)).first().debug(),
      ]);
      log.info("Query Time:", new Date().getTime() - start, "ms");
      //log.info("Clients Total", total);
      return res.send({clients: clients, ...total});
    });
  } catch (err) {
    log.error(err, "Error Grabbing Clients");
    return res.status(400).send(err.message);
  }
}

exports.getAll = async (req, res) => {
  try {
    const clients = await Client.query().select(raw('CONCAT(first_name, " ", last_name) AS label'), 'id as value')
      .where(b => client_filter_where(b, req))
    log.info("Client Length", clients.length);
    res.send({clients: clients});
  } catch (err) {
    log.error("Error Grabbing Client Names", err);
    //log.fatal(err);
    return res.status(500).send(err.message);
  }
}

exports.add = async (req, res) => {
  try {
    const body = req.body;
    await transaction(knex, async (trx) => {
      const client  = await Client.query(trx).insertGraph(body);
      log.info("Adding Client", body);
      res.send();
    });
  } catch (err) {
    log.error(err, "Error Adding Client");
    res.status(400).send(err.message);
  }
}

exports.edit = async (req, res) => {
  try {
    const client  = await Client.query().select('*').findById(req.params.id).first();
    log.info("Client", client);
    return res.send(client);
  } catch (err) {
    log.error(err, "Error Grabbing Clients");
    return res.status(400).send(err.message);
  }
}

exports.update = async (req, res) => {
  try {
    const body = req.body;
    await transaction(knex, async (trx) => {
      await Client.query(trx).upsertGraph(body);
      log.info("Updating Client", body);
      res.send();
      sock.emit('upd_client', body);
    });
  } catch (err) {
    log.error(err, "Error Updating Client");
    res.status(400).send(err.message);
  }
}

exports.delete = async (req, res) => {
  try {
    const ids = req.params.ids.split(',');
    await transaction(knex, async (trx) => {
      await Client.query(trx).delete().whereIn("id", ids)
    });
    res.send();
  } catch (err) {
    log.error(err, "Error Deleting Client");
    return res.status(400).send(err.message);
  }
}

exports.disable = async (req, res) => {
  try {
    const ids = req.body.ids;
    log.info("Attempting to disable", ids);
    await Client.query().whereIn('id', ids).update({active: 0});
    return res.send();
  } catch (err) {
    log.error("Unable to Disable Clients", err);
    log.error(err);
    return res.status(400).send(err.message);
  }
}

exports.enable = async (req, res) => {
  try {
    const ids = req.body.ids;
    log.info("Attempting to enable", ids);
    await Client.query().whereIn('id', ids).update({active: 1});
    return res.send();
  } catch (err) {
    log.error("Unable to Disable Clients", err);
    log.error(err);
    return res.status(400).send(err.message);
  }
}

exports.export = async (req, res) => {
  try {
    log.info("Exporting Client Table");
    const workbook          = new excel.Workbook();
    workbook.creator        = 'System';
    workbook.lastModifiedBy = 'System';
    const date = new Date();
    workbook.created    = date;
    workbook.modified   = date;
    workbook.lastPrinted= date;

    const sheet = workbook.addWorksheet('Client Export');
    sheet.columns = [
      {header: 'ID', key: 'id'},
      {header: 'Name', key: 'name'},
      {header: 'Email', key: 'email'},
      {header: '# of Logs', key: 'log_count'},
    ];

    const clients = JSON.stringify(await Client.query().select('*').joinRelation('state'));
    console.log(clients);
    sheet.addRows(JSON.parse(clients));
    res.setHeader('Content-Type', 'application/vnd.openxmlformats');
    res.setHeader('Content-Disposition', "attachment;");
    res.setHeader('name', "Client_Export.xlsx");
    await workbook.xlsx.write(res);
    res.end();
    //const buffer = await workbook.xlsx.writeBuffer();
    //res.send(buffer);
  } catch (err) {
    log.error("Error Exporting Client Table", err);
    log.error(err);
    return res.status(400).send(err);
  }
}

client_filter_where = (b, req, rowFilters = {}) => {
  if (req.user.user_types_id === 2) {
    b.whereIn('id', knex('assigned_clients').where({therapists_id: req.user.real_id}).select('clients_id'))
  }
  let keys = Object.keys(rowFilters)
  for(key of keys) {
    let values = rowFilters[key];
    if(typeof(values) === "object" && values.length !== 0) {
      b.whereIn(key, values)
    } else if (key.indexOf("active") !== -1) {
      b.where(key,values)
    }else if (typeof(values === "string")) {
      b.where(key, 'LIKE', `%${values}%`)
    }
  }
}
