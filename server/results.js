const logger = require('./logger.js');
const DB = require('./db.js');
const express = require('express');


const api = express.Router();

api.get('/', async (req, res, next) => {
  const query = {
    experiment: req.experiment,
    ...req.query
  };
  logger.info('Results requested for %o', query);
  const db = await DB;
  const results = await db
        .collection('results')
        .find(query)
        .toArray();
  logger.info(`found ${results.length} results`);
  res.status(200).json(results);
});

module.exports = api;
