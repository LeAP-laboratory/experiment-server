const config = require('./config');
const wait = require('./wait');
const logger = require('./logger.js');
const mongodb = require('mongodb');

const {
  MONGO_HOSTNAME,
  MONGO_PORT,
  MONGO_DB,
  MONGO_USERNAME,
  MONGO_PASSWORD
} = process.env;

let reconnect_tries = 10;

const url = `mongodb://${encodeURIComponent(MONGO_USERNAME)}:${encodeURIComponent(MONGO_PASSWORD)}@${MONGO_HOSTNAME}:${MONGO_PORT}`;

async function connect_with_retry() {
  try {
    logger.info(`connecting to db at ${url}`);
    const client = new mongodb.MongoClient(url, {
      useUnifiedTopology: true
    });
    await client.connect();
    const db = client.db(MONGO_DB);
    logger.info(`Database connected: ${MONGO_DB}`);
    return db;
  } catch (e) {
    if (reconnect_tries > 0) {
      logger.error(`Failed to connect to ${url}.  Retrying in 5 seconds (${reconnect_tries} tries left).  `, e);
      reconnect_tries = reconnect_tries - 1;
      await wait(5000);
      return connect_with_retry();
    } else {
      logger.error(`Failed to connect to ${url}.  No tries left, giving up.  `, e);
      throw(e);
    }
  }
};

module.exports = connect_with_retry();
