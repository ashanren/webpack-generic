
const { removeFile } = require('./../services/fs');
const Model     = require('objection').Model;
const objection = require('./../../config/objection');

class StudentFile extends Model {
  //Table name only required property
  static get tableName() {
    return 'student_files';
  }

  async $beforeDelete(query) {
    const res = await removeFile(`${__dirname}/../../student_files/${this.students_id}/${this.filename}`)
    if (!res) {
      throw new Error({
        message: `Unable to Delete File ${this.filename}`,
        type: 'StudentFileError',
        data: this,
      });
    }
    return;
  }

  static get relationMappings () {
    return {
      student: {
        relation: Model.HasOneRelation,
        modelClass: require('./students'),
        join: {
          from: 'student_files.students_id',
          to: 'students.id',
        }
      },
    }
  }
}

module.exports = StudentFile;

