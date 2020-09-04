const uuid = require('uuid');
const express = require('express');
const DB = require('./db.js');
const logger = require('./logger.js');
const list_balancer = require('./list_balancer.js');

const api = express.Router();

// create a new session; returns session struct stored in DB, including ID and
// other session info (e.g., condition)
api.post(
  '/',
  // preview
  (req, res, next) => {
    if (req.body.assignmentId != 'ASSIGNMENT_ID_NOT_AVAILABLE') {
      next();
    } else {
      res.json({
        ...req.body,
        condition: 'preview'
      });
      next('route');
    }
  },
  // others
  async (req, res, next) => {
    try {
      const db = await DB;
      const col = db.collection('sessions');

      let session = req.body;
      session.experiment = req.experiment;
      session.session_id = uuid.v4();

      // check for existing session for this workerId
      const old_sessions = await col.find(
        {
          workerId: session.workerId,
          experiment: session.experiment
        }
      ).toArray();

      if (old_sessions.length === 0) {
        // no existing session for worker, create a new session
        const list = await list_balancer({ experiment: session.experiment }) || {};
        session.condition = list.condition;
        session.status = 'assigned';
        await col.insertOne(session);
        logger.info("[session]: new session %s created %o", session.session_id, session);
      } else if (old_sessions.length === 1) {
        // return an existing session and let the client decide how to handle it
        session = old_sessions[0];
        logger.info("[session]: found existing session %o", session);
      } else {
        session = {
          error: "multiple",
          message: `multiple existing sessions found for workerId=${session.workerId}`
        };
      }
      
      res.json(session);
    } catch(e) {
      next(e);
    }
  }
);

// return representation of a single session
api.get('/:id', async (req, res, next) => {
  try {
    const db = await DB;
    const session = await db.collection('sessions').findOne({ 'session_id': req.params.id });
    res.json(session);
  } catch(e) {
    next(e);
  }
});

// listing of all sessions for this experiment
api.get('/', async (req, res, next) => {
  try {
    const db = await DB;
    const results = await db
          .collection('sessions')
          .find({
            ...req.query,
            experiment: req.experiment
          })
          .toArray();
    res.json(results);
  } catch(e) {
    next(e);
  }
});

// update status for a given session
api.post('/:id/status', async (req, res, next) => {
  try {
    const db = await DB;
    const id = req.params.id;
    const status = req.body.trim();
    logger.info(`[session]: update status for ${id}: ${status}`);
    const updated = await db.collection('sessions').updateOne(
      { "session_id": id },
      { "$set": { "status": status } }
    );
    // TODO: return a sensible error/warning if no matching session found...
    if (updated.matchedCount == 0) {
      logger.warn('[session]: status update session not found %s', id);
      res.status(404).send();
    } else {
      res.status(200).send();
    }
  } catch(e) {
    next(e);
  }
});


if (process.env.NODE_ENV !== 'production') {
  // delete a session
  api.delete('/:id', async (req, res, next) => {
    try {
      const query = {
        "session_id": req.params.id
      };
      logger.info(`Deleting session ${req.params.id} (experiment: ${req.experiment})`);
      const db = await DB;
      const result = await db.collection('session').deleteOne(query);
      res.status(200).send(result);
    } catch(e) {
      next(e);
    }
  });

  // delete all sessions (for this experiment)
  api.delete('/', async (req, res, next) => {
    try {
      const query = {
        "experiment": req.experiment
      };
      logger.warn(`Deleting all sessions (experiment: ${req.experiment})`);
      const db = await DB;
      const result = await db.collection('session').deleteMany(query);
      res.status(200).send(result);
    } catch(e) {
      next(e);
    }
  });
}

module.exports = api;
