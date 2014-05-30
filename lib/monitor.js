(function() {
  var Monitor, common;

  Monitor = require('forever-monitor').Monitor;

  common = require('forever-monitor/lib/forever-monitor/common');

  Monitor.prototype.kill = function(forceStop) {
    var child, self, timer, toKill;
    self = this;
    child = this.child;
    toKill = null;
    timer = null;
    if (!child || (!this.running && !this.forceRestart)) {
      process.nextTick(function() {
        return self.emit('error', new Error('Cannot stop process that is not running'));
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
          }
          if (self.forceRestart) {
            return self.start(true);
          }
        }
      });
    }
    return this;
  };

  module.exports = Monitor;

}).call(this);
