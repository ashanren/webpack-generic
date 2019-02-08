
const Model     = require('objection').Model;
const objection = require('./../../config/objection');

class StudentLog extends Model {
  //Table name only required property
  static get tableName() {
    return 'student_logs';
  }

  static get relationMappings () {
    return {
      type: {
        relation: Model.HasOneRelation,
        modelClass: require('./therapist_types'),
        join: {
          from: 'therapists.therapist_types_id',
          to: 'therapist_types.id',
        }
      },
      goals: {
        relation: Model.HasManyRelation,
        modelClass: require('./student_log_goals'),
        join: {
          from: 'student_logs.id',
          to: 'student_log_goals.student_logs_id',
        }
      },
      student: {
        relation: Model.HasOneRelation,
        modelClass: require('./students'),
        join: {
          from: 'student_logs.students_id',
          to: 'students.id',
        }
      },
      therapist: {
        relation: Model.HasOneRelation,
        modelClass: require('./therapists'),
        join: {
          from: 'student_logs.therapists.therapists_id',
          to: 'therapists.id',
        }
      },
    }
  }
}

module.exports = StudentLog;

