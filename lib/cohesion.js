exports.version = '0.1.0';
exports.Master = require('./cohesion/master');

var Child = require('./cohesion/child');
exports.child = function () {
  return new Child(process);
};
