/*!
 * Cohesion - Child Constructor
 * Copyright (c) 2012 Jake Luer <jake@qualiancy.com>
 * MIT Licensed
 */

/*!
 * Module dependencies
 */

var pid = process.pid
  , debug = require('sherlock')('cohesion:child-' + pid)
  , EventEmitter = require('drip').EventEmitter
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
  // setup process
  this.proc = proc;
  this.pid = proc.pid;
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
  this.emit = emit;
}

/*!
 * Inherits from EventEmitter
 */

util.inherits(Child, EventEmitter);

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
  send.call(this, 'shutdown');
};

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

function send (cmd, data) {
  var message = data
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
  send.call(this, 'ping');
}

/*!
 * emit (event[, args])
 *
 * Private handler to emit events to parent process.
 *
 * @param {String} event
 * @param {Mixed} arguments ...
 * @api private
 */

function emit (event) {
  var args = [].slice.apply(arguments);
  send.call(this, 'event', args);
}
