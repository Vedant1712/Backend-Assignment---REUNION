const mongoose = require('mongoose')

const postsSchema = mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    title: {
        type: String,
        required: [true, "Every post should have a title"]
    },
    desc: {
        type: String,
        required: [true, "Every post should have a description"]
    },
    comments: {
        type: Array,
        default: []
    },
    likes: {
        type: Array,
        default: []
    }
},{
    timestamps: true
});

module.exports = mongoose.model("Post", postsSchema)