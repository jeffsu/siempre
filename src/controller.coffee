fs        = require 'fs'
{Monitor} = require 'forever-monitor'
psTree    = require 'ps-tree'
require './kill'

DEFAULTS = {}

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

  getTree: (name, cb) ->
    pid = @processes[name]?.monitor.data.pid
    return cb("Process '#{name}' does not exist", null) unless pid
    psTree(pid, cb)

  stopAll: ->
    for name, proc of @processes
      if proc.monitor.running
        proc.monitor.stop()

  startAll: ->
    return unless @config.processes?
    errors = @errors

    for name, options of @config.processes
      proc = @processes[name] = @createProcess(name, options)
      proc.monitor.start() unless options.disabled

  attachLogs: (monitor, outFile, errFile) ->
    flags = if monitor.append then 'a+' else 'w+'
    options = { flags, encoding: 'utf8', mode: "0644" }

    if outFile
      out = fs.createWriteStream outFile, options

    if errFile
      err = fs.createWriteStream errFile, options

    return [ out, err ]
    

  createProcess: (name, options) ->

    {outFile, errFile} = options

    delete options.outFile
    delete options.errFile

    monitor = @createMonitor(name, options)

    proc =
      monitor:   monitor
      name:      name
      startTime: null
      stopTime:  null
      error:     null

    monitor.on 'error', (err) -> proc.error = err
    monitor.on 'stop',  ->
      proc.startTime = null
      proc.stopTime  = Date.now()

    startProc = ->
      proc.stopTime  = null
      proc.startTime = Date.now()

    monitor.on 'start',   startProc
    monitor.on 'restart', startProc

    [out, err] = @attachLogs(monitor, outFile, errFile)

    if out
      monitor.on 'stdout', (data) -> out.write(data)

    if err
      monitor.on 'stderr', (data) -> err.write(data)

    proc.out = out
    proc.err = err

    return proc

  createMonitor: (name, options) ->
    {command} = options
    options.uid ?= name

    for k, v of DEFAULTS
      options[k] = v unless k in options

    return new Monitor(command, options)

module.exports = Controller
