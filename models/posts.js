const mongoose = require('mongoose');

const postSchema = mongoose.Schema({
  imageUrl: String,          // 📸 stores Cloudinary URL
  caption: String,           // optional
  mood: String,              // e.g., happy, sad, etc.
  user : {                // reference to user
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user'
  },
  date: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('post', postSchema);
