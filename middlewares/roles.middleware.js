const Boom = require("boom");
const jwt_decode = require('jwt-decode');
const User = require("../models/user");

exports.restrictToAdmin = (req, res, next) => {
  const token = req.get('Authorization');
  const user = jwt_decode(token.replace('JWT ', ''));
  if(user.role !== 'admin'){
    var boom = Boom.unauthorized();
    res.status(boom.output.statusCode).send(boom.output.payload);
    return res.end();
  } else {
    next();
  }
};

exports.restrictToHost = (req, res, next) => {
  const token = req.get('Authorization');
  const user = jwt_decode(token.replace('JWT ', ''));
if(user.role !== 'host'){
  var boom = Boom.unauthorized();
  res.status(boom.output.statusCode).send(boom.output.payload);
  return res.end();
} else {
    next();
}
};

exports.restrictToVerifiedAccount = async (req, res, next) => {
    var token = req.get('Authorization');
    var user = jwt_decode(token.replace('JWT ', ''));

    if(!(await User.findById(user._id)).isVerified) {
        var boom = Boom.unauthorized('Email is not verified!');
        res.status(boom.output.statusCode).send(boom.output.payload);
        return res.end();
    }

    next();
};
