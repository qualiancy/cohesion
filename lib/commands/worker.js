/*!
 * Cohesion - Worker Commands
 * Copyright (c) 2012 Jake Luer <jake@qualiancy.com>
 * MIT Licensed
 */

/*!
 * Module dependencies
 */

var EventEmitter = require('drip').EventEmitter;

exports.ping = function (worker) {};

exports.shutdown = function (worker) {
  worker.stop();
};

exports.event = function (worker, args) {
  EventEmitter.prototype.emit.apply(worker, args);
};
