module.exports = (grunt) ->
  grunt.loadNpmTasks('grunt-contrib-coffee')
  grunt.loadNpmTasks('grunt-contrib-watch')
  grunt.loadNpmTasks('grunt-contrib-less')
  grunt.registerTask('default', [ 'coffee:glob_to_multiple' ])

  grunt.initConfig
    watch:
      coffee_assets:
        files: [ "assets/js/*.coffee" ]
        tasks: 'coffee:compile'

      coffee_src:
        files: [ "src/**/*.coffee" ]
        tasks: 'coffee:glob_to_multiple'

    less:
      dev:
        files: "public/css/bootstrap.css": "assets/css/bootstrap/bootstrap.less"
           
    coffee:
      compile:
        files:
          "public/js/main.js": [ "assets/js/main.coffee" ]
          "public/js/tail.js": [ "assets/js/tail.coffee" ]

      glob_to_multiple:
        expand:  true
        flatten: true
        src:  [ './src/**/*.coffee' ],
        dest: 'lib/',
        ext:  '.js'
