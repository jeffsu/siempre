(function() {
  var Controller, DEFAULTS, Monitor,
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  Monitor = require('forever-monitor').Monitor;

  DEFAULTS = {
    killTree: true
  };

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

    Controller.prototype.stopAll = function() {
      var forever, name, _ref, _results;
      _ref = this.processes;
      _results = [];
      for (name in _ref) {
        forever = _ref[name];
        if (forever.running) {
          _results.push(forever.stop());
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

    Controller.prototype.createProcess = function(name, options) {
      var monitor, process;
      monitor = this.createMonitor(name, options);
      process = {
        monitor: monitor,
        name: name,
        startTime: null,
        stopTime: null,
        error: null
      };
      monitor.on('error', function(err) {
        return process.error = err;
      });
      monitor.on('stop', function() {
        process.startTime = null;
        return process.stopTime = Date.now();
      });
      monitor.on('start', function() {
        process.stopTime = null;
        return process.startTime = Date.now();
      });
      return process;
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
