(function() {
  var Controller, DEFAULTS, Monitor, psTree,
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  Monitor = require('forever-monitor').Monitor;

  psTree = require('ps-tree');

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

    Controller.prototype.createProcess = function(name, options) {
      var monitor, proc;
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
