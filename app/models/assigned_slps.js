
const Model     = require('objection').Model;
const objection = require('./../../config/objection');

class AssignedSLP extends Model {
  //Table name only required property
  static get tableName() {
    return 'assigned_slps';
  }

  static get relationMappings () {
    return {
      therapist: {
        relation: Model.HasOneRelation,
        modelClass: require('./therapists'),
        join: {
          from: 'assigned_slps.therapists_id',
          to: 'therapists.id',
        }
      },
      slp: {
        relation: Model.HasOneRelation,
        modelClass: require('./therapists'),
        join: {
          from: 'assigned_slps.slp_id',
          to: 'therapists.id',
        }
      },
    }
  }
}

module.exports = AssignedSLP;

