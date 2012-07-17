module.exports = process.env.COHESION_COV
  ? require('./lib-cov/cohesion')
  : require('./lib/cohesion');
