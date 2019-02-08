
const Model     = require('objection').Model;
const objection = require('./../../config/objection');

class State extends Model {
  //Table name only required property
  static get tableName() {
    return 'states';
  }
}

module.exports = State;

