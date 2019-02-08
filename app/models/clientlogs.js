
const Model     = require('objection').Model;
//const objection = require('./../../config/objection');

class Client_log extends Model {
  //Table name only required property
  static get tableName() {
    return 'client_logs';
  }

  static get relationMappings () {
    return {
      type: {
        relation: Model.HasOneRelation,
        modelClass: require('./therapist_types'),
        join: {
          from: 'client_logs.therapist_types_id',
          to: 'therapist_types.id',
        }
      },
      client: {
        relation: Model.HasOneRelation,
        modelClass: require('./clients'),
        join: {
          from: 'client_logs.clients_id',
          to: 'clients.id',
        }
      },
      therapist: {
        relation: Model.HasOneRelation,
        modelClass: require('./therapists'),
        join: {
          from: 'client_logs.therapists_id',
          to: 'therapists.id',
        }
      },
    }
  }
}

module.exports = Client_log;

