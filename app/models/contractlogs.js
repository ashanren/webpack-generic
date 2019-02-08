
const Model     = require('objection').Model;
//const objection = require('./../../config/objection');

class Contract_log extends Model {
  //Table name only required property
  static get tableName() {
    return 'contract_logs';
  }

  static get relationMappings () {
    return {
      type: {
        relation: Model.HasOneRelation,
        modelClass: require('./therapist_types'),
        join: {
          from: 'contract_logs.therapist_types_id',
          to: 'therapist_types.id',
        }
      },
      therapist: {
        relation: Model.HasOneRelation,
        modelClass: require('./therapists'),
        join: {
          from: 'contract_logs.therapists_id',
          to: 'therapists.id',
        }
      },
    }
  }
}

module.exports = Contract_log;

