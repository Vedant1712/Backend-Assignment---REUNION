const jwt = require('jsonwebtoken')
const dotenv = require('dotenv').config()

const validate = (req, res, next) => {
    const token = req.body.token || req.query.token || req.headers["x-access-token"]
    if(!token)
        res.status(401).json({message: "User"})

    try {
        const decoded = jwt.verify(token, process.env.SECRET_KEY)
        req.user = decoded
    } catch(err) {
        res.status(401).json({message: "User is not authorized"})
    }
    next()
}

module.exports = validate