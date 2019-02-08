
const Model = require('objection').Model;
const objection = require('./../../config/objection');

class BillingType extends Model {
  //Table name only required property
  static get tableName() {
    return 'billing_types';
  }
}

module.exports = BillingType;

