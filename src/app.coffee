express = require 'express'
app     = express()
path    = require 'path'
http    = require 'http'
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

app.use(express.methodOverride())
app.use(express.logger())
app.set('view engine', 'jade')

app.use(express.static(__dirname + '/../public'))
app.use(express.errorHandler({ showStack: true, dumpExceptions: true }))

app.get '/', (req, res) ->
  res.render('index', { controller: controller })

app.post '/processes/:name/stop', (req, res) ->
  {name} = req.params
  controller.stop(name)
  res.json({})

app.post '/processes/:name/start', (req, res) ->
  {name} = req.params
  controller.start(name)
  res.json({})

app.post '/processes/:name/restart', (req, res) ->
  {name} = req.params
  controller.restart(name)
  res.json({})

app.get '/processes/:name/tail', (req, res) ->
  {name} = req.params
  res.render('tail', { name: name })


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
