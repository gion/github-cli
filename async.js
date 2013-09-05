#!/usr/bin/env node
(function(){

	var sys = require('sys'),
		async = require('async'),
		exec = require('child_process').exec;

	function puts(error, stdout, stderr) { 
		console.log(arguments);
		sys.puts(stdout);
	}

	var 
		dirPath = '/var/www/test/github/',
		dirNamePrefix = 'temp-github-folder-',
		dirName = dirNamePrefix + new Date().getTime(),
		templateDir = dirPath + 'template',
		dir = dirPath + dirName,

		repo = 'git@github.com:gion/test.git',
		user = 'gion',
		pass = 'Lifeisgood13',
		commitMessage = 'added template files';

/*
	exec("mkdir " + dir, puts);
	exec("cd " + dir, puts);
	exec("ls -alh", puts);
*/
/*	exec("rm -r " + dirPath + '/*', puts);

	exec('git clone ' + repo + ' ' + dir, puts);*/

	var commands = [
		{
			name: 'cleanDir',
			code: 'rm -rf ' + dirPath + dirNamePrefix + '*'	
		},
		{
			name: 'clone',
			code: 'git clone ' + repo + ' ' + dir
		},
		{
			name: 'copy',
			code: 'cp -r ' + templateDir + '/* ' + dir + '/'
		},
		{
			name: 'add',
			code: 'git add .'
		},
		{
			name: 'commit',
			code: 'git commit -m "' + commitMessage + '"'
		},
		{
			name: 'push',
			code: 'git push'
		}
	];

	var actions = [];

	commands.forEach(function(el, i, arr){
		actions.push(function(callback){
			exec(el.code, function(){
				callback(null, '#' + i + ': ' + el.name);
				puts.apply({}, arguments);
			});
		});
	});

	console.log(commands);

	async.series(actions);

})();