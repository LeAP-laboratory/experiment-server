// for storing data
const DB = require('./db.js');
const logger = require('./logger.js');
const express = require('express');

async function save(data) {
  const db = await DB;
  // TODO: extract query parameters from .url into fields
  const col = db.collection('results');
  logger.verbose('saving results to database: %o', data);
  let r = await col.insertOne(data);
}

const api = express.Router();

api.post('/', async (req, res, next) => {
  try {
    const payload = {
      experiment: req.experiment,
      ...req.body
    };
    await save(payload);
    logger.info('[data] ✔ results saved');
    res.status(200).send();
  } catch(err) {
    logger.error(`error saving data: ${err}`);
    next(err);
  }
});

api.get('/', async (req, res, next) => {
  const query = {
    experiment: req.experiment,
    ...req.query
  };
  const db = await DB;
  const results = await db
        .collection('results')
        .find(query)
        .toArray();
  logger.info('[data] %d results found for %o', results.length, query);
  res.status(200).json(results);
});

module.exports = api;
