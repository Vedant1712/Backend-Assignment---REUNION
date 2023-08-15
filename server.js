const express = require('express')
const dotenv = require('dotenv').config()
const bodyParser = require('body-parser')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const cors = require('cors')

const validateToken = require('./middleware/validateTokenHandler')
const userSchema = require('./models/userModel')
const postsSchema = require('./models/postsModel')
const commentSchema = require('./models/commentsModel')
const connectDB = require('./connection')

connectDB()
const app = express()

app.use(cors({credentials: true}))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

// login functionality
app.post('/api/authenticate', async (req, res) => {
    res.header("Access-Control-Allow-Headers", "x-access-token")
    const { username, email, password } = req.body
    const userExists = await userSchema.findOne({ email: email })

    if (!userExists) {
        const hashedPassword = await bcrypt.hash(password, 10)
        const user = await userSchema.create({
            username,
            email,
            password: hashedPassword
        })

        console.log(user);
        res.status(200).json({message: "User created successfully"})
    } else {
        if (await bcrypt.compare(password, userExists.password)) {
            const token = await jwt.sign(
                { user_id: userExists._id, email },
                process.env.SECRET_KEY
            )

            res.cookie('token', token, {
                secure: true,
                expires: new Date(Date.now() + 360000),
                httpOnly: false
            })
            res.status(200).json({ token })
        } else {
            res.status(404).json({ message: "Invalid Credentials" })
        }
    }
})

// get the details of the user
app.get('/api/user', validateToken, async (req, res) => {
    const user_id = req.user.user_id;
    const currentUser = await userSchema.findOne({_id: user_id})
    if(currentUser) {
        console.log(currentUser);
        res.status(200).json({message: `Username: ${currentUser.username}, Followers: ${currentUser.followers.length}, Following: ${currentUser.following.length}`})
    } else {
        res.status(500).json({message: "Server Error"})
    }
})

// follow a user
app.post('/api/follow/:id', validateToken, async (req, res) => {
    if(req.user.user_id !== req.params.id) {
        try {
            const currentUser = await userSchema.findOne({_id: req.user.user_id});
            const newUser = await userSchema.findOne({_id: req.params.id});
            if(!newUser.followers.includes(req.user.user_id)) {
                await newUser.updateOne({$push: {followers: req.user.user_id}});
                await currentUser.updateOne({$push: {following: req.params.id}});
                res.status(200).json({message: `You started following ${newUser.username}`});
                console.log(currentUser);
                console.log(newUser);
            } else {
                res.status(403).json({message: `You already follow ${newUser.username}`});
            }
        } catch(err) {
            res.status(500).json(err.message);
        }
    } else {
        res.status(403).json({message: "You can't follow yourself"});
    }
})

// unfollow a user
app.post('/api/unfollow/:id', validateToken, async (req, res) => {
    if(req.user.user_id !== req.params.id) {
        try {
            const currentUser = await userSchema.findOne({_id: req.user.user_id});
            const newUser = await userSchema.findOne({_id: req.params.id});
            if(newUser.followers.includes(req.user.user_id)) {
                await newUser.updateOne({$pull: {followers: req.user.user_id}});
                await currentUser.updateOne({$pull: {following: req.params.id}});
                res.status(200).json({message: `You unfollowd ${newUser.username}`});
            } else {
                res.status(403).json({message: `You don't follow ${newUser.username}`})
            }
        } catch(err) {
            res.status(500).json(err.message)
        }
    } else {
        res.status(403).json({message: "You can't unfollow yourself"})
    }
})

//create a post
app.post('/api/posts', validateToken, async (req, res) => {
    const {title, desc} = req.body;
    const post = await postsSchema.create({
        title,
        desc,
        user_id: req.user.user_id
    });

    console.log(post);
    res.status(200).json({message: "Post created successfully"})
})

//get all posts by a single user
app.get('/api/all_posts', validateToken, async (req, res) => {
    const posts = await postsSchema.findOne({user_id: req.user.user_id})
    res.status(200).json({message: `Id: ${posts._id}, Title: ${posts.title}, Description: ${posts.desc}, Created At: ${posts.createdAt}, Comments: ${posts.comments}, Likes: ${posts.likes.length}`})
})

//delete a post
app.delete('/api/posts/:id', validateToken, async (req, res) => {
    const posts = await postsSchema.findOne({_id: req.params.id})
    if(posts.user_id.toString() !== req.user.user_id) {
        res.status(403).json({message: "You don't have the permission to delete other user's posts"})
    } else {
        await postsSchema.deleteOne({_id: req.params.id})
        res.status(200).json({message: "Post deleted successfully"})
    }
})

// like a post
app.post('/api/like/:id', validateToken, async (req, res) => {
    const posts = await postsSchema.findOne({_id: req.params.id});
    if(!posts.likes.includes(req.user.user_id)) {
        await posts.updateOne({$push: {likes: req.user.user_id}})
        res.status(200).json({message: `You liked the post ${posts._id}`})
    } else {
        res.status(403).json({message: "Cannot like again"})
    }
})

// dislike a post
app.post('/api/dislike/:id', validateToken, async (req, res) => {
    const posts = await postsSchema.findOne({_id: req.params.id});
    if(posts.likes.includes(req.user.user_id)) {
        await posts.updateOne({$pull: {likes: req.user.user_id}})
        res.status(200).json({message: `You disliked the post ${posts._id}`})
    } else {
        res.status(403).json({message: "Cannot dislike again"})
    }
})

// get the likes and comments of a post
app.get('/api/posts/:id', validateToken, async (req, res) => {
    const posts = await postsSchema.findOne({_id: req.params.id})
    if(posts) {
        res.status(200).json({message: `Likes: ${posts.likes.length} and Comments: ${posts.comments.length}`})
    } else {
        res.status(404).json({message: "Post does not exist"})
    }
})

// comment on a post
app.post('/api/comment/:id', validateToken, async (req, res) => {
    const text = req.body.text;
    const comment = await commentSchema.create({
        text,
        post_id: req.params.id,
        user_id: req.user.user_id
    });

    const posts = await postsSchema.findOne({_id: req.params.id})
    if(posts) {
        await posts.updateOne({$push: {comments: [req.user.user_id, text]}});
        res.status(200).json(comment._id)
    } else {
        res.status(404).json({message: "Post does not exist"})
    }
})

app.listen(process.env.PORT, () => {
    console.log(`Server running on PORT ${process.env.PORT}`);
})