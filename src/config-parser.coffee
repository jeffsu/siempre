fs    = require 'fs'
yaml  = require 'js-yaml'
path  = require 'path'

###
Example file:
  processes:
    processName:
      command: [ "tail", "-f", "log/file" ]
      [ ... forever options: https://github.com/nodejitsu/forever-monitor ... ]
###
main = module.exports =
  parse: (configFile) ->
    if typeof configFile == 'object'
      return configFile

    if configFile.match(/^\s*\{/)
      return JSON.parse(configFile)

    else
      if configFile.match(/\.ya?ml$/)
        data = fs.readFileSync(configFile, 'utf8')
        return yaml.safeLoad(data)
      else if configFile.match(/\.json$/)
        data = fs.readFileSync(configFile, 'utf8')
        return JSON.parse(data)
      else
        main.parseFolder(configFile)

  parseFolder: (dir) ->
    files = fs.readdirSync(dir)
      .filter((f) -> f.match(/\.(ya?ml|json)$/))
      .map((f) -> path.join(dir, f))

    ret = { processes: {} }

    for f in files
      config = main.parse(f)

      for k, v of config
        continue if k == 'processes'
        if ret[k]
          console.warn "WARN: #{k} already included in another config file"
        else
          ret[k] = v

      for k, v of config.processes
        if ret.processes[k]
          console.warn "WARN: #{k} already included in another config file"
        else
          ret.processes[k] = v

    return ret

     


