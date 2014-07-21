path    = require 'path'
http    = require 'http'
express = require 'express'
morgan  = require 'morgan'
errorHandler   = require 'errorhandler'
methodOverride = require 'method-override'

app     = express()
server  = http.createServer(app)
io      = require('socket.io').listen(server)

app.locals.moment = require 'moment'
app.locals.os     = require 'os'

TAIL_TIMEOUT = 10000

parser     = require './config-parser'
Controller = require './controller'

configFile = process.argv[2] || {}
config     = parser.parse(configFile)
config.port ||= 5000

controller = new Controller(config)
controller.startAll()

process.env.NODE_ENV = 'development'


app.use(methodOverride())
app.use(morgan('combined'))
app.set('view engine', 'jade')
app.set('views', path.join(__dirname, '..', 'views'))

app.use(express.static(__dirname + '/../public'))
app.use(errorHandler())

app.get '/', (req, res) ->
  res.render('index', { controller: controller })

app.get '/status.json', (req, res) ->
  ret = { processes: {} }

  for name, proc of controller.processes
    running = !!proc.monitor.data?.running

    ret.processes[name] =
      pid:       proc.pid
      startTime: proc.startTime
      stopTime:  proc.stopTime
      errors:    controller.errors[name]
      isRunning: running

  res.json(ret)

app.post '/processes/:name/stop', (req, res, next) ->
  {name} = req.params
  controller.stop name, (err) ->
    return next(err) if err
    res.json({})

app.post '/processes/:name/start', (req, res) ->
  {name} = req.params
  controller.start(name)
  res.json({})

app.post '/processes/:name/restart', (req, res, next) ->
  {name} = req.params
  controller.restart name, (err) ->
    return next(err) if err
    res.json({})

app.get '/processes/:name', (req, res, next) ->
  {name} = req.params
  controller.getTree name, (err, children) ->
    return next(err) if err

    res.render('proc', { name: name, proc: controller.getProcess(name), children: children })

io.sockets.on 'connection', (socket) ->
  socket.on 'tail', (data) ->

    {name} = data
    monitor = controller.getProcess(name)?.monitor
    return unless monitor

    onOut = (o) -> socket.emit 'out', o.toString()
    onErr = (o) -> socket.emit 'err', o.toString()

    disconnected = false

    disconnect = ->
      return if disconnected

      clearTimeout(id)
      disconnected = true

      monitor.removeListener 'stdout', onOut
      monitor.removeListener 'stderr', onErr
      onOut = onErr = null

    id = setTimeout disconnect, TAIL_TIMEOUT

    monitor.on 'stdout', onOut
    monitor.on 'stderr', onErr
    socket.on 'disconnect', disconnect

server.listen(config.port)
