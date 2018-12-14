module.exports = function(grunt) {

  grunt.initConfig({

    watch: {
      js: {
        files: ['src/**/*.js'],
        tasks: ['babel'],
        options: {
          spawn: false,
        },
      },
    },

   babel: {
        options: {
            sourceMap: true,
            presets: ['es2015']
        },
        dist: {
            files: {
                'dist/dist.js': 'src/componentManager.js'
            }
        }
    }
  });

  grunt.loadNpmTasks('grunt-newer');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-babel');
  grunt.loadNpmTasks('grunt-browserify');

  grunt.registerTask('default', ['babel']);
};
