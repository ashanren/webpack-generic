
const { makeDir, removeDir } = require('./../services/fs');
const Model     = require('objection').Model;
const objection = require('./../../config/objection');

class Client extends Model {
  //Table name only required property
  static get tableName() {
    return 'clients';
  }

  async $afterInsert(query) {
    const res = await makeDir(`${__dirname}/../../client_files/${this.id}`);
    if (res) {
      throw new Error({
        message: 'Unable to create Directory for Client Files',
        type: 'ClientFileError',
        data: this,
      });
    }
    return;
  }

  async $beforeDelete(query) {
    const res = await removeDir(`${__dirname}/../../client_files/${this.id}`)
    if (res) {
      throw new Error({
        message: 'Unable to Delete Directory for Client Files',
        type: 'ClientFileError',
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
      state: {
        relation: Model.HasOneRelation,
        modelClass: require('./states'),
        join: {
          from: 'clients.states_id',
          to: 'states.id',
        }
      },
      billing: {
        relation: Model.HasOneRelation,
        modelClass: require('./billing_types'),
        join: {
          from: 'clients.billing_types_id',
          to: 'billing_types.id',
        }
      },
      logs: {
        relation: Model.HasManyRelation,
        modelClass: require('./clientlogs'),
        join: {
          from: 'clients.id',
          to: 'client_logs.clients_id',
        }
      },
      therapists: {
        relation: Model.HasManyRelation,
        modelClass: require('./assigned_clients'),
        join: {
          from: 'clients.id',
          to: 'assigned_clients.clients_id',
        }
      },
    }
  }
}

module.exports = Client;

