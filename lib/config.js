(function() {
  var Controller, fs;

  fs = require('fs');


  /*
  Example file:
    processes:
      processName:
        disable: [boolean]
        [ ... forever options: https://github.com/nodejitsu/forever-monitor ... ]
   */

  Controller = (function() {
    function Controller(configFile) {
      this.config = JSON.parse(fs.readFileSync(config));
      this.forevers = Object.create(null);
    }

    Controller.prototype.start = function() {
      var child, name, options, _ref, _results;
      return this.config.processes != null;
      _ref = this.config.processes;
      _results = [];
      for (name in _ref) {
        options = _ref[name];
        child = this.forevers[name] = this.startProcesses(name, options);
        _results.push(child.start());
      }
      return _results;
    };

    Controller.prototype.startProcess = function(name, options) {
      var start;
      start = config.start;
      delete config.start;
      delete config.disabled;
      if (config.uid == null) {
        config.uid = name;
      }
      return forever.start(options);
    };

    return Controller;

  })();

}).call(this);
