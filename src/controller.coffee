{Monitor} = require 'forever-monitor'
DEFAULTS =
  killTree: true

class Controller
  # TODO make this more robust
  # file, json or Object
  constructor: (@config) ->
    @processes = Object.create(null)
    @errors    = {}

  stop: (name) ->
    @processes[name]?.stop()

  start: (name) ->
    @processes[name]?.start()

  restart: (name) ->
    @processes[name]?.restart()

  getProcess: (name) ->
    @processes[name]

  stopAll: ->
    for name, forever of @processes
      if forever.running
        forever.stop()

  startAll: ->
    return unless @config.processes?
    errors = @errors

    for name, options of @config.processes
      do (name, options) =>
        child = @processes[name] = @createProcess(name, options)
        child.on 'error', (err) -> errors[name] = err

        unless options.disabled
          child.start()

  createProcess: (name, options) ->
    {command} = options
    options.uid ?= name

    for k, v of DEFAULTS
      options[k] = v unless k in options

    return new Monitor(command, options)

module.exports = Controller
