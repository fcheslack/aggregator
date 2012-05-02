var Log = require('log');
var log = new Log('debug');
var util = require('util');
var _ = require('underscore')._;
var argv = require('optimist').argv;
var async = require('async');
var brain = require('brain');
var fs = require('fs');

var infile=false, outfile=false, analysisProfile='default';
var aconf = {};
var scoreModules = [];
var net = new brain.NeuralNetwork();
var moduleList;

var loadProfile = function(profile){
    log.debug("loadProfile");
    if(!profile){
        return;
    }
    var profileObject = JSON.parse(fs.readFileSync(__dirname + '/../profiles/' + profile + '.json', 'utf8') );
    moduleList = profileObject.modules;

    log.debug("LoadProfile ModuleList:");
    log.debug(util.inspect(moduleList) );
};

var combineScores = function(scores){
    var brainscores = {};
    _.each(scores, function(score, ind){
        if(_.isArray(score)){
            _.each(score, function(subscore, subind){
                brainscores[subscore['name']] = subscore['score'];
            });
        }
        else{
            brainscores[score['name']] = score['score'];
        }
    });
    return brainscores;
};

var buildScoreCalls = function(input){
    log.debug("buildScoreCalls");
    var scoreModules = [];
    var here = this;
    log.debug('1');
    log.debug(util.inspect(moduleList) );
    _.each(moduleList, function(el, ind, here) {
        log.debug(util.inspect(el) );
        var module = require('../modules/' + el['name']);
        module.init(el['initArg']);
        scoreModules.push(module);
    });
    log.debug(util.inspect(scoreModules) );
    log.debug('2');
    var scoreCalls = [];
    _.each(scoreModules, function(am, ind){
        log.debug('3');
        log.debug(util.inspect(am) );
        var arg = '';
        switch(am.argtype){
            case 'fulltext':
                arg = input.fulltext;
                break;
            case 'url':
                arg = input.url;
                break;
        }
        log.debug('5');
        scoreCalls.push(async.apply(am.score, arg));
        log.debug('6');
    });
    
    log.debug("returning scoreCalls");
    return scoreCalls;
};

var runScoring = function(input, options, callback){
    log.debug("runscoring");
    if(typeof callback !== 'function'){
        throw "runScoring called without a callback function";
    }
    if(!options){
        options = {};
    }

    var scoreCalls = buildScoreCalls(input);
    log.debug(util.inspect(scoreCalls) );
    log.debug('calling scoreCalls in parallel');
    async.parallel(scoreCalls, function(err, results){
        if(err){
            log.debug("error running scoring functions.");
            log.debug(err);
        }
        callback(null, results);
    });
};

var loadBrainFromFile = function(name){
    net.fromJSON(fs.readFileSync('./neuralnets/' + name + '.json', 'utf8'));
};

var saveBrainToFile = function(name){
    fs.writeFileSync('./neuralnets/' + name + '.json', net.toJSON(), 'utf8');
};

var runBrain = function(scores){
    var brainscores = combineScores(scores);

    log.debug(util.inspect(brainscores) );
//    net.run(brainscores);
};

var init = function(profile){
    if(!profile){
        profile = 'default';
    }
    loadProfile(profile);

};

if(require.main === module){
    //run from the command line, not as an included module
    log.debug("running command line program");

    if(argv.infile){
        infile = argv.infile;
    }

    if(argv.outfile){
        outfile = argv.outfile;
    }

    if(argv.profile){
        analysisProfile = argv.profile;
    }

    
    var testInput = {
        fulltext: 'the quick brown fox jumped over the lazy dog.',
        url: 'http://test.url/id1234'
    };
    
    init(analysisProfile);

    runScoring(testInput, {}, function(err, results){
        log.debug(util.inspect(results) );
    });
    
}
else{
    exports.init = init;
    exports.runScoring = runScoring;
    exports.runBrain = runBrain;
}
