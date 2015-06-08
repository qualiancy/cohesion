/**
 * Wrap current process as cohesion child.
 */

var Child = require('../..').Child;
var child = new Child();

/**
 * Listen for instructions to do some work.
 */

child.on('calculate', function (n) {
  var delay = Math.floor(Math.random() * 1000);
  setTimeout(function () {
    console.log('%d processed %d', child.pid, n);
    child.emit('ready');
  }, delay);
});

/**
 * Emit first ready event.
 */

child.emit('ready');
