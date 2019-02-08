
//Dependencies
const config    = require('./../knexfile');
const { Model } = require('objection');
const knex      = require('knex')(config.development);
/*(async () => {
  //const user = await knex('user_types').first();
  //const admin= await knex('admins').first();
  //console.log(user);
})();*/
//Export
module.exports  = Model.knex(knex);

