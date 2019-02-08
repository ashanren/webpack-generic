
/*
 *@file system.js
 *@author Jarel Pellew
 *@desc Handler for School functions on backend
 */

const { raw, transaction } = require('objection');
const excel   = require('exceljs');
const log     = require('./../../config/logging');
const User    = require('./../models/users');
const School  = require('./../models/schools');
const sock    = require('./../services/socket_service');
const knex    = School.knex();

exports.get = async (req, res) => {
  try {
    const filter = JSON.parse(req.params.filter);
    let sort = filter.sort;
    if(Object.keys(sort).length === 0) {
      sort = {headerTable: "schools", header: "id", direction: "DESC"};
    }
    let rowFilters = filter.rowFilters;
    await transaction(knex, async (trx) => {
      const start   = new Date().getTime();
      const [schools, total] = await Promise.all([
        School.query(trx).select('user.username', 'schools.*', 'state.full_name as state')
        .countDistinct('student.id AS student_count')
        .joinRelation('[state]')
        .leftJoinRelation('[student, user]')
        .limit(filter.limit).offset(filter.page * filter.limit).orderBy(sort.headerTable !== "" ? sort.headerTable + "." + sort.header : sort.header, sort.direction)
        .groupBy('schools.id')
        .where(b => school_filter_where(b, rowFilters)).debug(),

        School.query(trx).countDistinct('schools.id as total').joinRelation('[state]')
        .where(b => school_filter_where(b, rowFilters)).first(),
      ]);
      //log.info("Schools", schools);
      return res.send({schools: schools, ...total});
    });
  } catch (err) {
    log.error("Error Grabbing Schools", err);
    return res.status(400).send(err);
  }
}

exports.getAll = async (req, res) => {
  try {
    const schools = await School.query().select('schools.id as value', 'schools.name as label', 'states_id as state_id', 'state.full_name as state', 'is_k12').joinRelation('state');
    res.send({schools: schools});
  } catch (err) {
    log.error("Error Grabbing School List", err);
    log.fatal(err);
    return res.status(500).send(err.message);
  }
}

exports.add = async (req, res) => {
  try {
    const body = req.body;
    await transaction(knex, async (trx) => {
      body.password = User.generateHash(body.password);
      const therapist = await User.query(trx).insertGraph(body);
      log.info("Adding School", req.body);
      res.send();
    });
  } catch (err) {
    log.error(err, "Error Adding School");
    res.status(400).send(err.message);
  }
}

exports.edit = async (req, res) => {
  try {
    const schools  = await School.query().select('schools.*', 'users.username')
      .join('users', 'schools.user_id', 'users.id')
      .where('schools.id', '=', req.params.id)
      .first();
    log.info("Schools", schools);
    return res.send(schools);
  } catch (err) {
    log.error("Error Grabbing Schools", err);
    return res.status(400).send(err);
  }
}

exports.update = async (req, res) => {
  try {
    const body = req.body;
    await transaction(knex, async (trx) => {
      body.password = body.password ? User.generateHash(body.password) : undefined
      await User.query(trx).upsertGraph(body, {relate: true});
      log.info("Updating School", body);
      res.send();
      sock.emit('upd_school', body);
    });
  } catch (err) {
    log.error("Error Updating School", err);
    res.status(400).send(err);
  }
}

exports.delete = async (req, res) => {
  try {
    const ids = req.params.ids.split(',');
    const user_ids  = await School.query().select('user_id').whereIn("id", ids).map((school) => {
      return school["user_id"];
    });
    await transaction(knex, async (trx) => {
      await Promise.all([
         School.query(trx).delete().whereIn("id", ids),
         User.query(trx).delete().whereIn("id", user_ids)
      ]);
      res.send();
      sock.emit('del_school', ids);
    });
  } catch (err) {
    log.error(err, "Error Deleting Schools");
    return res.status(400).send(err.message);
  }
  try {
    const ids = req.params.ids.split(',');
    await transaction(knex, async (trx) => {
      await Promise.all([
        await School.query(trx).delete().whereIn("user_id", ids),
        await User.query(trx).delete().whereIn("id", ids)
      ]);
    });
    res.send();
  } catch (err) {
    log.error(err, "Error Deleting School");
    return res.status(400).send(err.message);
  }
}

exports.disable = async (req, res) => {
  try {
    const ids = req.body.ids;
    log.info("Attempting to disable", ids);
    await transaction(knex, async (trx) => {
      await User.query(trx).delete().whereIn("id", knex('schools').whereIn('id', ids).select('user_id as id'));
      await School.query(trx).whereIn('id', ids).update({user_id: null});
    });

    return res.send();
  } catch (err) {
    log.error("Unable to Disable Schools", err);
    log.error(err);
    return res.status(400).send(err.message);
  }
}

exports.grabInfo = async (req, res) => {
  try {
    const school  = await School.query().select('schools.*', raw("CONCAT(schools.first_name, ' ', schools.last_name) AS name"), 'school_types.type')
      .join('school_types', 'schools.school_types_id', 'school_types.id').first();
    return res.send(school);
  } catch (err) {
    log.error("Error Grabbing Schools", err);
  }
}

exports.export = async (req, res) => {
  try {
    log.info("Exporting School Table");
    const workbook          = new excel.Workbook();
    workbook.creator        = 'System';
    workbook.lastModifiedBy = 'System';
    const date = new Date();
    workbook.created    = date;
    workbook.modified   = date;
    workbook.lastPrinted= date;

    const sheet = workbook.addWorksheet('School Export');
    sheet.columns = [
      {header: 'ID', key: 'id'},
      {header: 'Name', key: 'name'},
      {header: 'Email', key: 'email'},
      {header: 'Type', key: 'type'},
    ];

    const schools  = await School.query().select('schools.*', 'users.username')
      .join('users', 'schools.user_id', 'users.id');
    sheet.addRows(schools);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats');
    res.setHeader('Content-Disposition', "attachment;");
    res.setHeader('name', "School_Export.xlsx");
    await workbook.xlsx.write(res);
    res.end();
    //const buffer = await workbook.xlsx.writeBuffer();
    //res.send(buffer);
  } catch (err) {
    log.error("Error Exporting School Table", err);
    log.error(err);
    return res.status(400).send(err);
  }
}

school_filter_where = (b, rowFilters) => {
  let keys = Object.keys(rowFilters)
  for(key of keys) {
    let values = rowFilters[key];
    if(typeof(values) === "object" && values.length !== 0) {
      b.whereIn(key, values)
    } else if (key === "schools.user_id") {
      values === 1 ?  b.whereNotNull(key) : b.whereNull(key);
    } else if (typeof(values === "string")) {
      b.where(key, 'LIKE', `%${values}%`)
    }
  }
}



/*select date_add(client_logs.date, INTERVAL(1-dayofweek(client_logs.date)) DAY) as week_start,date_add(client_logs.date, INTERVAL(7-dayofweek(client_logs.date)) DAY) as week_end,  weeks.id, year(client_logs.date), count(client_logs.id) from client_logs right join weeks on week(client_logs.date) = weeks.id group by yearweek(date);*/

