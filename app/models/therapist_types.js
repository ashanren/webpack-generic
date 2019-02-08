
const Model = require('objection').Model;

class TherapistType extends Model {
  //Table name only required property
  static get tableName() {
    return 'therapist_types';
  }
}

module.exports = TherapistType;

