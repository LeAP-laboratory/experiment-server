const dotenv = require('dotenv');
const logger = require('./logger.js');
let config

try {
  config = dotenv.config();
} catch(e) {
  logger.warn('Couldn\'t read .env, using blank config');
  config = {};
}
module.exports = config;
