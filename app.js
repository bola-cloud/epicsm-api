const express = require("express")
const bodyParser = require("body-parser")
const Boom = require("boom")
const cors = require('cors')


// Create Express app
const app = express();

app.use(cors())

app.use(
  bodyParser.urlencoded({
    extended: true,
    limit: "50mb"
  })
);


app.use(express.json());
app.use(bodyParser.json());



// const passport = require('./helpers/passport')()
const apiRoutes = require('./routes/routes')
const httpLogger = require("./logging/http-logger");


// Initialize JWT authentication
// app.use(passport.initialize())

// HTTP Logger middleware
app.use(httpLogger)

// API resources routes
app.use("/api", apiRoutes)


// API route not found handler
app.use(function (req, res, next) {
  if (!req.route)
    return next(
      Boom.notFound("Route " + req.method + " " + req.path + " not found.")
    );
  next();
});

module.exports = app;