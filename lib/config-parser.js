(function() {
  var fs, yaml;

  fs = require('fs');

  yaml = require('js-yaml');


  /*
  Example file:
    processes:
      processName:
        command: [ "tail", "-f", "log/file" ]
        [ ... forever options: https://github.com/nodejitsu/forever-monitor ... ]
   */

  module.exports = {
    parse: function(configFile) {
      var data;
      if (typeof configFile === 'object') {
        return configFile;
      }
      if (configFile.match(/^\s*\{/)) {
        return JSON.parse(configFile);
      } else {
        data = fs.readFileSync(configFile, 'utf8');
        if (configFile.match(/\.ya?ml$/)) {
          return yaml.safeLoad(data);
        } else {
          return JSON.parse(data);
        }
      }
    }
  };

}).call(this);
