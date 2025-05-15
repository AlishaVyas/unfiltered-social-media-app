const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  imageData: {
    type: Buffer,
    required: true
  },
  imageType: {
    type: String,
    required: true
  },
  caption: {
    type: String,
    default: ''
  },
  
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  likes: [
    {type: mongoose.Schema.Types.ObjectId, ref: 'User'}
  ]

});

module.exports = mongoose.model('Post', postSchema);
