/*!
 * Cohesion - Master Constructor
 * Copyright (c) 2012 Jake Luer <jake@qualiancy.com>
 * MIT Licensed
 */

/*!
 * Module dependencies
 */

var debug = require('sherlock')('cohesion:master')
  , EventEmitter = require('drip').EventEmitter
  , util = require('util');

/*!
 * Internal Dependancies
 */

var Worker = require('./worker');

/*!
 * Module Constants
 */

var maxWorkers = require('os').cpus().length

/*!
 * Primary export
 */

module.exports = Master;

/**
 * Master API
 *
 * The master is the group controller for a set
 * of clustered processes. It manages the starting
 * and stopping of workers.
 *
 * @param {String} script to load as worker
 * @param {Object} options
 * @api public
 */

function Master (workerScript, opts) {
  EventEmitter.call(this);
  opts = opts || {};
  this.hooks = { beforeEach: [], afterEach: [] };
  this.lastWorker = 0;
  this.maxWorkers = opts.maxWorkers || maxWorkers;
  this.workers = [];
  this.workerScript = workerScript;
  this.workerOptions = opts.worker || {};
}

/*!
 * Inherits from EventEmitter
 */

util.inherits(Master, EventEmitter);

/**
 * ### .beforeEach (fn)
 *
 * Add a function to be executed before spawning
 * each child.
 *
 * @param {Function} function
 * @name beforeEach
 * @api public
 */

Master.prototype.beforeEach = function (fn) {
  this.hooks.beforeEach.push(fn);
  return this;
};

/**
 * ### .afterEach (fn)
 *
 * Add a function to be executed after permanantly
 * closing each child. This is called either after a
 * successful `stop` call to the Worker, or should
 * a worker fail it's restart cycle.
 *
 * @param {Function} function
 * @name afterEach
 * @api public
 */

Master.prototype.afterEach = function (fn) {
  this.hooks.afterEach.push(fn);
  return this;
};

/**
 * ### .spawnWorker ([callback])
 *
 * @param {Function} callback
 * @cb Error if occurred
 * @name spawnWorker
 * @api public
 */

Master.prototype.spawnWorker = function (cb) {
  var self = this
    , worker = new Worker(this, this.workerOptions);

  cb = cb || function () {};

  // should error occur
  function handleError (err) {
    self.emit('error', err);
    cb(err);
  }

  // spawn the worker
  worker.spawn(function (err) {
    if (err) return handleError(err);
    debug('spawned worker %d', worker.pid);
    self.emit('worker', worker);
    cb(null, worker);
  });
};

/**
 * ### .spawnWorkers (max, cb)
 *
 * Begin the spawn cycle for set of worker.
 * Calling this multipe times will yield an error
 * for second+ calls.
 *
 * @param {Number} max workers
 * @param {Function} callback
 * @cb Error if occurred
 * @name spawnWorkers
 * @api public
 */

Master.prototype.spawnWorkers = function (max, cb) {
  // check for multiple calls
  if (this.started) return cb(new Error('Cannot spawn multiple times.'));
  this.started = true;

  // parse args
  if (arguments.length && 'number' !== typeof max) {
    cb = max;
    max = this.maxWorkers;
  }

  // make sure not user not spawning into custom array
  if (cb && 'function' !== typeof cb) {
    cb = function () {};
  }

  // actually spawn workers
  spawnWorkers.call(this, max, cb);
};

/**
 * ### .restartWorkers ([callback])
 *
 * Zero downtime restarts for a set of workers.
 * Will spawn up a new set of workers, then replace
 * and shutdown previous workers. Callback will be
 * invoked on the completion of spawning, but before the
 * completion of shutting down old workers.
 *
 * @param {Function} callback (optional)
 * @cb Error if occurred
 * @name restartWorkers
 * @api public
 */

Master.prototype.restartWorkers = function (cb) {
  var self = this
    , oldWorkers = this.workers
    , max = oldWorkers.length
    , newWorkers = [];

  // should an error occur
  function handleError (err) {
    self.emit('error', err);
    cb(err);
  }

  // spawn workers into new array
  spawnWorkers.call(this, max, newWorkers, function (err) {
    if (err) return handleError(err);
    self.workers = newWorkers;
    oldWorkers.forEach(function (worker) {
      worker.stop();
    });
  });
};

/**
 * ### .stopWorkers ()
 *
 * Stop all of the workers the master is advising.
 *
 * @name stopWorkers
 * @api public
 */

Master.prototype.stopWorkers = function () {
  this.workers.forEach(function (worker) {
    worker.stop();
  });
};

/**
 * ### .broadcast (msg[, data])
 *
 * Send a message to all of the active workers for
 * which the master is providing cohesion.
 *
 * @param {String} command
 * @param {Mixed} data (optional)
 * @name broadcast
 * @api public
 */

Master.prototype.broadcast = function () {
  var args = Array.prototype.slice.call(arguments, 0);

  // send message to each worker
  this.workers.forEach(function (worker) {
    worker.send.apply(worker, args);
  });
};

/*!
 * spawnWorkers (max, array, callback)
 *
 * Handler for actually spawning workers. Supports
 * a custom array for the restart logic. If called
 * for the `master.spawnWorkers` method, will never
 * contain an array.
 *
 * @param {Number} max workers
 * @param {Array} custom worker array holder
 * @param {Function} callack
 * @cb Error if occurred
 * @api private
 */

function spawnWorkers (max, arr, cb) {
  var self = this;

  // parse args part 1
  if ('number' !== typeof max) {
    arr = max;
    max = this.maxWorkers;
  }

  // parse args part 2
  if ('function' === typeof arr) {
    cb = arr;
    arr = this.workers;
  }

  // defaults
  max = max || this.maxWorkers;
  arr = arr || this.workers;
  cb = cb || function () {};

  // iteratively spawn workers
  function spawn () {
    if (max - arr.length == 0) return cb(null);
    self.spawnWorker(function (err, worker) {
      if (err) return cb(err);
      arr.push(worker);
      spawn();
    });
  }

  spawn();
}
