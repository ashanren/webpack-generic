
const jwt       = require('jsonwebtoken');
const Model     = require('objection').Model;
const bcrypt    = require('bcrypt');
const log       = require("./../../config/logging");
const secret    = require("./../../config/general").secret;
const UserType  = require('./user_types');
const objection = require('./../../config/objection');

class User extends Model {
  //Table name only required property
  static get tableName() {
    return 'users';
  }

  isValidPassword (password) {
    return bcrypt.compareSync(password, this.password);
  }

  static generateHash (password) {
    try {
      return bcrypt.hashSync(password, bcrypt.genSaltSync(10));
    } catch (err) {
      return 0;
    }
  }

  async generateJWT () {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 7);
    const type  = (await UserType.query().select('type').where({id: this.user_types_id}).first()).type;
    return jwt.sign({
      _id   : this.id,
      exp   : (expiry.getTime()/1000),
      type  : type
    }, secret);
  }

  static async verifyJWT (token) {
    try {
      const decode = await jwt.verify(token, secret);
      log.trace("DECODE", decode);
      return decode;
    } catch (err) {
      log.error("Error verifying JWT:", err);
      log.error(err);
      return null;
    }
  }

  static get relationMappings () {
    return {
      type: {
        relation: Model.HasOneRelation,
        modelClass: UserType,
        join: {
          from: 'users.user_types_id',
          to: 'user_types.id',
        }
      },
      admin: {
        relation: Model.HasOneRelation,
        modelClass: require('./admins'),
        join: {
          from: 'users.id',
          to: 'admins.user_id',
        }
      },
      therapist: {
        relation: Model.HasOneRelation,
        modelClass: require('./therapists'),
        join: {
          from: 'users.id',
          to: 'therapists.user_id',
        }
      },
      school: {
        relation: Model.HasOneRelation,
        modelClass: require('./schools'),
        join: {
          from: 'users.id',
          to: 'schools.user_id',
        }
      },
    }
  }
}

module.exports = User;

