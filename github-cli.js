#!/usr/bin/env node

(function(module, undefined){


    var GitHubApi = require('github'),

        program = require('commander'),

        extend = require('node.extend'),

        read = require('read'),

        addTemplateFiles = require('./async.js').addTemplateFiles,

        github = new GitHubApi({
            // required
            version: "3.0.0",
            // optional
            timeout: 5000
        }),

        config = {
            user: '',
            pass: ''
        },

        die = function(){
            console.error.apply(console, arguments);
            process.exit(1);
        },

        randomItem = function(arr){
            return arr[Math.round(Math.random() * (arr.length - 1))];
        },

        randomByeMsg = (function(){

            var msgs = [
                'Fine, be that way!',
                'Yeah? Well your mamma is uglier!',
                '>:P (This is the kind of "geek fun" I used to insert into my 8th grade shell program :))',
                'You had one task. Press "y". But noo...',
                'Please come again!',
                'Bye!',
                'Hai pa pa pa pa pa...',
                'bbui'
            ];

            return function(){
                return randomItem(msgs);
            }
        })(),

        sayBye = function(){
            console.log(randomByeMsg());
        },

        randomSuccessMsg = (function(){

            var msgs = [
               'Success!',
               'we\'ve done it again!',
               'Roll On!',
               'who\'s the man? You\'re the man!',
               'NEEEXT!'
            ];

            return function(){
                return randomItem(msgs);
            }
        })(),

        saySuccess = function(){
            console.log(randomSuccessMsg());
        },

        userUrl = function(user){
            return 'https://github.com/' + user;
        },

        teamUrl = function(teamId){
            return 'https://github.com/organizations/'+ config.account +'/teams/' + teamId;
        },

        cloneUrl = function(){
            return 'git@github.com:' + config.account + '/' + config.repoName + '.git';
        },

        handleErrorResponse = function(errorMsg){

            var error = JSON.parse(errorMsg.message);
            console.error('[ERROR] ', error.message);

            if(error.errors){
                console.error('Reasons:');
                error.errors.forEach(function(el, i){
                    console.error('    ', el.message || JSON.stringify(el));
                });
            }

            die();
        }


    var api = {
        _org: 'XivicSilver',


        _createDefaults: {
            auto_init: true
        },

        read: {
            _default: {
                callback: null,
                variable: 'user',
                silent: false,
                debug: true
            },
            _value: function(options, doNotStore){
                var settings = extend({}, this._defaults, options);

                read({ prompt: settings.prompt || settings.variable, silent: !!settings.silent }, function(er, input) {
                    if(settings.debug)
                        console.log('You entered: ', input, settings);

                    if(!doNotStore)
                        config[settings.variable] = input;

                    typeof settings.callback == 'function' && settings.callback();
                });
            },

            bool: function(msg, yes, no, complete){
                read({
                    prompt: msg + ' (y/N)'
                }, function(er, input){
                    var ok = input.toLowerCase() == 'y';
                    if(ok) {
                        typeof yes == 'function' && yes();
                    } else {
                        typeof no == 'function' && no();
                    }

                    typeof complete == 'function' && complete();
                })
            },

            user: function(){

                if(!config.user)
                    return api.read._value({
                        variable: 'user',
                        prompt: 'Username: ',
                        callback: api.read.pass
                    });

                return api.read.pass();
            },

            pass: function(){
                if(!config.pass)
                    return api.read._value({
                        variable: 'pass',
                        prompt: 'Password: ',
                        silent: true,
                        callback: api.read.action
                    });

                return api.read.action();
            },

            action: function(){
                var self = this;
                if(!config.action)
                    return this._value({
                        variable: 'action',
                        prompt: 'Action (create repo|create team|edit team|add member): ',
                        callback: api.doAction
                    });

                return api.doAction();
            }

        },

        doAction: function(){

            this.auth();

            switch(config.action) {
                case 'create repo':
                case 'cr':

                    var f = function(){

                        var o = {
                            name: config.repoName,
                            description: config.description,
                            private: config.private
                        };

                        if(config.account == api._org) {
                            config.organization = true;
                            o.org = config.account;
                        }

                        api.create(o, function(errorMsg, response){

                            if(errorMsg){
                                handleErrorResponse(errorMsg);
                            }

                            config.repo = response;

                            console.log('[SUCCESS]', 'the requested repository is available at: ');
                            console.log(response.html_url);
                            console.log('and can be cloned with this command:');
                            console.log('git clone ', cloneUrl());


                            api.read.bool('Do you want to add template files to the project?', function(){
                                api.read._value({
                                    prompt: 'enter the name of the template (defaults to "default-template"): ',
                                    variable: 'templateName',
                                    callback: function(){
                                        api.validateTemplateName();
                                        api.addTemplateToRepo(addColl);
                                    }
                                })
                            }, addColl);

                            function addColl(){
                                var collabMsg = config.organization ? 'Do you want to add a new team?' : 'Do you want to add a new collaborator?';

                                api.read.bool(collabMsg, function(){
                                    if(config.organization) {
                                        api.addTeam();
                                    } else {
                                        api.addCollaborator(function(){
                                            console.log('cuel!');
                                        });
                                    }
                                });
                            }

                        });
                    };

                    if(!config.description){
                        api.read._value({
                            variable: 'description',
                            prompt: 'Description (single line):',
                            callback: f
                        });
                    } else {
                        f();
                    }


                    break;

                case 'add collaborator':
                case 'collab':
                    api.addCollaborator(saySuccess);
                    break;

                case 'team':
                case 'create team':
                case 'ct':

                    api.read._value({
                        prompt: 'What rights should the team have? (push/pull/admin)',
                        variable: 'permission',
                        callback: function(){
                            config.permission = config.permission.toLowerCase();

                            if('pull push admin'.split(' ').indexOf(config.permission) == -1)
                                config.permission = 'pull';

                            api.createTeam({}, function(errorMsg, response){
                                if(errorMsg){
                                    handleErrorResponse(errorMsg);
                                }


                                config.team = response;

                                console.log('[SUCCESS] the "%s" team has been created (%s)', config.team.name, teamUrl(config.team.id));


                                api._addSingleTeamRepo(function(){
                                    api.read.bool('Do you want to add some members to the "'+ config.team.name +'" team?', function(){
                                        api.addToTeam(saySuccess);
                                    }, sayBye);
                                });

                            });
                        }
                    });

                    break;

                case 'teams':
                        github.orgs.getTeamRepos({id: '450714'}, function(){
                            console.log(arguments);
                        });
                    break;

                default:
                   die('invalid action provided: %s', config.action);
            }
        },

        create: function(o, callback){

            var settings = extend({}, api._createDefaults, o),
                method = settings.org ? 'createFromOrg' : 'create';

            try {
                github.repos[method](settings, callback);
            } catch(err) {
                die(err);
            }
        },

        auth: function(user, pass){
            try{
                github.authenticate({
                    type: 'basic',
                    username: user || config.user,
                    password: pass || config.pass
                });
            } catch(err) {
               die(err);
            }
        },

        addCollaborator: function(callback){

            function confirmation(){
                var l = config.collaborators.length,
                    megaCallback = function(){
                        if(--l == 0){
                            typeof callback == 'function' && callback();
                        }

                    }

                config.collaborators.forEach(function(el, i){
                    api._addSingleCollaborator(el, megaCallback);
                });
            }



            api.read._value({
                prompt: 'Collaborators (separated by space):',
                variable: 'collaboratorInput',
                callback: function(){
                    config.collaborators = config.collaboratorInput.trim().split(/(\t|\s)+/g).filter(function(el, i){
                        return !!el.trim();
                    });


                    console.log('You want to add the following users as collaborators for the "%s" repository:', config.repoName);

                    config.collaborators.forEach(function(el, i){
                        console.log('    - %s (%s)', el, userUrl(el));
                    });

                    api.read.bool('Do you want to continue?', confirmation, sayBye);
                }
            });
        },

        _addSingleCollaborator: function(name, callback){

            try{
                github.repos.addCollaborator({
                    repo: config.repoName,
                    user: config.user,
                    collabuser:  name
                },callback);
            } catch(err) {
                die(err);
            }
        },

        createTeam: function(o, callback){

            var settings = extend({
                org: config.account,
                name: config.teamName,
                repo_names: [config.repoName],
                permission: config.permission
            }, o);

            try{
                github.orgs.createTeam(settings, callback);
            } catch(err) {
                die(err);
            }
        },

        _addSingleTeamMember: function(name, callback){

            try{
                github.orgs.addTeamMember({
                    id: config.team.id,
                    user: name
                }, callback);
            } catch(err) {
                die(err);
            }
        },

        _addSingleTeamRepo: function(callback){

            var settings = {
                id: config.team.id,
                repo: config.repoName,
                user: config.account
            };

            console.log(settings);

            try{
                github.orgs.addTeamRepo(settings, callback);
            } catch(err) {
                die(err);
            }
        },

        addToTeam: function(callback){

            function confirmation(){
                var l = config.members.length,
                    megaCallback = function(){
                        if(--l == 0){
                            typeof callback == 'function' && callback();
                        }

                    }

                config.members.forEach(function(el, i){
                    api._addSingleTeamMember(el, megaCallback);
                });
            }



            api.read._value({
                prompt: 'Team members (separated by space):',
                variable: 'teamMembersInput',
                callback: function(){
                    config.members = config.teamMembersInput.trim().split(/(\t|\s)+/g).filter(function(el, i){
                        return !!el.trim();
                    });


                    console.log('You want to add the following users to the team "%s": ', config.teamName);

                    config.members.forEach(function(el, i){
                        console.log('    - %s (%s)', el, userUrl(el));
                    });

                    api.read.bool('Do you want to continue?', confirmation, sayBye);
                }
            });
        },

        addTeam: function(){
            api.read._value({
                variable: 'teamName',
                prompt: 'What would this team be called? ',
                callback: function(){
                    config.action = 'team';
                    api.doAction();
                }
            });
        },

        addTemplateToRepo: function(callback){
            var o = extend({}, config, {
                repoUrl: cloneUrl()
            });

            addTemplateFiles(o, callback);
        },

        validateTemplateName: (function(){
            var validTemplates = 'default-template'.split(' ');

            return function(){
                if(!config.templateName || validTemplates.indexOf(config.templateName) == -1) {
                    config.templateName = validTemplates[0];
                }
            }
        })()
    };






    var P = program
        .version('0.0.1')
        .option('-u, --user <string>', 'specify the github username', String)
        .option("-a, --account <string>", "Which account to use (defaults to XivicSilver)", String, api._org)
        .option("-p, --private [value]", "make account private (defaults to false)")
        .option('-o, --optional [value]', 'An optional value')


    P
       .command('help')
       .description('display verbose help')
       .action(function(){
          // output help here
          console.log('help!!!!!');
       });

    P
        .command('create [repoName]')
        .description('run setup commands for all envs')
        .action(function(repoName, options){

            config.action = 'cr';

            config.account = program.account;
            config.private = !!(program.p || program['private']);
            config.repoName = repoName;
            console.log('You want to create a new %s repo called "%s" in %s\'s account', (config.private ? 'PRIVATE' : 'PUBLIC'), config.repoName, config.account);

            api.read.bool('Continue?', function(){
                api.read.user();
            }, function(){
                console.log(randomByeMsg());
            });
        });

    P
        .command('collab [repoName]')
        .description('add collaborators for a certain repository')
        .action(function(repoName, options){

            config.action = 'collab';
            config.repoName = repoName;

            setTimeout(api.read.user);
        });


    P
        .command('team [teamName] [repoName]')
        .description('add collaborators for a certain repository')
        .action(function(teamName, repoName, options){

            extend(config, {
                action: 'team',
                repoName: repoName,
                teamName: teamName,
                account: program.account
            });

            setTimeout(api.read.user);
        });

    P
        .command('teams [repoName]')
        .description('add collaborators for a certain repository')
        .action(function(repoName, options){

            extend(config, {
                action: 'teams',
                repoName: repoName,
                account: program.account
            });

            setTimeout(api.read.user);
        });






    // extend the config with values from input
    for(var key in config){
        if(P[key] && typeof P[key] != 'function') {
    //        console.log(key, ' from ', config[key], ' to ', P[key] );
            config[key] = P[key];

        }
    }

    function init(){
        P.parse(process.argv);
    }

//    module.exports = init;

    init();
})(module);
