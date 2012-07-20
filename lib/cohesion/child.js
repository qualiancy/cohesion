/*!
 * Cohesion - Child Constructor
 * Copyright (c) 2012 Jake Luer <jake@qualiancy.com>
 * MIT Licensed
 */

/*!
 * Module dependencies
 */

var pid = process.pid
  , debug = require('debug')('cohesion:child-' + pid)
  , EventEmitter = require('events').EventEmitter
  , util = require('util');

/*!
 * Internal Dependancies
 */

var commands = require('./commands/child');

/*!
 * Primary export
 */

module.exports = Child;

/**
 * Child API
 *
 * The child is the container for the process
 * from the perspective of the spawned child
 * process.
 *
 * @param {Object} process
 * @api public
 */

function Child (proc) {
  EventEmitter.call(this);

  // setup process
  this.proc = proc;
  proc.on('message', messageHandler.bind(this));

  // try to parse config
  var config = proc.env.COHESION_CONFIG;
  if (config) {
    try { this.config = JSON.parse(config); }
    catch (ex) { this.config = {}; }
  } else {
    this.config = {};
  }

  // setup ping handler
  this.timer = setInterval(pingHandler.bind(this), 10000);
}

/*!
 * Inherits from EventEmitter
 */

util.inherits(Child, EventEmitter);

/**
 * ### .send (command[, data])
 *
 * Send a command from the child process to the
 * managing worker.
 *
 * @param {String} command
 * @param {Mixed} data (optional)
 * @name send
 * @api public
 */

Child.prototype.send = function (cmd, data) {
  var message = message.data
    ? { cmd: cmd, data: data }
    : { cmd: cmd };

  // if we can't reach parent, exit
  // TODO: graceful shutdown
  try {
    this.proc.send(JSON.stringify(message));
    debug('sent %s', cmd);
  } catch (ex) {
    debug('lost parent connection');
    process.exit(1);
  }
};

/**
 * ### .stop ()
 *
 * Insist the managing worker to shut down
 * this child process.
 *
 * @name stop
 * @api public
 */

Child.prototype.stop = function () {
  this.send('shutdown');
};

/*!
 * messageHandler (message)
 *
 * Handler for incoming messages from child process.
 * Attached to the `message` event of a every spawned
 * child.
 *
 * @param {String} message
 * @api private
 */

function messageHandler (msg) {
  var message = JSON.parse(msg);

  // only execute command if it exists
  if (commands[message.cmd]) {
    debug('received %s', message.cmd);
    commands[message.cmd](this, message.data);
  }
}

/*!
 * pingHandler ()
 *
 * Ping the parent process to ensure it is still
 * alive. If it is not, exit immediately
 *
 * @api private
 */

function pingHandler () {
  this.send('ping');
}
