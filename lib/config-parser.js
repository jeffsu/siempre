(function() {
  var fs, main, path, yaml;

  fs = require('fs');

  yaml = require('js-yaml');

  path = require('path');


  /*
  Example file:
    processes:
      processName:
        command: [ "tail", "-f", "log/file" ]
        [ ... forever options: https://github.com/nodejitsu/forever-monitor ... ]
   */

  main = module.exports = {
    parse: function(configFile) {
      var data;
      if (typeof configFile === 'object') {
        return configFile;
      }
      if (configFile.match(/^\s*\{/)) {
        return JSON.parse(configFile);
      } else {
        if (configFile.match(/\.ya?ml$/)) {
          data = fs.readFileSync(configFile, 'utf8');
          return yaml.safeLoad(data);
        } else if (configFile.match(/\.json$/)) {
          data = fs.readFileSync(configFile, 'utf8');
          return JSON.parse(data);
        } else {
          return main.parseFolder(configFile);
        }
      }
    },
    parseFolder: function(dir) {
      var config, f, files, k, ret, v, _i, _len, _ref;
      files = fs.readdirSync(dir).filter(function(f) {
        return f.match(/\.(ya?ml|json)$/);
      }).map(function(f) {
        return path.join(dir, f);
      });
      ret = {
        processes: {}
      };
      for (_i = 0, _len = files.length; _i < _len; _i++) {
        f = files[_i];
        config = main.parse(f);
        for (k in config) {
          v = config[k];
          if (k === 'processes') {
            continue;
          }
          if (ret[k]) {
            console.warn("WARN: " + k + " already included in another config file");
          } else {
            ret[k] = v;
          }
        }
        _ref = config.processes;
        for (k in _ref) {
          v = _ref[k];
          if (ret.processes[k]) {
            console.warn("WARN: " + k + " already included in another config file");
          } else {
            ret.processes[k] = v;
          }
        }
      }
      return ret;
    }
  };

}).call(this);
