const fs = require('fs');
const path = require('path');
const winston = require('winston');
const env = require('../config/env');

fs.mkdirSync(env.logDir, { recursive: true });

const { combine, timestamp, json, colorize, printf } = winston.format;

const MAX_LOG_SIZE_BYTES = 5 * 1024 * 1024;

// Log files store one JSON object per line so they are easy to search and parse.
const fileFormat = combine(timestamp(), json());

const consoleFormat = combine(
  colorize(),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  printf(({ timestamp: time, level, message, ...meta }) => {
    const details = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
    return `${time} ${level}: ${message}${details}`;
  })
);

const logger = winston.createLogger({
  level: env.logLevel,
  transports: [
    new winston.transports.File({
      filename: path.join(env.logDir, 'app.log'),
      format: fileFormat,
      maxsize: MAX_LOG_SIZE_BYTES,
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join(env.logDir, 'error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: MAX_LOG_SIZE_BYTES,
      maxFiles: 5,
    }),
    new winston.transports.Console({
      format: consoleFormat,
      silent: env.nodeEnv === 'test',
    }),
  ],
});

module.exports = logger;
