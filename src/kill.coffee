psTree   = require 'ps-tree'
common   = require 'forever-monitor/lib/forever-monitor/common'
async    = require 'async'
TIMEOUT  = 20000
WAIT     = 100
SIGKILL  = 'SIGKILL'


killTree = (pid, signal, timeout, done) ->
  psTree pid, (err, children) ->
    return done(err) if err

    pids = children.map (c) -> c.PID
    kill = (pid, cb) -> killProcess(pid, signal, timeout, cb)

    async.series [
      (cb) -> async.each(pids, kill, cb)
      (cb) -> kill(pid, cb)
    ], done

killProcess = (pid, signal, timeout, cb) ->
  return cb() unless common.checkProcess(pid)

  process.kill(pid, signal)
  start    = Date.now()
  running  = null
  timedOut = null

  test = ->
    running  = isRunning(pid)
    timedOut = timeout < (Date.now() - start)

    if timedOut && running
      return false
    else
      return running

  fn = (cb) -> setTimeout(cb, WAIT)

  async.whilst test, fn, (err) ->
    return cb(err) if err

    if running && signal != SIGKILL
      process.kill(pid, SIGKILL)
      setTimeout(cb, timeout)
    else
      cb(null, timedOut)

isRunning = (pid) ->
  try
    running = process.kill(pid, 0)
    return running
  catch e
    return e.code == 'EPERM'

common.kill = (pid, _killTree, signal, cb) ->
  if _killTree
    killTree(pid, signal, TIMEOUT, cb)
  else
    killProcess(pid, signal, TIMEOUT, cb)


