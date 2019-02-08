
/*
 *@file therapists.js
 *@author Jarel Pellew
 *@desc Handler for Therapist functions on backend
 */

const { raw, transaction } = require('objection');
const csv       = require('csvtojson');

const excel     = require('exceljs');
const log       = require('./../../config/logging');
const User      = require('./../models/users');
const Types     = require('./../models/therapist_types');
const State     = require('./../models/states');
const Therapist = require('./../models/therapists');
const knex      = Therapist.knex();
const sock      = require('./../services/socket_service');

exports.get = async (req, res) => {
  try {
    const filter = JSON.parse(req.params.filter);
    let sort = filter.sort;
    if(Object.keys(sort).length === 0) {
      sort = {headerTable: "therapists", header: "id", direction: "DESC"};
    }
    let rowFilters = filter.rowFilters;
    await transaction(knex, async (trx) => {
      const start   = new Date().getTime();
      log.info("filter", filter);
      let [therapists, total] = await Promise.all([
        Therapist.query(trx).select('user.username', 'therapists.*', 'type.type', raw('GROUP_CONCAT(states.states_id) AS states_ids'), raw('GROUP_CONCAT(assigned_slps.slp_id) AS assigned_slps'))
        .joinRelation('[type, states]')
        .leftJoinRelation('[assigned_slps, user]')
        .limit(filter.limit).offset(filter.page * filter.limit).groupBy('therapists.id').orderBy(sort.headerTable !== "" ? sort.headerTable + "." + sort.header : sort.header, sort.direction)
        .where(b => therapist_filter_where(b, rowFilters)),
        Therapist.query(trx).countDistinct('therapists.id as total').joinRelation('[type, states]')
        .where(b => therapist_filter_where(b, rowFilters)).first(),
      ]);

      for (let i = 0; i < therapists.length; ++i) {
        therapists[i].states_ids = therapists[i].states_ids.split(",");
      }
      //log.info("Therapist Count", therapists.length);
      log.info("Query Time:", new Date().getTime() - start, "ms");
      //log.info("", therapists);
      log.info("Final Therapist Count", therapists.length);
      return res.send({therapists: therapists, ...total});
    });
  } catch (err) {
    log.error(err, "Error Grabbing Therapists");
    log.fatal(err);
    return res.status(400).send(err.message);
  }
}

exports.getAll = async (req, res) => {
  try {
    const therapists = await Therapist.query().select(raw('CONCAT(therapists.first_name, " ", therapists.last_name) as label'), 'therapists.id as value', 'therapists.therapist_types_id', 'type.type', raw('GROUP_CONCAT(states.states_id) AS states_ids'))
      .joinRelation('[type, states]')
      .groupBy('therapists.id');
    res.send({therapists: therapists});
  } catch (err) {
    log.error("Error Grabbing Therapists", err);
    log.fatal(err);
    return res.status(500).send(err.message);
  }
}

exports.getTypes = async (req, res) => {
  try {
    const types  = await Types.query().select('id AS value', 'type AS label');
    return res.send({therapist_types: types});
  } catch (err) {
    log.error(err, "Error Grabbing Therapist Types");
    log.fatal(err);
    return res.status(400).send(err.message);
  }
}

exports.add = async (req, res) => {
  try {
    const body  = JSON.parse(req.body.body);
    const file  = req.files && req.files.file;

    await transaction(knex, async (trx) => {
      body.password = User.generateHash(body.password);
      const therapist = await User.query(trx).insertGraph(body);
      log.info("Adding Therapist", therapist);
      if (file) {
        const path  = `${__dirname}/../../therapists/${therapist.therapist.id}/signature.png`;
        await file.mv(path);
      }
      res.send();
    });
  } catch (err) {
    log.error(err, "Error Adding Therapist");
    res.status(400).send(err.message);
  }
}

exports.edit = async (req, res) => {
  try {
    //const user  = await User.query().select('users.id', 'username').joinEager('therapist').findById(req.params.id).first().debug();
    const user  = await User.query().select('users.id', 'users.username').joinEager('therapist.states(state)', {
      state: (builder) => {
        builder.select('states_id as value', 'full_name AS label').joinRelation('state')
      },
    }).findById(req.params.id).first().debug();
    log.info("Therapist User:", user);
    return res.send(user);
  } catch (err) {
    log.error(err, "Error Grabbing Therapist Edit");
    log.fatal(err);
    return res.status(400).send(err.message);
  }
}

