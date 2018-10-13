//https://github.com/winstonjs/winston/tree/master/examples
const winston = require('winston');
const fs = require('fs');
const path = require('path');

const filename = path.join(__dirname, '../logfile.log');
try {
  fs.unlinkSync(filename);
} catch (ex) {}
//
// Logging levels
//
const config = {
  levels: {
    emerg: 0,
    alert: 1,
    critical: 2,
    error: 3,
    warn: 4,
    notice: 5,
    info: 6,
    debug: 7
  },
  colors: {
    emerg: 'red',
    alert: 'red',
    critical: 'yellow',
    error: 'yellow',
    warn: 'yellow',
    notice: 'cyan',
    info: 'green',
    debug: 'blue'
  }
};

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp(),
  winston.format.align(),
  winston.format.splat(),
  winston.format.printf((info) => {
    const {
      timestamp,
      level,
      message,
      ...args
    } = info;

    const ts = timestamp.slice(0, 19).replace('T', ' ');
    return `${ts} [${level}]: ${message} ${Object.keys(args).length ? JSON.stringify(args, null, 2) : ''}`;
  }),
);

const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.align(),
  winston.format.splat(),
  winston.format.printf((info) => {
    const {
      timestamp,
      level,
      message,
      ...args
    } = info;

    const ts = timestamp.slice(0, 19).replace('T', ' ');
    return `${ts} [${level}]: ${message} ${Object.keys(args).length ? JSON.stringify(args, null, 2) : ''}`;
  }),
);

const logger = module.exports = winston.createLogger({
  levels: config.levels,
  transports: [

    new winston.transports.File({
      filename: filename,
      format: fileFormat
    })
  ],
  level:"debug"

});

if (process.env.NODE_ENV != "production") {
  winston.addColors(config.colors);
  logger.add(new winston.transports.Console({
    level: 'debug',
    format: consoleFormat
  }));
}
/*
// Create custom logger

var logger = new (winston.Logger)({
transports: [
new (winston.transports.Console)({
timestamp: function() {
return Date.now();
},
formatter: function(options) {
return options.timestamp() +' '+ options.level.toUpperCase() +' '+ (options.message ? options.message : '') +
(options.meta && Object.keys(options.meta).length ? '\n\t'+ JSON.stringify(options.meta) : '' );
}
})
]
});
*/
module.exports = logger;
module.exports.stream = {
  write: function(message, encoding) {
    logger.info(message);
  }
};
