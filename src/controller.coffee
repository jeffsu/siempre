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
    @processes[name]?.monitor.stop()

  start: (name) ->
    @processes[name]?.monitor.start()

  restart: (name) ->
    @processes[name]?.monitor.restart()

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
      proc = @processes[name] = @createProcess(name, options)
      proc.monitor.start() unless options.disabled

  createProcess: (name, options) ->
    monitor = @createMonitor(name, options)
    process =
      monitor:   monitor
      name:      name
      startTime: null
      stopTime:  null
      error:     null

    monitor.on 'error', (err) -> process.error = err
    monitor.on 'stop',  ->
      process.startTime = null
      process.stopTime  = Date.now()

    monitor.on 'start', ->
      process.stopTime  = null
      process.startTime = Date.now()

    return process

  createMonitor: (name, options) ->
    {command} = options
    options.uid ?= name

    for k, v of DEFAULTS
      options[k] = v unless k in options

    return new Monitor(command, options)

module.exports = Controller
