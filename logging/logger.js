const winston = require("winston");

const logger = new winston.createLogger({
  transports: [
    new winston.transports.Console({
      level: process.env.LOG_LEVEL,
      handleExceptions: true,
      colorize: true,
      // Preserve formatting for handled exceptions:
      // https://github.com/winstonjs/winston/issues/84#issuecomment-76314528 <3
      humanReadableUnhandledException: true
    })
  ],
  exitOnError: false
});

module.exports = logger;
