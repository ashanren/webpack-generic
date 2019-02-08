
const { removeFile } = require('./../services/fs');
const Model     = require('objection').Model;
const objection = require('./../../config/objection');

class ClientFile extends Model {
  //Table name only required property
  static get tableName() {
    return 'client_files';
  }

  async $beforeDelete(query) {
    const res = await removeFile(`${__dirname}/../../client_files/${this.clients_id}/${this.filename}`)
    if (!res) {
      throw new Error({
        message: `Unable to Delete File ${this.filename}`,
        type: 'ClientFileError',
        data: this,
      });
    }
    return;
  }

  static get relationMappings () {
    return {
      client: {
        relation: Model.HasOneRelation,
        modelClass: require('./clients'),
        join: {
          from: 'client_files.clients_id',
          to: 'clients.id',
        }
      },
    }
  }
}

module.exports = ClientFile;

