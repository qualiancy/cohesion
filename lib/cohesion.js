exports.version = '0.2.0';
exports.Master = require('./cohesion/master');

var Child = require('./cohesion/child');
exports.child = function () {
  return new Child(process);
};
