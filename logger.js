const winston = require('winston');
require('winston-daily-rotate-file');
const { DEV_MODE } = require('./config');

const rotateFileTransport = new winston.transports.DailyRotateFile({
  filename: 'logs/application-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '90d',
});

const logger = winston.createLogger({
  level: DEV_MODE ? 'debug' : 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, stack }) => {
        return `${timestamp} [${level.toUpperCase()}]: ${stack || message}`;
    })
  ),
  transports: [
    rotateFileTransport,
    new winston.transports.Console(),
  ],
});

const oldInfo = logger.info;
logger.info = (...args) => {
  args = args.map(arg => typeof arg !== 'object' ? arg : JSON.stringify(arg));
  oldInfo(args.join(' '));
};

module.exports = logger;
