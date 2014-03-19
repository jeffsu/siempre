(function() {
  var Controller, TAIL_TIMEOUT, app, config, configFile, controller, express, http, io, parser, path, server;

  express = require('express');

  app = express();

  path = require('path');

  http = require('http');

  server = http.createServer(app);

  io = require('socket.io').listen(server);

  TAIL_TIMEOUT = 10000;

  parser = require('./config-parser');

  Controller = require('./controller');

  configFile = process.argv[2] || {};

  config = parser.parse(configFile);

  controller = new Controller(config);

  controller.startAll();

  process.env.NODE_ENV = 'development';

  app.use(express.methodOverride());

  app.use(express.logger());

  app.set('view engine', 'jade');

  app.use(express["static"](__dirname + '/../public'));

  app.use(express.errorHandler({
    showStack: true,
    dumpExceptions: true
  }));

  app.get('/', function(req, res) {
    return res.render('index', {
      controller: controller
    });
  });

  app.post('/processes/:name/stop', function(req, res) {
    var name;
    name = req.params.name;
    controller.stop(name);
    return res.json({});
  });

  app.post('/processes/:name/start', function(req, res) {
    var name;
    name = req.params.name;
    controller.start(name);
    return res.json({});
  });

  app.post('/processes/:name/restart', function(req, res) {
    var name;
    name = req.params.name;
    controller.restart(name);
    return res.json({});
  });

  app.get('/processes/:name/tail', function(req, res) {
    var name;
    name = req.params.name;
    return res.render('tail', {
      name: name
    });
  });

  io.sockets.on('connection', function(socket) {
    return socket.on('tail', function(data) {
      var disconnect, disconnected, err, id, name, out, proc;
      name = data.name;
      proc = controller.getProcess(name);
      if (!proc) {
        return;
      }
      out = function(o) {
        return socket.emit('out', o.toString());
      };
      err = function(o) {
        return socket.emit('err', o.toString());
      };
      disconnected = false;
      disconnect = function() {
        if (disconnected) {
          return;
        }
        clearTimeout(id);
        disconnected = true;
        proc.removeListener('stdout', out);
        proc.removeListener('stderr', err);
        return out = err = null;
      };
      id = setTimeout(disconnect, TAIL_TIMEOUT);
      proc.on('stdout', out);
      proc.on('stderr', err);
      return socket.on('disconnect', disconnect);
    });
  });

  server.listen(config.port || 5000);

}).call(this);
