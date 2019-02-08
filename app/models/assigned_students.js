
const Model     = require('objection').Model;
const objection = require('./../../config/objection');

class AssignedStudent extends Model {
  //Table name only required property
  static get tableName() {
    return 'assigned_students';
  }

  static get relationMappings () {
    return {
      therapist: {
        relation: Model.HasOneRelation,
        modelClass: require('./therapists'),
        join: {
          from: 'assigned_students.therapists_id',
          to: 'therapists.id',
        }
      },
      student: {
        relation: Model.HasOneRelation,
        modelClass: require('./students'),
        join: {
          from: 'assigned_students.students_id',
          to: 'students.id',
        }
      },
    }
  }
}

module.exports = AssignedStudent;

