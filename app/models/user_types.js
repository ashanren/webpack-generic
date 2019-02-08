
const Model     = require('objection').Model;
const objection = require('./../../config/objection');

class UserType extends Model {
  //Table name only required property
  static get tableName() {
    return 'user_types';
  }
}

module.exports = UserType;

