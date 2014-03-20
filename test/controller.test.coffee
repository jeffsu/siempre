should = require 'should'
async  = require 'async'

Controller = require '../lib/controller'
parser     = require '../lib/config-parser'

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
        i = 0
        for name, forever of controller.processes
          i++ if forever.running

        i.should.equal(1)

        controller.stopAll()
        setTimeout cb, 100

      (cb) ->
        i = 0
        for name, forever of controller.processes
          i++ if forever.running
        i.should.equal(0)
        cb()
    ], done
