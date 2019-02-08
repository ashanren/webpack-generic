
const Model = require('objection').Model;
const Error = require('objection').ValidationError;

class TherapistGoal extends Model {
  //Table name only required property
  static get tableName () {
    return 'therapist_goals';
  }

  async $beforeInsert(query) {
    //console.log("Before inserting", this);
    //console.log("Before inserting", query.transaction);
    const trx = query.transaction;
    //console.log("Before inserting", query);
    const count = await this.constructor.query(trx).count('* AS count').where({goal: this.goal, therapists_id: this.therapists_id}).first();
    //console.log("i wonder what the count will be", count);
    if (count.count) {//Duplicate
      console.log("Duplicate of ", this.goal);
      throw new Error({
        message: 'Can\'t have multiple goals',
        type: 'TherapistGoalError',
        data: this,
      });
    }
    return;
  }
}

module.exports = TherapistGoal;

