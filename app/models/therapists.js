
const { makeDir, removeDir } = require('./../services/fs');
const Model     = require('objection').Model;
const objection = require('./../../config/objection');

class Therapist extends Model {
  //Table name only required property
  static get tableName() {
    return 'therapists';
  }

  async $afterInsert(query) {
    const res = await makeDir(`${__dirname}/../../therapists/${this.id}`);
    if (res) {
      throw new Error({
        message: 'Unable to create Directory for Therapist Files',
        type: 'TherapistFileError',
        data: this,
      });
    }
    return;
  }

  async $beforeDelete(query) {
    const res = await removeDir(`${__dirname}/../../therapists/${this.id}`)
    if (res) {
      throw new Error({
        message: 'Unable to Delete Directory for Therapist Files',
        type: 'TherapistFileError',
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
      type: {
        relation: Model.HasOneRelation,
        modelClass: require('./therapist_types'),
        join: {
          from: 'therapists.therapist_types_id',
          to: 'therapist_types.id',
        }
      },
      states: {
        relation: Model.HasManyRelation,
        modelClass: require('./therapist_states'),
        join: {
          from: 'therapists.id',
          to: 'therapist_states.therapists_id',
        }
      },
      goals: {
        relation: Model.HasManyRelation,
        modelClass: require('./therapist_goals'),
        join: {
          from: 'therapists.id',
          to: 'therapist_goals.therapists_id',
        }
      },
      assigned_slps: {
        relation: Model.HasManyRelation,
        modelClass: require('./assigned_slps'),
        join: {
          from: 'therapists.id',
          to: 'assigned_slps.therapists_id',
        }
      },
      user: {
        relation: Model.HasOneRelation,
        modelClass: require('./users'),
        join: {
          from: 'therapists.user_id',
          to: 'users.id',
        }
      },
    }
  }
}

module.exports = Therapist;

