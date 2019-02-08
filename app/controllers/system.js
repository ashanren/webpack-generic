
/*
 *@file system.js
 *@author Jarel Pellew
 *@desc Handler for System functions on backend
 */

const { raw, transaction } = require('objection');
const axios         = require('axios');
const log           = require('./../../config/logging');
const User          = require('./../models/users');
const State         = require('./../models/states');
const Video         = require('./../models/video_qualities');
const Billing       = require('./../models/billing_types');
const ClientSession = require('./../models/client_session_types');

exports.getStatus = async (req, res) => { }

exports.sendMessage = async () => {
  const res = await axios.get('http://localhost:6000/mail/cron');
  log.error("MESSAGE FROM MAIL SERVER", res.data);
}

exports.getStates = async (req, res) => {
  try {
    const states = await State.query().select('id AS value', raw('CONCAT(full_name, ", ", abbrev) AS label'));
    res.send({states: states});
  } catch (err) {
    log.error(err);
    return res.status(400).send(err);
  }
}

exports.getClientSessionTypes = async (req, res) => {
  try {
    const client_session_types = await ClientSession.query().select('id AS value', 'label');
    res.send({client_session_types: client_session_types});
  } catch (err) {
    log.error(err);
    return res.status(400).send(err);
  }
}

exports.getVideoQuality = async (req, res) => {
  try {
    const video_qualities = await Video.query().select('id AS value', 'label');
    res.send({video_qualities: video_qualities});
  } catch (err) {
    log.error(err);
    return res.status(400).send(err);
  }
}

exports.getBillingTypes = async (req, res) => {
  try {
    const types = await Billing.query().select('id AS value', 'billing AS label');
    //log.info("", types);
    res.send({billing_types: types});
  } catch (err) {
    log.error(err);
    return res.status(400).send(err);
  }
}

exports.resetPassword = async (req, res) => {
  try {
    //log.info("Reseting password", req.body);
    log.info("User I'm Reseting it for", req.user);
    const password  = await User.generateHash(req.body.password);
    const date      = new Date();
    //log.info("New Password", password);

    await User.query().update({last_logged_in: date, password: password}).where('id', req.user.id);
    req.session.passport.user.last_logged_in = date;
    req.session.passport.user.password = password;
    res.send(req.user);
    //res.send();
  } catch (err) {
    log.error(err);
    return res.status(400).send(err);
  }
}

