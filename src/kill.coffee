psTree   = require 'ps-tree'
common   = require 'forever-monitor/lib/forever-monitor/common'
async    = require 'async'


killTree = (pid, signal, timeout, done) ->
  psTree pid, (err, children) ->
    pids = children.map (c) -> c.PID
    kill = (pid, cb) -> killProcess(pid, signal, timeout, cb)

    async.series [
      (cb) -> async.each pids, kill, cb
      (cb) -> kill(pid, cb)
    ], done

killProcess = (pid, signal, timeout, cb) ->
  process.kill(pid, signal)
  start = Date.now()
  test  = ->
    running  = isRunning(pid)
    timedOut = (timeout > (Date.now() - start))

    if timedOut
      cb(null, 'timedout')
      clearInterval(id)

    else if !running
      cb(null)
      clearInterval(id)
 
  id = setInterval test, 200
  test()

  
isRunning = (pid) ->
  try
    running = process.kill(pid, 0)
    return running
  catch e
    return e.code == 'EPERM'

common.kill = (pid, _killTree, signal, cb) ->
  timeout = 1000

  if _killTree
    killTree(pid, signal, timeout, cb)
  else
    killProcess(pid, signal, timeout, cb)
  
   
