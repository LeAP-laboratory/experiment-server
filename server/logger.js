const { createLogger, format, transports } = require('winston');

const logger = createLogger({
  level: 'debug',
  format: format.combine(
    format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    format.splat(),
    format.json()
  ),
  "transports": [
    new transports.File({ filename: 'error.log', level: 'error' }),
    new transports.File({ filename: 'combined.log', level: 'http' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new transports.Console({
    format: format.combine(
      format.colorize(),
      format.splat(),
      format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
    ),
    level: 'info'
  }));
}

module.exports = logger;
