# Cohesion [![build status](https://secure.travis-ci.org/qualiancy/cohesion.png)](http://travis-ci.org/qualiancy/cohesion)

> Elegant process clustering for node.js

#### Features

- 
-
-

#### Installation

`cohesion` package is available for node through [npm](http://npmjs.org).

```bash
npm install cohesion
```

## Getting Started

To ensure consistency, the following language will used throughout the documentation.

- Controller - the node script the is initially started and manages all child processes
- Child - a script & javascript object that is started as a child processes of the controller
- Master - the javascript object api that manages macro setting for the cohesion cluster
- Worker - from the context of the controller, the javascript object api for each child process

### Controller

```js
// create master
var cohesion = require('cohesion')
  , master = new cohesion.Master(__dirname + '/child.js');

// example counter
var count = 30;

// event for when each worker spawns
master.on('worker' function (worker) {

  // emitted by child on start
  worker.on('ready', function () {
    worker.emit('calc', count);
  });

  // emitted by child after a calculation
  worker.on('next', function () {
    if (count > 0 ) {
      worker.emit('calc', count);
      count--;
    } else {
      worker.stop();
    }
  });

});

// event for when all workers have stopped
master.on('stopped', function () {
  console.log('all done');
});

// start all the workers
master.spawnWorkers();
```

### Child

```js
// mount child listener
var child = require('cohesion').child();

// emitted by controller
child.on('calc', function (n) {
  setTimeout(function () {
    console.log('pid %d - %d', child.pid, n);
    child.emit('next');
  }, 100);
});

// start the calculations
child.emit('ready');
```

##### Child

### API Reference

#### Controller API

#### Child API

## License

(The MIT License)

Copyright (c) 2012 Jake Luer <jake@qualiancy.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
