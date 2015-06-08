/*!
 * Cohesion - Child Commands
 * Copyright (c) 2012 Jake Luer <jake@qualiancy.com>
 * MIT Licensed
 */

/*!
 * Module dependencies
 */

var EventEmitter = require('drip').EventEmitter;

exports.pong = function () {};

exports.shutdown = function (child) {
  child.proc.exit();
};

exports.event = function (child, args) {
  EventEmitter.prototype.emit.apply(child, args);
};
