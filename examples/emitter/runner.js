/*!
 * Module Dependancies
 */

var cohesion = require('../..')
  , join = require('path').join;

/*!
 * Example Objects
 */

var script = join(__dirname, 'child.js')
  , master = new cohesion.Master(script)
  , count = 0
  , waiting = master.maxWorkers;

/**
 * Notify user when we are done with
 * all work and stop workers (and exit).
 */

function done () {
  console.log('completed %d items', count);
  master.stopWorkers();
}

/**
 * Listen for when each worker start
 * and mount a listener for when worker
 * broadcasts ready event.
 */

master.on('worker', function (worker) {

  // worker is ready
  worker.on('ready', function () {
    if (count < 30) {
      console.log('sending %d to worker %d', ++count, worker.pid);
      worker.emit('calculate', count);
    } else {
      --waiting || done();
    }
  });

});

/**
 * Start our workers
 */

master.spawnWorkers();
