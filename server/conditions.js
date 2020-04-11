const _ = require('lodash');
const logger = require('./logger.js');
const DB = require('./db.js');
const list_balancer = require('./list_balancer.js');
const express = require('express');

// initialize list balancer from ../assignments.json

const api = express.Router();

async function get_condition(session, experiment) {
  const db = await DB;
  const col = db.collection('assignments');

  let assignment;

  if (session.assignmentId == 'ASSIGNMENT_ID_NOT_AVAILABLE') {
    assignment = {
      assigned: session,
      condition: 'preview'
    };
  } else {
    const assignments = await col.find(
      {
        "assigned.workerId": session.workerId
      }
    ).toArray();
    if (assignments.length === 0) {
      // new session
      const list = await list_balancer({ experiment: experiment });
      assignment = {
        experiment: experiment,
        assigned: session,
        condition: list.condition,
        status: "assigned"
      };
      await col.insertOne(assignment);
      logger.info(`[assignments]: creating record for workerId ${session.workerId} in database`);
    } else {
      // existing session for this worker
      if (assignments.length === 1) {
        // only one existing assignment
        assignment = assignments[0];
        logger.info(`[assignments]: Record for workerId "${session.workerId}" with status "${assignment.status}"`);
        if (assignment.status != "assigned") {
          // started or completed
          assignment.condition = "repeat";
        }
      } else {
        // multiple existing assignments, or status other than "assigned"
        logger.info(`[assignments]: Multiple records for workerId ${session.workerId} already present in database`);
        assignment = {
          assigned: session,
          condition: "repeat",
        };
      }
    }
  }
  logger.info("Returning assigned condition %o", assignment);
  return assignment.condition;
}

api.get('/', async (req, res, next) => {
  try {
    logger.info("Condition requested for %s with parameters %o", req.experiment, req.query);
    const condition = await get_condition(req.query, req.experiment);
    logger.info(`sending condition: "${condition}"`);
    res.json(condition);
  } catch(e) {
    next(e);
  }
});

if (process.env.NODE_ENV !== 'production') {

  api.delete('/batch', async (req, res, next) => {
    try {
      const query = {
        experiment: req.experiment,
        ...req.query
      };
      const db = await DB;
      const col = await db.collection('assignments');
      const r = await col.deleteMany(query);
      logger.info(`[assignments]: ${r.deletedCount} deleted`);
      res.status(200).send();
    } catch(e) {
      next(e);
    }
  });

}

module.exports = api;
