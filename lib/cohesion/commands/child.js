/*!
 * Cohesion - Child Commands
 * Copyright (c) 2012 Jake Luer <jake@qualiancy.com>
 * MIT Licensed
 */

exports.pong = function () {};

exports.shutdown = function (child) {
  child.proc.exit();
};
