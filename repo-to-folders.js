#!/usr/bin/env node
(function(module, undefined){

	var sys = require('sys'),
		async = require('async'),
        exec = require('child_process').exec,
        execSync = require('exec-sync'),
		fs = require('fs'),
		extend = require('node.extend');

	function puts(error, stdout, stderr) {
		console.log(arguments);
		sys.puts(stdout);
	}



	var config = {
		dirPath: __dirname + '/temp/',
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




    var api = {

        cleanUp: function(callback) {
            return exec2('rm -rf ' + config.dirPath + config.dirNamePrefix + '*', callback);
        },

        clone: function(repoUrl, dir, callback) {

            dir = dir || '';
            var command = 'git clone ' + repoUrl + ' ' + dir;

            return exec2(command, callback);
        },
        checkout: function(branchName, callback) {

            var command = 'git checkout ' + branchName;

            return exec2(command, callback);
        },

        cd: function(dir, callback) {
            return exec2('cd ' + dir, callback);
        },

        makeDir: function(dirName, callback) {
            return exec2('mkdir ' + dirName, callback);
        },

        removeDir: function(dirName, callback) {
            return exec2('rm -rf ' + dirName, callback);
        },

        copyDir: function(from, to, callback) {

            var command = 'cp -r ' + from + ' ' + to;

            return exec2(command, callback);
        },

        exec: function(command, callback) {
            return exec2(command, callback);
        }
    };

    function exec2(cmd, callback) {
        console.log(arguments[0]);
        var args = arguments,
            fn = sync ? execSync : exec,
            c = args[1] = function(success){
            console.log('--- done', args[0]);
            callback && callback();
            success && success();
        }
        return function(complete) {
        //    exec.apply({}, args);
            console.log('#### before', args[0]);
            exec(cmd, {}, function(){c(complete);});
        }
    }

    function sanitize (input, replacement) {
        replacement = replacement || '-';
        return input.toString().replace(/[\s\.\,\|\\\/\-\_\?\*\)\(\&\^\%\$\#\@\!]/g, replacement);
    };
    function getMagicCommands(repoUrl, dirPath, branches) {

        var tempRoot = config.dir,
            tempDirName = tempRoot + '/temp',
            branchesRoot = tempRoot + '/branches',
            magicGitFlags = ' --work-tree='+ tempDirName +' --git-dir='+ tempDirName +'/.git ',
            magic = [
                {
                    name: 'whoami',
                    code: 'whoami'
                },
/*                {
                    name: 'change chmod',
                    code: 'chmod -R 777 ' + config.dirPath.replace(/(\/|\\)?$/,'')
                },*/
                {
                    name: 'cleanDir',
                    code: 'rm -rf ' + config.dirPath + config.dirNamePrefix + '*'
                },
                {
                    name: 'mkdir main',
                    code: 'mkdir ' + tempRoot
                },
                {
                    name: 'mkdir branches',
                    code: 'mkdir ' + branchesRoot
                },
                {
                    name: 'mkdir temp',
                    code: 'mkdir ' + tempDirName
                },
                {
                    name: 'clone',
                    code: 'git clone ' + config.repoUrl + ' ' + tempDirName
                },
                {
                    name: 'cd to git dir',
                    code: 'cd ' + tempDirName
                },
                {
                    name: 'git pull magic',
                    code: 'git '+ magicGitFlags +' pull'
                }
            ];



        branches.forEach(function(el, i) {
            var branchName = sanitize(el.name),
                branchDir = branchesRoot + '/' + branchName;

            magic.push({
                name: 'checkout branch: ' + branchName + ' (from '+ el.name +')',
                code: 'git '+ magicGitFlags +' checkout ' + el.name
            });

             magic.push({
                name: 'map branch ' + el.name + ' to origin',
                code: 'git  '+ magicGitFlags +'  branch --set-upstream-to=origin/'+ el.name
            //    code: 'git  '+ magicGitFlags +'  branch --set-upstream origin/'+ el.name
            });

            magic.push({
                name: 'pull',
                code: 'git '+ magicGitFlags +'  pull'
            });

            magic.push({
                name: 'mkdir branch: ' + branchName,
                code: 'mkdir ' + branchDir
            });

            magic.push({
                name: 'copy branch dir: ' + branchName,
                code: 'cp -r ' + tempDirName + '/* ' + branchDir
            });
        });

        magic.push({
            name: '[branches deploy] make the branches dir if it doesn\'t exist',
            code: 'mkdir -p ' + config.branchRoot
        });

        magic.push({
            name: '[branches deploy] backup existing branches',
            code: 'mv ' + config.branchRoot + ' ' + config.branchRoot + '-bk-' + new Date().getTime()
        });

        magic.push({
            name: '[branches deploy] cleanup',
            code: 'rm -rf ' + config.branchRoot
        });

        magic.push({
            name: '[branches deploy] copy branches',
            code: 'cp -r ' + branchesRoot + ' ' + config.branchRoot
        });




        return magic;
    }

    function getBranchesIndexHtml(branches){
        var branchesIndexHtml = '',
            repoUrl = config.repoUrl;

        branchesIndexHtml += '<h1>branches for this project</h1>';
        branchesIndexHtml += '<h2>github repo: <a href="'+ repoUrl +'" target="_blank">'+ repoUrl +'</a></h2>';
        branchesIndexHtml += '<h4>deployed branches list:</h4>';
        branchesIndexHtml += '<ul>';

        branches.forEach(function(el ,i) {
            branchesIndexHtml += '<li>';
            branchesIndexHtml += '<a href="' + sanitize(el.name) + '" >' + el.name + '</a>';
            branchesIndexHtml += '</li>';
        });

        branchesIndexHtml += '</ul>';

        return branchesIndexHtml;
    }

	function getActions(commands){
		var actions = [];

		commands.forEach(function(el, i, arr){
			actions.push(function(callback){
				var args = [el.code],
					cb = function(){
                        console.log(arguments);
                        console.log(el.code);
						callback(null, '#' + i + ': ' + el.name);
					};

				if(el.options) {
					args.push(el.options);
				}

				args.push(cb);

                function go(){
    				exec.apply({}, args);
                }

                if(el.timeout) {
                    setTimeout(go, el.timeout);
                } else {
                    go();
                }
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


        if(typeof callback == 'function') {
            callback();
        }
	}



    module.exports.addTemplateFiles = function(settings, callback) {
        return init(settings, function() {
            async.series(getActions(getCommands()), callback);
        })
    };

	module.exports.magic = function(settings, branches, callback) {
        return init(settings, function(repoUrl) {
            console.log(config);

            async.series(getActions(getMagicCommands(config.repoUrl, config.dirName, branches)), function(){
                var html = getBranchesIndexHtml(branches);
                fs.writeFile(config.branchRoot + '/index.html', html, function(err) {
                    if(err) {
                        console.log(err);
                    } else {
                        console.log("The file was saved!");
                    }
                    callback && callback();
                });

            });
        });

    };

    var sync = false;

})(module);
