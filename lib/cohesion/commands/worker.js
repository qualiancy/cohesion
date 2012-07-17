/*!
 * Cohesion - Worker Commands
 * Copyright (c) 2012 Jake Luer <jake@qualiancy.com>
 * MIT Licensed
 */

exports.ping = function (worker) {
  worker.send('pong');
};

exports.shutdown = function (worker) {
  worker.stop();
};
