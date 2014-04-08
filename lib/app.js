(function() {
  var Controller, TAIL_TIMEOUT, app, config, configFile, controller, express, http, io, parser, path, server;

  express = require('express');

  app = express();

  path = require('path');

  http = require('http');

  server = http.createServer(app);

  io = require('socket.io').listen(server);

  app.locals.moment = require('moment');

  app.locals.os = require('os');

  TAIL_TIMEOUT = 10000;

  parser = require('./config-parser');

  Controller = require('./controller');

  configFile = process.argv[2] || {};

  config = parser.parse(configFile);

  config.port || (config.port = 5000);

  controller = new Controller(config);

  controller.startAll();

  process.env.NODE_ENV = 'development';

  app.use(express.methodOverride());

  app.use(express.logger());

  app.set('view engine', 'jade');

  app.set('views', path.join(__dirname, '..', 'views'));

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

  app.get('/status.json', function(req, res) {
    var name, proc, ret, running, _ref, _ref1;
    ret = {
      processes: {}
    };
    _ref = controller.processes;
    for (name in _ref) {
      proc = _ref[name];
      running = !!((_ref1 = proc.monitor.data) != null ? _ref1.running : void 0);
      ret.processes[name] = {
        pid: proc.pid,
        startTime: proc.startTime,
        stopTime: proc.stopTime,
        errors: controller.errors[name],
        isRunning: running
      };
    }
    return res.json(ret);
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

  app.get('/processes/:name', function(req, res, next) {
    var name;
    name = req.params.name;
    return controller.getTree(name, function(err, children) {
      if (err) {
        return next(err);
      }
      return res.render('proc', {
        name: name,
        proc: controller.getProcess(name),
        children: children
      });
    });
  });

  io.sockets.on('connection', function(socket) {
    return socket.on('tail', function(data) {
      var disconnect, disconnected, id, monitor, name, onErr, onOut, _ref;
      name = data.name;
      monitor = (_ref = controller.getProcess(name)) != null ? _ref.monitor : void 0;
      if (!monitor) {
        return;
      }
      onOut = function(o) {
        return socket.emit('out', o.toString());
      };
      onErr = function(o) {
        return socket.emit('err', o.toString());
      };
      disconnected = false;
      disconnect = function() {
        if (disconnected) {
          return;
        }
        clearTimeout(id);
        disconnected = true;
        monitor.removeListener('stdout', onOut);
        monitor.removeListener('stderr', onErr);
        return onOut = onErr = null;
      };
      id = setTimeout(disconnect, TAIL_TIMEOUT);
      monitor.on('stdout', onOut);
      monitor.on('stderr', onErr);
      return socket.on('disconnect', disconnect);
    });
  });

  server.listen(config.port);

}).call(this);
