const mongoose = require('mongoose')

const userSchema = mongoose.Schema({
    username: {
        type: String,
        required: [true, "Please add the username"]
    },
    email: {
        type: String,
        required: [true, "Please add the user email address"],
        unique: true,
    },
    password: {
        type: String,
        required: [true, "Please add the user password"],
    },
    followers: {
        type: Array,
        default: []
    },
    following: {
        type: Array,
        default: []
    }
}, {
    timestamps: true
})

module.exports = mongoose.model("User", userSchema)