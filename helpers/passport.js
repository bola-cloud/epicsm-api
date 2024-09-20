// const User = require('../models/user')
// const passport = require('passport')
// const logger = require('../logging/logger')
// const Boom = require("boom");
// const JwtStrategy = require('passport-jwt').Strategy
// const ExtractJwt = require('passport-jwt').ExtractJwt
// const opts = {
//     jwtFromRequest: ExtractJwt.fromAuthHeaderWithScheme("jwt"),
//     algorithms: ["HS256"],
//     secretOrKey: process.env.JWT_SECRET
// }

// let auth = null;

// module.exports = () => {
//     if (!auth) {
//         const strategy = new JwtStrategy(opts, async (payload, callback) => {
//             var user = await User.findById(payload._id)
//             if (!user) {
//                 callback(Boom.unauthorized("JWT: User not found"))
//             }
//             callback(null, user)
//         })

//         passport.use(strategy)

//         return auth = {
//             initialize: () => {
//                 return passport.initialize();
//             },
//             authenticate: () => {
//                 logger.debug("Begin authentication in passport.js");
//                 return passport.authenticate("jwt", { session: false });
//             }
//         }
//     }

//     return auth
// }