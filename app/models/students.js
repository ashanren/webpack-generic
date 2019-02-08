
const { makeDir, removeDir } = require('./../services/fs');
const Model     = require('objection').Model;
const Error     = require('objection').ValidationError;
const objection = require('./../../config/objection');

class Student extends Model {
  //Table name only required property
  static get tableName() {
    return 'students';
  }

  async $afterInsert(query) {
    const res = await makeDir(`${__dirname}/../../student_files/${this.id}`);
    if (res) {
      throw new Error({
        message: 'Unable to create Directory for Student Files',
        type: 'StudentFileError',
        data: this,
      });
    }
    return;
  }

  async $beforeDelete(query) {
    const res = await removeDir(`${__dirname}/../../student_files/${this.id}`)
    if (res) {
      throw new Error({
        message: 'Unable to Delete Directory for Student Files',
        type: 'StudentFileError',
        data: this,
      });
    }
    return;
  }

  static get virtualAttributes () {
    return ['name'];
  }

  name() {
    return `${this.first_name} ${this.last_name}`;
  }

  static get relationMappings () {
    return {
      school: {
        relation: Model.HasOneRelation,
        modelClass: require('./schools'),
        join: {
          from: 'students.schools_id',
          to: 'schools.id',
        }
      },
      logs: {
        relation: Model.HasManyRelation,
        modelClass: require('./studentlogs'),
        join: {
          from: 'students.id',
          to: 'student_logs.students_id',
        }
      },
      therapists: {
        relation: Model.HasManyRelation,
        modelClass: require('./assigned_students'),
        join: {
          from: 'students.id',
          to: 'assigned_students.students_id',
        }
      },
    }
  }
}

module.exports = Student;

