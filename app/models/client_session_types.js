
const Model = require('objection').Model;

class ClientSessionType extends Model {
  //Table name only required property
  static get tableName() {
    return 'client_session_types';
  }
}

module.exports = ClientSessionType;

