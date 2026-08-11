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

// Configure CORS: allow explicit origins via ALLOWED_ORIGINS env var (comma-separated).
// If ALLOWED_ORIGINS is not set, fall back to permissive default for compatibility.
const allowedOriginsEnv = process.env.ALLOWED_ORIGINS;
if (allowedOriginsEnv) {
  const allowedOrigins = allowedOriginsEnv.split(',').map((s) => s.trim());
  app.use(
    cors({
      origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1) return callback(null, true);
        return callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
      optionsSuccessStatus: 200,
    })
  );
} else {
  app.use(cors());
}

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
app.use('/api/v4/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/v4', require('./routes/uploadRoutes'))

// old routes still in use for 7 days
app.use('/api/v3/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/v3', require('./routes/uploadRoutes'))

// old routes still in use for 10 days
// app.use('/api/v2/uploads', express.static(path.join(__dirname, 'uploads')));
// app.use('/api/v2', require('./routes/uploadRoutes'))

// app.use('/api/uploads', express.static(path.join(__dirname, 'uploads')));
// app.use('/api', require('./routes/uploadRoutes'))

// end file upload



// const passport = require('./helpers/passport')()
const apiRoutes = require('./routes/routes')
const httpLogger = require("./logging/http-logger");


// Initialize JWT authentication
// app.use(passport.initialize())

// HTTP Logger middleware
app.use(httpLogger)

// API resources routes
app.use("/api/v4", apiRoutes)

app.use("/api/v3", apiRoutes)


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
    // Delete all documents (only if destructive ops are explicitly allowed)
    if (process.env.ALLOW_DB_DESTRUCTIVE_OPS === 'true') {
      await Ping.deleteMany({});
    } else {
      console.warn('Skipping Ping.deleteMany({}) because ALLOW_DB_DESTRUCTIVE_OPS is not set to true');
    }
  } catch (error) {
    console.error('Error in cron job:', error);
  }
});

module.exports = app;