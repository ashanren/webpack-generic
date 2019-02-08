
const Model     = require('objection').Model;
//const objection = require('./../../config/objection');

class School_log extends Model {
  //Table name only required property
  static get tableName() {
    return 'school_logs';
  }

  static get relationMappings () {
    return {
      type: {
        relation: Model.HasOneRelation,
        modelClass: require('./therapist_types'),
        join: {
          from: 'school_logs.therapist_types_id',
          to: 'therapist_types.id',
        }
      },
      therapist: {
        relation: Model.HasOneRelation,
        modelClass: require('./therapists'),
        join: {
          from: 'school_logs.therapists_id',
          to: 'therapists.id',
        }
      },
      school: {
        relation: Model.HasOneRelation,
        modelClass: require('./schools'),
        join: {
          from: 'school_logs.schools_id',
          to: 'schools.id',
        }
      },
    }
  }
}

module.exports = School_log;

