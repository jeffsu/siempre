express = require 'express'
app     = express()
path    = require 'path'
http    = require 'http'
server  = http.createServer(app)
io      = require('socket.io').listen(server)

TAIL_TIMEOUT = 10000

parser     = require './config-parser'
Controller = require './controller'

configFile = process.argv[2] || {}
config     = parser.parse(configFile)

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
    proc = controller.getProcess(name)
    return unless proc

    out = (o) -> socket.emit 'out', o.toString()
    err = (o) -> socket.emit 'err', o.toString()

    disconnected = false

    disconnect = ->
      return if disconnected

      clearTimeout(id)
      disconnected = true

      proc.removeListener 'stdout', out
      proc.removeListener 'stderr', err
      out = err = null

    id = setTimeout disconnect, TAIL_TIMEOUT

    proc.on 'stdout', out
    proc.on 'stderr', err
    socket.on 'disconnect', disconnect


server.listen(config.port || 5000)
