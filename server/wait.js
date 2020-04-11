// wait for promise
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = wait;
