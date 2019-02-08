
/*
 *@file system.js
 *@author Jarel Pellew
 *@desc Handler for Admin asyncs on backend
 */

const { raw, transaction } = require('objection');
const { format } = require('date-fns');
const excel = require('exceljs');
const log   = require('./../../config/logging');
const User  = require('./../models/users');
const Admin = require('./../models/admins');
const Types = require('./../models/admin_types');
const knex  = Admin.knex();
const sock  = require('./../services/socket_service');

exports.get = async (req, res) => {
  try {
    const filter = JSON.parse(req.params.filter);
    let sort = filter.sort;
    if(Object.keys(sort).length === 0) {
      sort = {headerTable: "admins", header: "id", direction: "DESC"};
    }
    let rowFilters = filter.rowFilters;
    console.log("Row Filters", rowFilters);
    await transaction(knex, async (trx) => {
      const start   = new Date().getTime();
      const [admins, users, total] = await Promise.all([
        Admin.query(trx).select('user.username', 'admins.*', raw('CONCAT(first_name, " ", last_name) as name'), 'type.type').joinRelation('[type, user]')
        .limit(filter.limit).offset(filter.page * filter.limit)
        .orderBy(sort.headerTable !== "" ? sort.headerTable + "." + sort.header : sort.header, sort.direction)
        .where(b => admin_filter_where(b, rowFilters)),
        User.query(trx).select('users.username', raw('CONCAT(admin.first_name, " ", admin.last_name) as name'), 'admin.*').joinRelation('admin').where({user_types_id: 1})
        .limit(filter.limit).offset(filter.page * filter.limit).orderBy('users.id'), //orderBy users.id

        Admin.query(trx).count('* as total').joinRelation('type').joinRelation('user')
        .where(b => admin_filter_where(b, rowFilters)).first()
      ]);
      console.log(total);
      log.info("Query Time:", new Date().getTime() - start, "ms");
      return res.send({admins: admins, ...total});
    });
  } catch (err) {
    log.error(err, "Error Grabbing Admins");
    return res.status(500).send(err.message);
  }
}

exports.getAll = async (req, res) => {
  try {
    const admins = await Admin.query().select(raw('CONCAT(first_name, " ", last_name) AS label'), 'id as value');
    log.info("Admin Length", admins.length);
    res.send({admins: admins});
  } catch (err) {
    log.error("Error Grabbing Admin Names", err);
    //log.fatal(err);
    return res.status(500).send(err.message);
  }
}


exports.getTypes = async (req, res) => {
  try {
    const start = new Date().getTime();
    const types  = await Types.query().select('id AS value', 'type AS label');
    log.info("Query Time:", new Date().getTime() - start, "ms");
    return res.send({admin_types: types});
  } catch (err) {
    log.error(err, "Error Grabbing Admin Types");
    return res.status(500).send(err.message);
  }
}

exports.add = async (req, res) => {
  try {
    const body = req.body;
    await transaction(knex, async (trx) => {
      body.password = await User.generateHash(body.password);
      const user = await User.query(trx).insertGraph(body);
      //Please Temporary
      const admin = await Admin.query(trx).select('admins.*', 'type.type').joinRelation('type').joinEager('user').where({"admins.id": user.admin.id}).first().debug();
      log.info("Added Admin", admin);
      sock.emit('new_admin', admin);
      return res.send();
    });
  } catch (err) {
    log.error(err, "Error Adding Admin");
    return res.status(400).send(err.message);
  }
}

exports.edit = async (req, res) => {
  try {
    const start = new Date().getTime();
    const user  = await User.query().select('users.id', 'username').joinEager('admin').findById(req.params.id).first().debug();
    log.info("Query Time:", new Date().getTime() - start, "ms");
      return res.send(user);
  } catch (err) {
    log.error(err, "Error Grabbing Admins");
    return res.status(400).send(err.message);
  }
}

exports.update = async (req, res) => {
  try {
    const body = req.body;
    await transaction(knex, async (trx) => {
      body.password = body.password ? User.generateHash(body.password) : undefined;
      await User.query(trx).upsertGraph(body);
      log.info("Updating Admin", body);
      res.send();
      sock.emit('upd_admin', body);
    });

  } catch (err) {
    log.error(err, "Error Updating Admin");
    log.fatal(err);
    res.status(400).send(err.message);
  }
}

exports.delete = async (req, res) => {
  try {
    const ids = req.params.ids.split(',');
    const user_ids  = await Admin.query().select('user_id').whereIn("id", ids).map((admin) => {
      return admin["user_id"];
    });
    await transaction(knex, async (trx) => {
      await Promise.all([
         Admin.query(trx).delete().whereIn("id", ids),
         User.query(trx).delete().whereIn("id", user_ids)
      ]);
    });
    sock.emit('del_admin', ids);
    res.send();
  } catch (err) {
    log.error(err, "Error Deleting Admins");
    return res.status(400).send(err.message);
  }
}

exports.grabInfo = async (req, res) => {
  try {
    const admin  = await Admin.query().select('admins.*', raw("CONCAT(admins.first_name, ' ', admins.last_name) AS name"), 'admin_types.type')
      .join('admin_types', 'admins.admin_types_id', 'admin_types.id').first();
    return res.send(admin);
  } catch (err) {
    log.error(err, "Error Grabbing Admins");
    return res.status(400).send(err.message);
  }
}

exports.getExample = async (req, res) => {
  try {
  } catch (err) {
    log.error(err, "Error Getting Example");
  }
}

exports.export = async (req, res) => {
  try {
    log.info("Exporting Admin Table");
    const workbook          = new excel.Workbook();
    workbook.creator        = 'System';
    workbook.lastModifiedBy = 'System';
    const date = new Date();
    workbook.created    = date;
    workbook.modified   = date;
    workbook.lastPrinted= date;

    const sheet = workbook.addWorksheet('Admin Export');
    sheet.columns = [
      {header: 'ID', key: 'id'},
      {header: 'Name', key: 'name'},
      {header: 'Email', key: 'email'},
      {header: 'Type', key: 'type'},
    ];

    const admins  = JSON.stringify(await Admin.query().select('admins.*', 'type.type').joinRelation('type'));
    sheet.addRows(JSON.parse(admins));
    res.setHeader('Content-Type', 'application/vnd.openxmlformats');
    res.setHeader('Content-Disposition', "attachment;");
    res.setHeader('name', `Admin_Export_${format(date, 'MM/DD/YYYY')}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
    //const buffer = await workbook.xlsx.writeBuffer();
    //res.send(buffer);
  } catch (err) {
    log.error(err, "Error Exporting Admin Table");
    return res.status(400).send(err.message);
  }
}

admin_filter_where = (b, rowFilters) => {
  let keys = Object.keys(rowFilters)
  for(key of keys) {
    let values = rowFilters[key];
    if(typeof(values) === "object" && values.length !== 0) {
      b.whereIn(key, values)
    } else if (typeof(values) === "string") {
      b.where(key, 'LIKE', `%${values}%`)
    }
  }
}

