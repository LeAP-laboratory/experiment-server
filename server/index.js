const config = require('./config');

const path = require('path');
const express = require('express');

const data = require('./data.js');
const lists = require('./lists.js');
const session = require('./session.js');

const logger = require('./logger.js');

const app = express();

app.disable('x-powered-by');

const { SERVER_PORT } = process.env;

app.use(express.urlencoded({extended: false, limit: '50mb'}));
app.use(express.json({limit: '50mb'}));
app.use(express.text());

app.use((req, res, next) => {
    logger.http(`HTTP ${req.method} ${req.url}`);
    next();
});

app.use('/', express.static(path.join(__dirname, '..', 'static')));

// inject experiment parameter into individual requests
app.use('/:experiment/*', (req, res, next) => {
  req.experiment = req.params.experiment;
  next();
});

// api for each individual experiment
const api = express.Router();

api.use('/lists', lists);
api.use('/data', data);
api.use('/session', session);

// API is replicated beneath each experiment's path
app.use('/:experiment', api);

// error handling
app.use((err, req, res, next) => {
  logger.error(err.stack);
  if (res.headersSent) {
    next(err);
  } else {
    res.status(500).send({ "error": err });
  }
});

const server = app.listen(SERVER_PORT, () => {
  logger.info(`listening on port ${SERVER_PORT}`);
});
