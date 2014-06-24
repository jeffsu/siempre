(function() {
  var Monitor, common;

  Monitor = require('forever-monitor').Monitor;

  common = require('forever-monitor/lib/forever-monitor/common');

  Monitor.prototype.restart = function(cb) {
    this.forceRestart = true;
    this.times = 0;
    return this.kill(false, cb);
  };

  Monitor.prototype.stop = function(cb) {
    return this.kill(true, cb);
  };

  Monitor.prototype.kill = function(forceStop, cb) {
    var child, self, timer, toKill;
    self = this;
    child = this.child;
    toKill = null;
    timer = null;
    if (!child || (!this.running && !this.forceRestart)) {
      process.nextTick(function() {
        var err;
        err = new Error('Cannot stop process that is not running');
        if (cb) {
          return cb(err);
        } else {
          return self.emit('error', err);
        }
      });
    } else {
      toKill = [this.child.pid];
      if (forceStop) {
        this.forceStop = true;
        if (this.killTTL) {
          timer = setTimeout((function() {
            toKill.forEach(function() {
              var e;
              try {
                return process.kill(pid, 'SIGKILL');
              } catch (_error) {
                e = _error;
              }
            });
            return self.emit('stop', self.childData);
          }), this.killTTL);
          child.on('exit', function() {
            return clearTimeout(timer);
          });
        }
      }
      common.kill(this.child.pid, this.killTree, this.killSignal, function() {
        if (!self.running) {
          if (!self.forceRestart) {
            self.emit('stop', self.childData);
          } else {
            self.start(true);
          }
        }
        if (cb) {
          return cb();
        }
      });
    }
    return this;
  };

  module.exports = Monitor;

}).call(this);
