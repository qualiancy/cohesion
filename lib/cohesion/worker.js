/*!
 * Cohesion - Worker Constructor
 * Copyright (c) 2012 Jake Luer <jake@qualiancy.com>
 * MIT Licensed
 */

/*!
 * Module dependencies
 */

var debug = require('debug')('cohesion:worker')
  , EventEmitter = require('events').EventEmitter
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
  this.master = master;
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
  beforeHooks.call(this, function (err) {
    if (err) return handleError(err);
    spawnWorker.call(self);
    cb(null);
  });
};

/**
 * ### .send (command[, data])
 *
 * Send a command to the child with optional
 * data.
 *
 * @param {String} command
 * @param {Mixed} data, must be JSON stringify compatible
 * @name send
 * @api public
 */

Worker.prototype.send = function (cmd, data) {
  if (!this.child) return this.queue.push([ cmd, data ]);
  var message = { cmd: cmd };
  if (data) message.data = data;
  this.child.send(JSON.stringify(message));
  debug('outgoing command: %s', cmd);
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
  this.send('shutdown');
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

  for (var e in process.env) {
    env[e] = process.env[e];
  }

  env.COHESION_CONFIG = JSON.stringify(config);

  var child = this.child = fork(script, { env: env });
  child.on('message', messageHandler.bind(this));
  child.on('exit', exitHandler.bind(this));
  debug('worker spawned at pid: %d', child.pid);

  if (this.queue && this.queue.length) {
    var line;
    while (this.queue.length) {
      line = this.queue.shift();
      this.send.apply(self, line);
    }
  }
}

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

  if (commands[message.cmd]) {
    debug('incoming command: %s', message.cmd);
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

  debug('worker with pid %d exitted with code %d', this.pid, code);
  this.child = null;

  if (!this.stopped && (retry.count < retry.max)) {
    debug('worker restart attempt');
    retry.count++;
    setTimeout(spawnWorker.bind(self), retry.delay);
  } else if (!this.stopped && (retry.counct >= rety.max)) {
    debug('worker restart failed');
    //throw new Error('Unable to start worker at script ' + this.script);
    //process.exit(1);
  }
}

/*!
 * beforeHooks (callback)
 *
 * Runs the asyncronous array of functions to be
 * handled before each spawning of a child. Will
 * pass the config object for this particular worker.
 * This is only invoked with the `spawn` method is
 * called.
 *
 * @param {Function} callback
 * @api private
 */

function beforeHooks (cb) {
  var self = this
    , beforeEach = this.master.hooks.beforeEach;

  function iterate (i) {
    var hook = beforeEach[i];
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
