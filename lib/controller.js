(function() {
  var Controller, DEFAULTS, Monitor, fs, psTree,
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  fs = require('fs');

  Monitor = require('forever-monitor').Monitor;

  psTree = require('ps-tree');

  require('./kill');

  DEFAULTS = {};

  Controller = (function() {
    function Controller(config) {
      this.config = config;
      this.processes = Object.create(null);
      this.errors = {};
    }

    Controller.prototype.stop = function(name) {
      var _ref;
      return (_ref = this.processes[name]) != null ? _ref.monitor.stop() : void 0;
    };

    Controller.prototype.start = function(name) {
      var _ref;
      return (_ref = this.processes[name]) != null ? _ref.monitor.start() : void 0;
    };

    Controller.prototype.restart = function(name) {
      var _ref;
      return (_ref = this.processes[name]) != null ? _ref.monitor.restart() : void 0;
    };

    Controller.prototype.getProcess = function(name) {
      return this.processes[name];
    };

    Controller.prototype.getTree = function(name, cb) {
      var pid, _ref;
      pid = (_ref = this.processes[name]) != null ? _ref.monitor.data.pid : void 0;
      if (!pid) {
        return cb("Process '" + name + "' does not exist", null);
      }
      return psTree(pid, cb);
    };

    Controller.prototype.stopAll = function() {
      var name, proc, _ref, _results;
      _ref = this.processes;
      _results = [];
      for (name in _ref) {
        proc = _ref[name];
        if (proc.monitor.running) {
          _results.push(proc.monitor.stop());
        } else {
          _results.push(void 0);
        }
      }
      return _results;
    };

    Controller.prototype.startAll = function() {
      var errors, name, options, proc, _ref, _results;
      if (this.config.processes == null) {
        return;
      }
      errors = this.errors;
      _ref = this.config.processes;
      _results = [];
      for (name in _ref) {
        options = _ref[name];
        proc = this.processes[name] = this.createProcess(name, options);
        if (!options.disabled) {
          _results.push(proc.monitor.start());
        } else {
          _results.push(void 0);
        }
      }
      return _results;
    };

    Controller.prototype.attachLogs = function(monitor, outFile, errFile) {
      var err, flags, options, out;
      flags = monitor.append ? 'a+' : 'w+';
      options = {
        flags: flags,
        encoding: 'utf8',
        mode: "0644"
      };
      if (outFile) {
        out = fs.createWriteStream(outFile, options);
      }
      if (errFile) {
        err = fs.createWriteStream(errFile, options);
      }
      return [out, err];
    };

    Controller.prototype.createProcess = function(name, options) {
      var err, errFile, monitor, out, outFile, proc, _ref;
      outFile = options.outFile, errFile = options.errFile;
      delete options.outFile;
      delete options.errFile;
      monitor = this.createMonitor(name, options);
      proc = {
        monitor: monitor,
        name: name,
        startTime: null,
        stopTime: null,
        error: null
      };
      monitor.on('error', function(err) {
        return proc.error = err;
      });
      monitor.on('stop', function() {
        proc.startTime = null;
        return proc.stopTime = Date.now();
      });
      monitor.on('start', function() {
        proc.stopTime = null;
        return proc.startTime = Date.now();
      });
      _ref = this.attachLogs(monitor, outFile, errFile), out = _ref[0], err = _ref[1];
      if (out) {
        monitor.on('stdout', function(data) {
          return out.write(data);
        });
      }
      if (err) {
        monitor.on('stderr', function(data) {
          return err.write(data);
        });
      }
      proc.out = out;
      proc.err = err;
      return proc;
    };

    Controller.prototype.createMonitor = function(name, options) {
      var command, k, v;
      command = options.command;
      if (options.uid == null) {
        options.uid = name;
      }
      for (k in DEFAULTS) {
        v = DEFAULTS[k];
        if (__indexOf.call(options, k) < 0) {
          options[k] = v;
        }
      }
      return new Monitor(command, options);
    };

    return Controller;

  })();

  module.exports = Controller;

}).call(this);
