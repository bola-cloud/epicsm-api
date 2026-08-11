const Boom = require("boom");
const jwt = require('jsonwebtoken');
const User = require("../models/user");
const Admin = require("../models/admin");

exports.restrictToAdmin = async (req, res, next) => {
  try {
    const authHeader = req.get('Authorization');
    if (!authHeader) throw new Error('No token provided');
    
    const token = authHeader.replace('JWT ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if(decoded.role !== 'admin'){
      throw new Error('Requires admin role');
    }

    // Check tokenVersion for server-side logout
    const adminUser = await Admin.findById(decoded._id);
    if (adminUser && (adminUser.tokenVersion || 0) !== (decoded.tokenVersion || 0)) {
      throw new Error('Token revoked');
    }

    req.user = decoded;
    next();
  } catch (err) {
    const boom = Boom.unauthorized(err.message || 'Invalid token');
    res.status(boom.output.statusCode).send(boom.output.payload);
    return res.end();
  }
};

exports.restrictToHost = (req, res, next) => {
  try {
    const authHeader = req.get('Authorization');
    if (!authHeader) throw new Error('No token provided');
    
    const token = authHeader.replace('JWT ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if(decoded.role !== 'host'){
      throw new Error('Requires host role');
    }
    
    req.user = decoded;
    next();
  } catch (err) {
    const boom = Boom.unauthorized(err.message || 'Invalid token');
    res.status(boom.output.statusCode).send(boom.output.payload);
    return res.end();
  }
};

exports.restrictToVerifiedAccount = async (req, res, next) => {
  try {
    const authHeader = req.get('Authorization');
    if (!authHeader) throw new Error('No token provided');
    
    const token = authHeader.replace('JWT ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await User.findById(decoded._id);
    if(!user) throw new Error('User not found');
    
    if(!user.isVerified) {
        const boom = Boom.unauthorized('Email is not verified!');
        res.status(boom.output.statusCode).send(boom.output.payload);
        return res.end();
    }

    req.user = decoded;
    next();
  } catch (err) {
    const boom = Boom.unauthorized(err.isBoom ? err.message : 'Invalid token');
    res.status(boom.output.statusCode).send(boom.output.payload);
    return res.end();
  }
};
