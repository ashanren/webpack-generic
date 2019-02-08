
const Model = require('objection').Model;

class TherapistState extends Model {
  //Table name only required property
  static get tableName () {
    return 'therapist_states';
  }

  static get relationMappings () {
    return {
      state: {
        relation: Model.HasOneRelation,
        modelClass: require('./states'),
        join: {
          from: 'therapist_states.states_id',
          to: 'states.id',
        }
      }
    }
  }
}

module.exports = TherapistState;

