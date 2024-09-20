const morgan = require("morgan");
const logger = require("./logger");

module.exports = morgan(process.env.LOG_MORGAN_FORMAT, {
  // Use trim to remove a linebreak added because both morgan and winston add one
  // cf: https://stackoverflow.com/questions/27906551/node-js-logging-use-morgan-and-winston#comment69278516_28824464
  stream: { write: message => logger.info(message.trim()) }
});