exports.update = async (req, res) => {
  try {
    const body  = JSON.parse(req.body.body);
    const file  = req.files && req.files.file;
    log.warn("BODY", body);
    await transaction(knex, async (trx) => {
      body.password = body.password ? User.generateHash(body.password) : undefined;
      const therapist = await User.query(trx).upsertGraph(body, {relate: true});
      if (file) {
        const path  = `${__dirname}/../../therapists/${therapist.therapist.id}/signature.png`;
        await file.mv(path);
      }
      log.info("Updating Therapist", therapist);
    });
    return res.send();
  } catch (err) {
    log.error(err, "Error Updating Therapist");
    log.fatal(err);
    res.status(400).send(err.message);
  }
}

exports.delete = async (req, res) => {
  try {
    const ids = req.params.ids.split(',');
    const user_ids  = await Therapist.query().select('user_id').whereIn("id", ids).map((therapist) => {
      return therapist["user_id"];
    });
    await transaction(knex, async (trx) => {
      await Promise.all([
        Therapist.query(trx).whereIn('id', ids).map(async (s) => {await s.$query().delete();}),
         User.query(trx).delete().whereIn("id", user_ids)
      ]);
      res.send();
      sock.emit('del_therapist', ids);
    });
  } catch (err) {
    log.error(err, "Error Deleting Therapists");
    return res.status(400).send(err.message);
  }
}

exports.disable = async (req, res) => {
  try {
    const ids = req.body.ids;
    log.info("Attempting to disable", ids);
    await transaction(knex, async (trx) => {
      await User.query(trx).delete().whereIn("id", knex('therapists').whereIn('id', ids).select('user_id as id'));
      await Therapist.query(trx).whereIn('id', ids).update({user_id: null});
    });

    return res.send();
  } catch (err) {
    log.error("Unable to Disable Therapists", err);
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
          username: t.username || undefined,
          user_types_id: 2,
          therapist: {
            id: t.therapist_id || undefined,
            first_name: t.first_name || undefined,
            last_name: t.last_name || undefined,
            email: t.email || undefined,
            therapist_types_id: (type && type.value) || undefined,
            states: states || undefined
          } 
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
    log.info("Exporting Therapist Table");
    const workbook          = new excel.Workbook();
    workbook.creator        = 'System';
    workbook.lastModifiedBy = 'System';
    const date = new Date();
    workbook.created    = date;
    workbook.modified   = date;
    workbook.lastPrinted= date;

    const sheet = workbook.addWorksheet('Therapist Export');
    sheet.columns = [
      {header: 'User ID', key: 'user_id'},
      {header: 'Therapist ID', key: 'id'},
      {header: 'Name', key: 'name'},
      {header: 'Email', key: 'email'},
      {header: 'Type', key: 'type'},
    ];

    const therapists  = JSON.stringify(await Therapist.query().select('therapists.*', 'type.type', 'user.id as user_id').joinRelation('[type, user]'));
    sheet.addRows(JSON.parse(therapists));
    res.setHeader('Content-Type', 'application/vnd.openxmlformats');
    res.setHeader('Content-Disposition', "attachment;");
    res.setHeader('name', "Therapist_Export.xlsx");
    await workbook.xlsx.write(res);
    res.end();
    //const buffer = await workbook.xlsx.writeBuffer();
    //res.send(buffer);
  } catch (err) {
    log.error(err, "Error Exporting Therapist Table");
    return res.status(400).send(err.message);
  }
}

therapist_filter_where = (b, rowFilters) => {
  let keys = Object.keys(rowFilters)
  log.info("KEYS", keys);
  for(key of keys) {
    let values = rowFilters[key];
    if(typeof(values) === "object" && values.length !== 0) {
      b.whereIn(key, values)
    } else if (key === "therapists.user_id") {
      values === 1 ?  b.whereNotNull(key) : b.whereNull(key)
    } else if (typeof(values) === "string") {
      b.where(key, 'LIKE', `%${values}%`)
    }
  }
}
