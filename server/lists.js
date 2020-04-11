const logger = require('./logger.js');
const DB = require('./db.js');
const express = require('express');

const api = express.Router();

api.get('/', async (req, res, next) => {
  try {
    const query = {
      experiment: req.experiment,
      ...req.query
    };
    const db = await DB;
    const lists = await db
      .collection('lists')
      .find(query)
      .toArray();
    res.json(lists);
  } catch(e) {
    next(e);
  }
});

api.put('/', async (req, res, next) => {
  try {
    const lists = req.body;
    const experiment = req.experiment;
    logger.info('[lists]: updating lists for %s: %o', experiment, lists);

    const db = await DB;
    const col = db.collection('lists');

    const results = await Promise.all(
      lists.map(async list => {
        let {count, ...list_body} = list;
        list_body.experiment = experiment;
        let result = await col.updateOne(
          list_body,
          { '$set': { 'count': count } },
          {upsert: true}
        );
        logger.info('[lists] updated count: %d, list: %o', count, list_body);
        return result;
      })
    );
    res.send(results.map(x => x.result));
  } catch(e) {
    next(e);
  }
});

if (process.env.NODE_ENV !== 'production') {
  api.delete('/', async (req, res, next) => {
    try {
      const query = {
        experiment: req.experiment,
        ...req.body
      };
      logger.warn('Deleting lists from db matching: %o', query);
      const db = await DB;
      const result = await db.collection('lists').deleteMany(query);
      res.send(result);
    } catch(e) {
      next(e);
    }
  });
}

module.exports = api;
