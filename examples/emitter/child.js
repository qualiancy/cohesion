var child = require('../..').child();

child.on('calculate', function (n) {
  var delay = Math.floor(Math.random() * 1000);
  setTimeout(function () {
    console.log('%d processed %d', child.pid, n);
    child.emit('ready');
  }, delay);
});

child.emit('ready');
