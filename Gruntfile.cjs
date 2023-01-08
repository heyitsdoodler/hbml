const fs = require("fs")

module.exports = function(grunt) {
	// Project configuration.
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		uglify: {
			options: {
				banner: '/*! <%= pkg.name %> <%= pkg.version %> <%= grunt.template.today("yyyy-mm-dd HH:MM") %> */\n'
			},
			build: {
				src: [
					'src/config_parser.js', 'src/constants.js', 'src/token.js', 'src/error.js',
					'src/reverse_web.js', 'src/parser/*.js'
				],
				dest: 'bundle/hbml_browser.min.js'
			}
		},
		"regex-replace": {
			default: {
				src: ['bundle/hbml_browser.min.js'],
				actions: [
					{
						name: "imports1",
						search: 'import [^ ]+ from"[^"]+";',
						replace: '',
						flags: 'g'
					},
					{
						name: "imports2",
						search: 'import\{[^}]+}from"[^"]+";',
						replace: '',
						flags: 'g'
					},
					{
						name: "exports",
						search: 'export\{[^}]+};',
						replace: 'export\{fullStringify,snippet,full\};',
						flags: 'g'
					}
				]
			}
		}
	});

	// Load the plugin that provides the "uglify" task.
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-regex-replace');

	// Default task(s).
	grunt.registerTask('default', ['uglify', 'regex-replace']);
};