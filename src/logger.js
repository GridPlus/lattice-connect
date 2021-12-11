const pino = require('pino');
const config = require('../config.js');

const opts = {
  level: config.LOG_LEVEL || 'error',
};
const dest = config.LOG_DEST || pino.destination(1);
const logger = pino(opts, dest);

export default logger;
