
const Model     = require('objection').Model;
const objection = require('./../../config/objection');

class StudentLogGoal extends Model {
  //Table name only required property
  static get tableName() {
    return 'student_log_goals';
  }

  static get relationMappings () {
    return {
      goal: {
        relation: Model.HasOneRelation,
        modelClass: require('./therapist_goals'),
        join: {
          from: 'student_log_goals.therapist_goals_id',
          to: 'therapist_goals.id',
        }
      },
      note: {
        relation: Model.HasOneRelation,
        modelClass: require('./student_logs'),
        join: {
          from: 'student_log_goals.student_logs_id',
          to: 'student_logs.id',
        }
      },
    }
  }
}

module.exports = StudentLogGoal;

