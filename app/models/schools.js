
const Model     = require('objection').Model;
const objection = require('./../../config/objection');

class School extends Model {
  //Table name only required property
  static get tableName() {
    return 'schools';
  }

  static get relationMappings () {
    const state = require('./states');
    return {
      state: {
        relation: Model.HasOneRelation,
        modelClass: state,
        join: {
          from: 'schools.states_id',
          to: 'states.id',
        }
      },
      user: {
        relation: Model.HasOneRelation,
        modelClass: require('./users'),
        join: {
          from: 'schools.user_id',
          to: 'users.id',
        }
      },
      student: {
        relation: Model.HasManyRelation,
        modelClass: require('./students'),
        join: {
          from: 'schools.id',
          to: 'students.schools_id',
        }
      },
    }
  }
}

module.exports = School;

