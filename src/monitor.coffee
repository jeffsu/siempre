{ Monitor } = require 'forever-monitor'

common = require 'forever-monitor/lib/forever-monitor/common'

# TODO
# Monitor::start = (cb) ->

Monitor::restart = (cb) ->
  @forceRestart = true
  @times = 0
  @kill(false, cb)

Monitor::stop = (cb) ->
  @kill(true, cb)

Monitor::kill = (forceStop, cb) ->
  self   = @
  child  = @child
  toKill = null
  timer  = null

  if !child || (!@running && !@forceRestart)
    process.nextTick ->
      err = new Error('Cannot stop process that is not running')
      if cb
        cb(err)
      else
        self.emit 'error', err

  else
    toKill = [@child.pid]

    if (forceStop)
      @forceStop = true

      if (@killTTL)
        timer = setTimeout (->
          toKill.forEach ->
            try
              process.kill(pid, 'SIGKILL')
            catch e
              # conditions for races may exist, this is most likely an ESRCH
              # these should be ignored, and then we should emit that it is dead

          self.emit('stop', self.childData)
        ), @killTTL

        child.on 'exit', -> clearTimeout(timer)

    common.kill @child.pid, @killTree, @killSignal, ->
      if !self.running
        # temp hack b/c it's already started from child on exit

        if !self.forceRestart
          self.emit('stop', self.childData)
        else
          self.start(true)

        cb()

  return @

module.exports = Monitor
