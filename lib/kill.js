(function() {
  var SIGKILL, TIMEOUT, WAIT, async, common, isRunning, killProcess, killTree, psTree;

  psTree = require('ps-tree');

  common = require('forever-monitor/lib/forever-monitor/common');

  async = require('async');

  TIMEOUT = 5000;

  WAIT = 50;

  SIGKILL = 'SIGKILL';

  killTree = function(pid, signal, timeout, done) {
    return psTree(pid, function(err, children) {
      var kill, pids;
      if (err) {
        return done(err);
      }
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
    var fn, running, start, test, timedOut;
    if (!common.checkProcess(pid)) {
      return cb();
    }
    process.kill(pid, signal);
    start = Date.now();
    running = null;
    timedOut = null;
    test = function() {
      running = isRunning(pid);
      timedOut = timeout < (Date.now() - start);
      if (timedOut && running) {
        return false;
      } else {
        return running;
      }
    };
    fn = function(cb) {
      return setTimeout(cb, WAIT);
    };
    return async.whilst(test, fn, function(err) {
      if (err) {
        return cb(err);
      }
      if (running && signal !== SIGKILL) {
        process.kill(pid, SIGKILL);
        return setTimeout(cb, timeout);
      } else {
        return cb(null, timedOut);
      }
    });
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
