should = require 'should'
async  = require 'async'

Controller = require '../lib/controller'
parser     = require '../lib/config-parser'

countRunning = (controller) ->
  n = 0
  for name, proc of controller.processes
    n++ if proc.monitor.data.running

  return n


describe "controller", (done) ->
  it 'should handle start and stop', (done) ->
    @timeout(10000)

    config     = parser.parse("./examples/test.yaml")
    controller = new Controller(config)

    async.series [
      (cb) ->
        controller.startAll()
        setTimeout cb, 1000

      (cb) ->
        countRunning(controller).should.equal(1)
        controller.stopAll()
        setTimeout cb, 100

      (cb) ->
        countRunning(controller).should.equal(0)
        cb()
    ], done

  it 'should handle start and stop of single process', (done) ->
    @timeout(10000)
    config     = parser.parse("./examples/test.yaml")
    controller = new Controller(config)

    async.series [
      (cb) ->
        controller.startAll()
        setTimeout cb, 1000

      (cb) ->
        countRunning(controller).should.equal(1)
        controller.start('helloDisabled')
        setTimeout cb, 100

      (cb) ->
        countRunning(controller).should.equal(2)
        controller.stop('helloDisabled')
        setTimeout cb, 100

      (cb) ->
        countRunning(controller).should.equal(1)
        setTimeout cb, 100

    ], done


