var cohesion = require('../..')
  , join = require('path').join;

var script = join(__dirname, 'child.js')
  , master = new cohesion.Master(script);

var count = 0
  , waiting = master.maxWorkers;

function done () {
  console.log('completed %d items', count);
  master.stopWorkers();
}

master.on('worker', function (worker) {

  worker.on('ready', function () {
    if (count < 30) {
      console.log('sending %d to worker %d', ++count, worker.pid);
      worker.emit('process', count);
    } else {
      --waiting || done();
    }
  });

});

master.spawnWorkers();
