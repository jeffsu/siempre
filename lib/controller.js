(function() {
  var Controller, DEFAULTS, DOCKER_TIMEOUT, Monitor, NOOP, async, exec, fs, psTree,
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  fs = require('fs');

  Monitor = require('./monitor');

  psTree = require('ps-tree');

  async = require('async');

  exec = require('child_process').exec;

  require('./kill');

  NOOP = function() {};

  DOCKER_TIMEOUT = 10000;

  DEFAULTS = {
    killSignal: 'SIGTERM'
  };

  Controller = (function() {
    function Controller(config) {
      this.config = config;
      this.processes = Object.create(null);
      this.errors = {};
      process.on('SIGTERM', this.exit.bind(this));
      process.on('SIGINT', this.exit.bind(this));
    }

    Controller.prototype.exit = function() {
      var processes;
      processes = this.config.processes;
      return this.stopAll((function(_this) {
        return function() {
          var name, opts, terminate, toStop;
          toStop = (function() {
            var _results;
            _results = [];
            for (name in processes) {
              opts = processes[name];
              if (opts.docker) {
                _results.push(name);
              }
            }
            return _results;
          })();
          terminate = function(err) {
            if (err) {
              console.warn(err);
            }
            return process.exit(err ? 1 : 0);
          };
          async.each(toStop, _this.cleanDocker.bind(_this), terminate);
          return setTimeout((function() {
            return terminate('timeout');
          }), DOCKER_TIMEOUT);
        };
      })(this));
    };

    Controller.prototype.cleanDocker = function(name, cb) {
      return this.dockerCMD("stop", name, (function(_this) {
        return function(err, stdout) {
          if (err) {
            return cb();
          } else {
            return _this.dockerCMD("rm", name, function() {
              return cb();
            });
          }
        };
      })(this));
    };

    Controller.prototype.dockerCMD = function(cmd, name, cb) {
      var shell;
      shell = "docker " + cmd + " " + name;
      return exec(shell, function(err, stdout) {
        if (err) {
          return cb(err);
        } else {
          return cb(null, stdout.toString());
        }
      });
    };

    Controller.prototype.stop = function(name, cb) {
      var proc, _ref;
      proc = this.processes[name];
      if (proc != null ? (_ref = proc.monitor) != null ? _ref.running : void 0 : void 0) {
        return proc.monitor.stop(cb);
      } else {
        return cb();
      }
    };

    Controller.prototype.start = function(name, cb) {
      var opts, proc, _base;
      opts = this.config.processes[name];
      proc = (_base = this.processes)[name] || (_base[name] = this.createProcess(name, opts));
      if (opts.docker) {
        return this.cleanDocker(name, function(err) {
          if (err) {
            return cb(err);
          }
          if (!opts.disabled) {
            return proc.monitor.start(cb);
          } else {
            return cb();
          }
        });
      } else if (!opts.disabled) {
        return proc.monitor.start(cb);
      } else {
        return cb();
      }
    };

    Controller.prototype.restart = function(name, cb) {
      var _ref;
      return (_ref = this.processes[name]) != null ? _ref.monitor.restart(cb) : void 0;
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

    Controller.prototype.stopAll = function(cb) {
      if (cb == null) {
        cb = NOOP;
      }
      return async.each(Object.keys(this.processes), this.stop.bind(this), cb);
    };

    Controller.prototype.startAll = function(cb) {
      var procs;
      if (cb == null) {
        cb = NOOP;
      }
      if (!(procs = this.config.processes)) {
        return cb();
      }
      return async.each(Object.keys(procs), this.start.bind(this), cb);
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
      var err, errFile, monitor, out, outFile, proc, startProc, _ref;
      outFile = options.outFile, errFile = options.errFile;
      delete options.outFile;
      delete options.errFile;
      options.name = name;
      if (options.docker) {
        options = this.createDocker(options);
      }
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
      startProc = function() {
        proc.stopTime = null;
        return proc.startTime = Date.now();
      };
      monitor.on('start', startProc);
      monitor.on('restart', startProc);
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

    Controller.prototype.createDocker = function(options) {
      var command, dockerOpts, envName, envVal, envs, image, name, oldcmd, portMap, ports, volMap, volumes, _i, _j, _len, _len1;
      dockerOpts = options.docker, oldcmd = options.command, name = options.name, envs = options.env;
      if (typeof dockerOpts !== 'object') {
        return options;
      }
      image = dockerOpts.image, ports = dockerOpts.ports, volumes = dockerOpts.volumes;
      command = ['docker', 'run', '--rm', '--name', name];
      if (ports) {
        for (_i = 0, _len = ports.length; _i < _len; _i++) {
          portMap = ports[_i];
          command.push('-p');
          command.push(portMap);
        }
      }
      if (volumes) {
        for (_j = 0, _len1 = volumes.length; _j < _len1; _j++) {
          volMap = volumes[_j];
          command.push('-v');
          command.push(volMap);
        }
      }
      if (envs) {
        for (envName in envs) {
          envVal = envs[envName];
          if (envVal == null) {
            envVal = process.env[envName];
          }
          if (envVal == null) {
            continue;
          }
          command.push('-e');
          command.push("" + envName + "=" + envVal);
        }
      }
      command.push(image);
      Array.prototype.push.apply(command, oldcmd);
      options.command = command;
      return options;
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
