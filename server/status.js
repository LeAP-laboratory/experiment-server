const express = require('express');
const DB = require('./db.js');
const logger = require('./logger.js');

const api = express.Router();

api.post('/', async (req, res, next) => {
  try {
    const db = await DB;
    const col = db.collection('sessions');
    const { status, ...session } = req.body;
    logger.info('updating status to %s for session %o', status, session);
    const updated = await col.updateOne(
      {
        assigned: session
      },
      {
        "$set": {
          "status": status
        }
      });
    logger.info('updated %d records of %d matching', updated.modifiedCount, updated.matchedCount);
    res.status(200).send();
  } catch(e) {
    next(e);
  }
});

module.exports = api;
