const mongoose = require('mongoose');

mongoose.connect("mongodb://127.0.0.1:27017/projectUnfiltered");

const userSchema = mongoose.Schema({
    username: { type: String, unique: true, required: true },
    name: String,
    age: Number,
    email: String,
    password: String,
    post: [
        {
            type: mongoose.Schema.Types.ObjectId, ref:"post"
        }
    ],
})

module.exports = mongoose.model('user', userSchema);