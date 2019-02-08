
//Database Stuff
const Knex        = require('knex');
const knexConfig  = require('./../knexfile');
const { Model }   = require('objection');
const knex        = Knex(knexConfig.development);
Model.knex(knex);
module.export     = knex;

