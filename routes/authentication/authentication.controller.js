const Boom = require("boom");
const jwt = require("jsonwebtoken");
const jwt_decode = require('jwt-decode');
const User = require("../../models/admin");
const EmailVerificationtoken = require("../../models/emailVerificationToken");
const Validator = require("jsonschema").Validator;
const validator = new Validator();
const loginSchema = require("../../schemas/authentification").loginSchema;


exports.emailToLowerCase = (req, res, next) => {
  req.body.email = req.body.email.toLowerCase();
  next();
};

exports.validateLoginBody = (req, res, next) => {
  const body = req.body;

  validator.addSchema(loginSchema, loginSchema.id);
  var result = validator.validate(body, loginSchema);

  if (result.errors.length) {
    console.log(result.errors[0].message);

    var err = Boom.badRequest(result.errors[0].message);
    res.status(err.output.statusCode).json(err.output.payload);
    return res.end();
  }
  next();
};

exports.getUserFromEmail = async (req, res, next) => {
  var user = await User.findUserByEmail(req.body.email);

  if (!user) {
    var err = Boom.notFound(
      `There is no account with this email : '${req.body.email}'`
    );
    res.status(err.output.statusCode).json(err.output.payload);
    return res.end();
  } else {
    res.locals.user = user;
    next();
  }

};

exports.checkPassword = async (req, res, next) => {
  const user = res.locals.user;

  // Check if the sent password matches the recorded password
  const checkPassword = await User.isPassword(req.body.password, user.password);
  if (!checkPassword) {
    // If authentication failed send a 401 unauthorized response
    var err = Boom.unauthorized("Invalid password");
    res.status(err.output.statusCode).json(err.output.payload);
    return res.end();
  }

  next();
};

exports.createToken = (req, res, next) => {
  const user = res.locals.user;
  const { Remember } = req.body;

  // If authentication is OK send user JWT
  const token = jwt.sign(user.toJSON(), process.env.JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: Remember ? "15d" : "1d",
  });

  res.locals.jwt = token;

  //const emailVerificationtoken = EmailVerificationtoken;
  // emailVerificationtoken._userId = user._id;
  // emailVerificationtoken.token = res.locals.jwt;

  //EmailVerificationtoken.createNewEmailVerificationtoken(emailVerificationtoken)

  return next();
};

exports.sendTokens = (req, res) => {
  const jwt = res.locals.jwt;

  const payload = {
    jwt: jwt,
  };

  payload.user = res.locals.user;

  // Send the JWT to the client
  res.status(201).json(payload);
  return res.end();
};

exports.sendUser = (req, res) => {
  const jwt = res.locals.jwt;
  const user = res.locals.user;

  const payload = {
    jwt: jwt,
    user: user
  };

  // Send the JWT to the client
  res.status(200).json(payload);
  return res.end();
};

exports.verifyAccount = async (req, res, next) => {
  var token = await EmailVerificationtoken.findOne({ token: req.params.token });
  var user = await User.findOne({ _id: token._userId });
  if (!user) {
    Boom.badRequest("User for this token not found!");
    res.end();
  }
  if (user.isVerified) {
    Boom.badRequest("User already verified! Please login to your account!");
    res.end();
  }

  user.isVerified = true;
  await user.save();

  res.redirect(301, "http://legitedunucleaire.go-viral.fr/");
  res.end();
};

exports.logout = async (req, res) => {
  const user = res.locals.user;
  let token = req.headers.authorization;
  console.log(token)

  token = token.replace('JWT ', '');



  if (!token) {
    return res.status(401).json({ message: 'No token provided.' });

  }
  try {
    // Verify the token and extract the payload
    jwt.verify(token, process.env.JWT_SECRET);

    res.json({ message: 'Logout successful.' });
  } catch (error) {
    // If token verification fails, the token might be invalid
    return res.status(401).json({ message: 'Invalid token.' });
  }
}

exports.getUserByToken = async (req, res) => {
  try {
    const token = req.headers.authorization;

    if (!token) {
      console.log("No token provided");
      return null;
    }

    const cleanToken = token.replace('JWT ', '');
    const decoded = jwt.verify(cleanToken, process.env.JWT_SECRET);

    return decoded;
  } catch (error) {
    console.error("Error verifying token:", error);
    return null;
  }
};


exports.getMyProfile = async (req, res) => {
  try {
    const token = req.get("Authorization");
    const currentUser = jwt_decode(token.replace('JWT ', ''));
    user = await User.findById(currentUser._id);

    // delete some fields for security
    user = user.toObject();
    delete user.password;
    delete user.reset_code;
    delete user.reset_code_date;

    res.status(200).json(user);
    return;
  } catch (err) {
    Boom.badImplementation(err);
    return;
  }
}