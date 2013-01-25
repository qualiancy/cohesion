/*!
 * Cohesion - Worker Constructor
 * Copyright (c) 2012 Jake Luer <jake@qualiancy.com>
 * MIT Licensed
 */

/*!
 * Module dependencies
 */

var debug = require('sherlock')('cohesion:worker')
  , EventEmitter = require('drip').EventEmitter
  , fork = require('child_process').fork
  , util = require('util');

/*!
 * Internal Dependancies
 */

var commands = require('./commands/worker');

/*!
 * Primary export
 */

module.exports = Worker;

/**
 * Worker API
 *
 * The worker is a container for child process from
 * the perspective of the controller process.
 *
 * @param {Master}
 * @param {Object} options
 * @api public
 */

function Worker (master, opts) {
  EventEmitter.call(this);
  opts = opts || {};
  this.child = null;
  this.config = {};
  this.emit = emit;
  this.master = master;
  this.pid = null;
  this.queue = [];
  this.stopped = false;
  this.retry = {
      count: 0
    , delay: opts.retryDelay || 0
    , max: opts.retryMax || 10
  };
}

/*!
 * Inherits from EventEmitter
 */

util.inherits(Worker, EventEmitter);

/**
 * ### .spawn ([callback])
 *
 * Spawn the child process. Will invoke all
 * all of the before hooks prior to spawning
 * the child process.
 *
 * @param {Function} callback on spawn (optional)
 * @cb Error if occurred
 * @name spawn
 * @api public
 */

Worker.prototype.spawn = function (cb) {
  var self = this;
  cb = cb || function () {};

  // run the before hooks before spawning
  runHooks.call(this, 'before', function (err) {
    if (err) return cb(err);
    spawnWorker.call(self);
    cb(null);
  });
};

/**
 * ### .stop ()
 *
 * Begin the child process shutdown sequence. May
 * not happen immediately.
 *
 * @name stop
 * @api public
 */

Worker.prototype.stop = function () {
  this.stopped = true;
  send.call(this, 'shutdown');
};

/*!
 * spawnWorker ()
 *
 * Handler for spawning workers on start or
 * restart. Will set the `worker.child` to the
 * newly started process. Will also empty the
 * delayed message queue.
 *
 * @api private
 */

function spawnWorker () {
  var config = this.config
    , env = {}
    , script = this.master.workerScript;

  // setup env variables
  for (var e in process.env) {
    env[e] = process.env[e];
  }

  // include config
  env.COHESION_CONFIG = JSON.stringify(config);

  // spawn child and mount listeners
  var child = this.child = fork(script, { env: env });
  this.pid = child.pid;
  child.on('message', messageHandler.bind(this));
  child.on('exit', exitHandler.bind(this));
  debug('worker %d spawned', this.pid);

  // process queue if it exists
  if (this.queue) {
    while (this.queue.length) {
      send.apply(self, this.queue.shift());
    }
  }
}

/*!
 * send (command[, data])
 *
 * Send a command to the child with optional data.
 *
 * @param {String} command
 * @param {Mixed} data, must be JSON stringify compatible
 * @name send
 * @api public
 */

function send (cmd, data) {
  var message = data
    ? { cmd: cmd, data: data }
    : { cmd: cmd };

  // queue message if child doesn't exist to send to
  if (!this.child) {
    this.queue.push([ cmd, data ]);
  } else {
    this.child.send(JSON.stringify(message));
    debug('sent %s', cmd);
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
  var message = JSON.parse(msg)

  // only execute command if it exists
  if (commands[message.cmd]) {
    debug('received %s', message.cmd);
    commands[message.cmd](this, message.data);
  }
}

/*!
 * exitHandler (code)
 *
 * Handler for the exit event of a child. Attached
 * to the `exit` event of a every spawned child.
 *
 * @param {Number} code
 * @api private
 */

function exitHandler (code) {
  var self = this
    , retry = this.retry;

  // clean up existing
  debug('worker %d exit', this.pid, code);
  this.child = null;
  this.pid = null;

  // handle removing worker from parent if needed
  function removeWorker () {
    var i = self.master.workers.indexOf(self);
    if (i >= 0) self.master.workers.shift(i, 1);
    runHooks.call(self, 'after', function (err) {
      if (err) self.emit('error', err);
    });
  }

  // check for retry variables
  if (!this.stopped && (retry.count < retry.max)) {
    debug('worker restart attempt');
    retry.count++;
    setTimeout(spawnWorker.bind(self), retry.delay);
  } else if (!this.stopped && (retry.count >= retry.max)) {
    debug('worker restart failed');
    removeWorker();
  } else {
    debug('worker stopped');
    removeWorker();
  }
}

/*!
 * runHooks (callback)
 *
 * Runs the asyncronous array of functions to be
 * handled before/after  each spawning of a child. Will
 * pass the config object for this particular worker.
 *
 * @param {Function} callback
 * @api private
 */

function runHooks (which, cb) {
  var self = this
    , hooks = this.master.hooks;

  // iterate through all hooks of type
  function iterate (i) {
    var hook = hooks[which + 'Each'][i];
    if (!hook) return cb(null);
    if (hook.length === 2) {
      hook(self.config, function next (err) {
        if (err) return cb(err);
        iterate(++i);
      });
    } else {
      hook(self.config);
      iterate(++i);
    }
  }

  iterate(0);
}

/*!
 * emit (event[, args])
 *
 * Private handler to emit events to child process.
 *
 * @param {String} event
 * @param {Mixed} arguments ...
 * @api private
 */

function emit (event) {
  var args = [].slice.apply(arguments);
  send.call(this, 'event', args);
}
