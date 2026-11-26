const config = {
    db: process.env.MONGODB_URI || 'mongodb://localhost:27017/stadium',
    secret: process.env.JWT_SECRET,
    expiresPassword: 86400, // expires in 24hours
    saltRounds: 10
 }
 
 module.exports = config;