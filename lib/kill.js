(function() {
  var async, common, isRunning, killProcess, killTree, psTree;

  psTree = require('ps-tree');

  common = require('forever-monitor/lib/forever-monitor/common');

  async = require('async');

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
    var id, start, test;
    process.kill(pid, signal);
    start = Date.now();
    test = function() {
      var running, timedOut;
      running = isRunning(pid);
      timedOut = timeout > (Date.now() - start);
      if (timedOut) {
        cb(null, 'timedout');
        return clearInterval(id);
      } else if (!running) {
        cb(null);
        return clearInterval(id);
      }
    };
    id = setInterval(test, 200);
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
    var timeout;
    timeout = 1000;
    if (_killTree) {
      return killTree(pid, signal, timeout, cb);
    } else {
      return killProcess(pid, signal, timeout, cb);
    }
  };

}).call(this);
