// Generated by CoffeeScript 1.6.3
(function() {
  var Promise;

  Promise = (require('es6-promise')).Promise;

  Promise.allSync = function(promises) {
    return function(processFn) {
      return promises.reduce(function(seq, promise) {
        return seq.then(function() {
          return promise;
        }).then(processFn);
      }, Promise.resolve());
    };
  };

  Promise.inOrder = function(array) {
    return function(processFn) {
      return array.reduce(function(seq, item) {
        return seq.then(function() {
          return processFn.call(null, item);
        });
      }, Promise.resolve());
    };
  };

  Promise.reduce = function(promises, processFn) {
    return promises.reduce(function(seq, promise) {
      return seq.then(function() {
        return promise;
      }).then(processFn);
    }, Promise.resolve());
  };

  module.exports = Promise;

}).call(this);
