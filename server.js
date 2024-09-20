// Loads environment variables from a .env file into process.env
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
// const schemaValidator = require('./handlers/schemaValidator');

// -------------------------------------------------------
// Start server
// -------------------------------------------------------
// schemaValidator.load()
db.instance()

logger.info("Starting API server...");

const port = process.env.PORT || 3001
app.listen(port, () => logger.info(`🔥 Server started ==> PORT ${port} 🔥`))