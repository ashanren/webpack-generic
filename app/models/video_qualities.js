
const Model = require('objection').Model;

class VideoQuality extends Model {
  //Table name only required property
  static get tableName() {
    return 'video_qualities';
  }
}

module.exports = VideoQuality;

