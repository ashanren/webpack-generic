
const Model = require('objection').Model;
const objection = require('./../../config/objection');

class AdminType extends Model {
  //Table name only required property
  static get tableName() {
    return 'admin_types';
  }

  static get relationMappings () {
    const Admin  = require('./admins');
    return {
      admin: {
        relation: Model.BelongsToOneRelation,
        modelClass: Admin,
        join: {
          from: 'admin_types.id',
          to: 'admins.admin_types_id',
        }
      }
    }
  }
}

module.exports = AdminType;

