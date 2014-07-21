fs      = require 'fs'
Monitor = require './monitor'
psTree  = require 'ps-tree'
async   = require 'async'
exec    = require('child_process').exec
require './kill'


NOOP = ->

DOCKER_TIMEOUT = 10000
DEFAULTS =
  killSignal: 'SIGTERM'

class Controller
  # TODO make this more robust
  # file, json or Object
  constructor: (@config) ->
    @processes = Object.create(null)
    @errors    = {}

    process.on 'SIGTERM', @exit.bind(@)
    process.on 'SIGINT',  @exit.bind(@)

  exit: ->
    { processes } = @config

    @stopAll =>
      toStop = (name for name, opts of processes when opts.docker)

      terminate = (err) ->
        console.warn(err) if err
        process.exit(if err then 1 else 0)

      async.each(toStop, @cleanDocker.bind(@), terminate)
      setTimeout((-> terminate('timeout')), DOCKER_TIMEOUT)

  cleanDocker: (name, cb) ->
    @dockerCMD "stop", name, (err, stdout) =>
      if err
        cb()
      else
        @dockerCMD "rm", name, -> cb()

  dockerCMD: (cmd, name, cb) ->
    shell = "docker #{cmd} #{name}"
    exec shell, (err, stdout) ->
      if err
        cb(err)
      else
        cb(null, stdout.toString())

  stop: (name, cb) ->
    proc = @processes[name]
    if proc?.monitor?.running
        proc.monitor.stop(cb)
    else
      cb()

  start: (name, cb) ->
    opts = @config.processes[name]
    proc = @processes[name] ||= @createProcess(name, opts)

    if opts.docker
      @cleanDocker name, (err) ->
        return cb(err) if err

        if !opts.disabled
          proc.monitor.start(cb)
        else
          cb()

    else if !opts.disabled
      proc.monitor.start(cb)

    else
      cb()

  restart: (name, cb) ->
    @processes[name]?.monitor.restart(cb)

  getProcess: (name) ->
    @processes[name]

  getTree: (name, cb) ->
    pid = @processes[name]?.monitor.data.pid
    return cb("Process '#{name}' does not exist", null) unless pid
    psTree(pid, cb)

  stopAll: (cb=NOOP) ->
    async.each(Object.keys(@processes), @stop.bind(@), cb)

  startAll: (cb=NOOP) ->
    return cb() unless procs=@config.processes
    async.each(Object.keys(procs), @start.bind(@), cb)

  attachLogs: (monitor, outFile, errFile) ->
    flags = if monitor.append then 'a+' else 'w+'
    options = { flags, encoding: 'utf8', mode: "0644" }

    if outFile
      out = fs.createWriteStream outFile, options

    if errFile
      err = fs.createWriteStream errFile, options

    return [ out, err ]


  createProcess: (name, options) ->
    { outFile, errFile } = options

    delete options.outFile
    delete options.errFile
    options.name = name

    options = @createDocker(options) if options.docker

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

  # TODO see why && isnt working
  createDocker: (options) ->
    { docker: dockerOpts, command: oldcmd, name, env: envs } = options
    return options unless typeof dockerOpts == 'object'

    { image, ports, volumes } = dockerOpts
    command = ['docker', 'run', '--rm', '--name', name]

    if ports
      for portMap in ports
        command.push('-p')
        command.push(portMap)

    if volumes
      for volMap in volumes
        command.push('-v')
        command.push(volMap)

    if envs
      for envName, envVal of envs
        command.push('-e')
        command.push("#{envName}=#{envVal}")

    command.push(image)

    Array::push.apply(command, oldcmd)
    options.command = command
    return options

  createMonitor: (name, options) ->
    {command} = options
    options.uid ?= name

    for k, v of DEFAULTS
      options[k] = v unless k in options

    return new Monitor(command, options)

module.exports = Controller
