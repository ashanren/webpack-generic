
const Model     = require('objection').Model;
const objection = require('./../../config/objection');

class AssignedClient extends Model {
  //Table name only required property
  static get tableName() {
    return 'assigned_clients';
  }

  static get relationMappings () {
    return {
      therapist: {
        relation: Model.HasOneRelation,
        modelClass: require('./therapists'),
        join: {
          from: 'assigned_clients.therapists_id',
          to: 'therapists.id',
        }
      },
      client: {
        relation: Model.HasOneRelation,
        modelClass: require('./clients'),
        join: {
          from: 'assigned_clients.clients_id',
          to: 'clients.id',
        }
      },
    }
  }
}

module.exports = AssignedClient;

