# Cohesion [![build status](https://secure.travis-ci.org/qualiancy/cohesion.png)](http://travis-ci.org/qualiancy/cohesion)

> Elegant process clustering for node.js

#### Features

- Controller <-> Child Event Transference

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

The controller is the master process of a cohesion process cluster. Through it you can manage 
pre- and post- worker hooks, set number of workers, and listen for events. 

To begin, construct a new worker by passing the path to the child script. An additional settings
object can also be included to further modify a master behavior.

The most important event that the constructed master will emit is the `worker` event; this 
will be emitted for each new constructed worker. Events that are triggered on a worker process will
be emitted on child process, and visa-versa. 

The following example demonstrates a simple counter which will round-robin a countdown between each
spawned child. 

```js
/**
 * controller.js
 */

// create master
var cohesion = require('cohesion')
  , master = new cohesion.Master(__dirname + '/child.js');

// example counter
var count = 30;

// event for when each worker spawns
master.on('worker', function (worker) {

  // emitted by child on start
  worker.on('ready', function () {
    worker.emit('calc', count);
  });

  // emitted by child after a calculation
  worker.on('next', function () {
    if (count > 0 ) {
      worker.emit('count', count);
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

The child is a small wrapper around the child-process api that turns each child process into
a remote event listener and emitter. 

The follow example demonstrates the child side of the previous counter example.

```js
/**
 * child.js
 */

// mount child listener
var child = require('cohesion').child();

// emitted by controller
child.on('count', function (n) {
  setTimeout(function () {
    console.log('pid %d - %d', child.pid, n);
    child.emit('next');
  }, 100);
});

// start the calculations
child.emit('ready');
```

## API Reference

### Master

#### Events

- `worker` 

##### .beforeEach (fn)

Provide a function that is be called before a worker is started. Function can be asyncronous and
should be used to establish configuration. It will be called once before each worker
is started, but not on restarts. Multiple calls will queue multiple before each functions that 
will be invoked in the order they are defined. 

The following example uses harbor to assign a port to each worker.

```js
var harbor = require('harbor')(1227, 1337)
  , n = 0;

master.beforeEach(function (config, done) {
  var name = 'child-' + (++n);
  config.name = name;
  harbor.claim(name, function (err, port) {
    if (err) return done(err);
    console.log('clamed 
    config.port = port;
    done();
  });
});
```

As you can see, config is a simple JSON object that will be serialized and provided to the child
after startup. See the Child API for more information on how to access the config on the server side.

##### .afterEach (fn)

Works like `.beforeEach()`, but queue functions to be invoked after a worker has completed it's 
shutdown sequence. This occurs either when `worker.stop()` is called or when a worker has reached 
it's maximum restart attempts and the startup sequence is abandoned.

```js
master.afterEach(function (config, done) {
  harbor.release(config.name);
  done();
});
```

##### .spawnWorkers (max, cb)

##### .spawnWorker (cb)

### Child API

## Contributing

Interested in contributing? Fork to get started. Contact [@logicalparadox](http://github.com/logicalparadox) 
if you are interested in being regular contributor.

#### Contibutors 

* Jake Luer ([@logicalparadox](http://github.com/logicalparadox))

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
