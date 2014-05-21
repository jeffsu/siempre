(function() {
  var TIMEOUT, async, common, isRunning, killProcess, killTree, psTree;

  psTree = require('ps-tree');

  common = require('forever-monitor/lib/forever-monitor/common');

  async = require('async');

  TIMEOUT = 60000;

  killTree = function(pid, signal, timeout, done) {
    return psTree(pid, function(err, children) {
      var kill, pids;
      pids = children.map(function(c) {
        return c.PID;
      });
      kill = function(pid, cb) {
        return killProcess(pid, signal, timeout, cb);
      };
      return async.series([
        function(cb) {
          return async.each(pids, kill, cb);
        }, function(cb) {
          return kill(pid, cb);
        }
      ], done);
    });
  };

  killProcess = function(pid, signal, timeout, cb) {
    var e, start, test;
    try {
      process.kill(pid, signal);
    } catch (_error) {
      e = _error;
      console.log("failed to kill " + pid + ":", e);
      cb(null);
    }
    start = Date.now();
    test = function() {
      var running, timedOut;
      running = isRunning(pid);
      timedOut = timeout < (Date.now() - start);
      if (!running) {
        return cb(null);
      } else if (timedOut) {
        return cb(null, 'timedout');
      } else {
        return setTimeout(test, 50);
      }
    };
    return test();
  };

  isRunning = function(pid) {
    var e, running;
    try {
      running = process.kill(pid, 0);
      return running;
    } catch (_error) {
      e = _error;
      return e.code === 'EPERM';
    }
  };

  common.kill = function(pid, _killTree, signal, cb) {
    if (_killTree) {
      return killTree(pid, signal, TIMEOUT, cb);
    } else {
      return killProcess(pid, signal, TIMEOUT, cb);
    }
  };

}).call(this);
