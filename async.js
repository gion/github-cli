#!/usr/bin/env node
(function(module, undefined){

	var sys = require('sys'),
		async = require('async'),
		exec = require('child_process').exec,
		extend = require('node.extend');

	function puts(error, stdout, stderr) { 
		console.log(arguments);
		sys.puts(stdout);
	}



	var config = {
		dirPath: '/var/www/test/github/',
		templatePath: 'template/',
		templateName: 'default-template',
		dirNamePrefix: 'temp-github-folder-',
		dirNameSufix: new Date().getTime(),
        commitMessage: 'added template files',

/*
		templateDir: templatePath + templateName,
		dirName: dirNamePrefix + dirNameSufix,
		templateDir: dirPath + 'template',
		dir: dirPath + dirName,
*/
		repoUrl: 'git@github.com:gion/test.git',
		user: 'gion',
		pass: '******'
		
	} ;

	function getCommands(){
		var commands = [
			{
				name: 'cleanDir',
				code: 'rm -rf ' + config.dirPath + config.dirNamePrefix + '*'	
			},
			{
				name: 'clone',
				code: 'git clone ' + config.repoUrl + ' ' + config.dir
			},
			{
				name: 'copy',
				code: 'cp -r ' + config.templateDir + '/. ' + config.dir + '/'
			},
			{
				name: 'add',
				code: 'git add ' + config.dir + '/.',
				options: {
					cwd: config.dir
				}
			},
			{
				name: 'commit',
				code: 'git commit -m "' + config.commitMessage + '"',
				options: {
					cwd: config.dir
				}
			},
			{
				name: 'push',
				code: 'git push',
				options: {
					cwd: config.dir
				}
			}
		];

		return commands;
	}


	function getActions(commands){
		var actions = [];

		commands.forEach(function(el, i, arr){
			actions.push(function(callback){
				var args = [el.code],
					cb = function(){
			//			console.log(el.name);
						callback(null, '#' + i + ': ' + el.name);
			//			puts.apply({}, arguments);
					};

				if(el.options) {
					args.push(el.options);
				}

				args.push(cb);

				exec.apply({}, args);
			});
		});

		return actions;
	}
	


	function init(settings, callback){
		extend(config, settings);

		extend(config, {
			dirName: config.dirNamePrefix + config.dirNameSufix,
			templateDir: config.dirPath + config.templatePath + config.templateName
		});

		extend(config, {
			dir: config.dirPath + config.dirName
		});

		async.series(getActions(getCommands()), callback);	
	}



	module.exports.addTemplateFiles = init;

})(module);