// Loads environment variables from a .env file into process.env
const https = require('https');
const fs = require('fs');
const dotenv = require('dotenv');
const result = dotenv.config();

// Check if env variable are loaded via .env files (in local)
// Or if there are set in Beanstalk
if (!process.env.NODE_ENV && result.error) {
    console.error("Error loading environment variables");
    throw result.error;
}

const app = require('./app')
const db = require('./helpers/db')
const logger = require("./logging/logger");

// -------------------------------------------------------
// Start server
// -------------------------------------------------------

// Load SSL certificates
const options = {
  key: fs.readFileSync('/etc/letsencrypt/live/api.epicsm.goviral.ma/privkey.pem'),
  cert: fs.readFileSync('/etc/letsencrypt/live/api.epicsm.goviral.ma/fullchain.pem')
};

// Create HTTPS server
const server = https.createServer(options, app);

db.instance()

logger.info("Starting API server...");

const port = process.env.PORT || 443
app.listen(port, () => logger.info(`🔥 Server started ==> PORT ${port} 🔥`))
