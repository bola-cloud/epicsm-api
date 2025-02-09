const express = require("express")
const bodyParser = require("body-parser")
const Boom = require("boom")
const cors = require('cors')

const cron = require('node-cron')
const Ping = require('./models/ping')

const multer = require('multer');
const path = require('path');
const fs = require('fs');


// Create Express app
const app = express();

app.use(cors())

app.use(
  bodyParser.urlencoded({
    extended: true,
    limit: "50mb"
  })
);


app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));
app.use(bodyParser.json());


// file upload

// Middleware to serve static files (APK files)
app.use('/api/v2/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/v2', require('./routes/uploadRoutes'))

// end file upload



// const passport = require('./helpers/passport')()
const apiRoutes = require('./routes/routes')
const httpLogger = require("./logging/http-logger");


// Initialize JWT authentication
// app.use(passport.initialize())

// HTTP Logger middleware
app.use(httpLogger)

// API resources routes
app.use("/api/v2", apiRoutes)


// API route not found handler
app.use(function (req, res, next) {
  if (!req.route)
    return next(
      Boom.notFound("Route " + req.method + " " + req.path + " not found.")
    );
  next();
});


// configure corn job
cron.schedule('*/15 * * * *', async () => {
  try {
    // Delete all documents
    const result = await Ping.deleteMany({});
  } catch (error) {
    console.error('Error in cron job:', error);
  }
});

module.exports = app;