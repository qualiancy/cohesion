var chai = require('chai')
  , should = chai.should();

var cohesion = require('..');

describe('exports', function () {

  it('has a version', function () {
    cohesion.should.have.property('version');
  });

});
