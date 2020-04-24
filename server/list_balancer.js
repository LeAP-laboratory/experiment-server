const _ = require('lodash');
const logger = require('./logger.js');
const DB = require('./db.js');

// targets should be an array of objects like
// {
//   count: <desired count>,
//   condition: ...
// }
async function db_counts(query={}) {
  const db = await DB;
  
  // query database for counts for each condition
  const counts = await db
        .collection('sessions')
        .aggregate(
          [
            {
              $match:
              {
                "status": { "$nin": ["abandoned"] },
                ...query
              }
            },
            { $group: { _id: "$condition", count: {$sum: 1} } }
          ]
        )
        .toArray();

  return counts;
}

async function db_targets(query={}) {
  const db = await DB;
  const targets = await db
    .collection('lists')
    .find(query)
    .toArray();
  return targets;
}

async function list_balancer(query={}) {

  const targets = (await db_targets(query)).map(x => {
    x.target_count = x.count === undefined ? 0 : x.count;
    x.count = 0;
    return x;
  });

  console.dir(targets);

  if (targets.length == 0) {
    logger.warn('[lists] No lists found for %o.', query);
    return undefined;
  } else {

    // counts of existing assignments
    const counts = await db_counts(query);
    
    // write current count from db into targets
    await counts.forEach(db_obj => {
      const target = _.find(targets, ['condition', db_obj._id]);
      if (target !== undefined) {
        target.count = db_obj.count;
      }
    });

    logger.verbose("[lists] List balancer serving conditions: %o.", targets);

    const cond = _.maxBy(targets, t => t.target_count - t.count);
    logger.info("[lists] List balancer selected %o", cond);
    return cond;
  }
}


module.exports = list_balancer;
