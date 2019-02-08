
const Model     = require('objection').Model;
const objection = require('./../../config/objection');

class Admin extends Model {
  //Table name only required property
  static get tableName() {
    return 'admins';
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
        modelClass: require('./admin_types'),
        join: {
          from: 'admins.admin_types_id',
          to: 'admin_types.id',
        }
      },
      user: {
        relation: Model.HasOneRelation,
        modelClass: require('./users'),
        join: {
          from: 'admins.user_id',
          to: 'users.id',
        }
      },
    }
  }
}

module.exports = Admin;

