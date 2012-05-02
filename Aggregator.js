//aggregrator
var _ = require('underscore')._;
var async = require('async');
var fs = require('fs');
var winston = require('winston');
winston.add(winston.transports.File, {filename: 'logs/aggre.log'});

//var fbu = require('./lib/utils.js');
var fbu = require('./lib/couchstore.js');
var stemwordprocessor = require('./modules/stemwords.js');
var wcount = require('./modules/wcount.js');
var keywords = require('./modules/keywords.js');

var rl = require('readline');

var FeedImport = require('./FeedImport.js');

var argv = require('optimist')
    //.usage('Usage: $0 --track=hashtag --db=DBName')
    //.demand(['track', 'db'])
    .argv;


var config = {
    preprocessFunctions:[FeedImport.makeReadable],//[stemwordprocessor.process],
    scoreFunctions:[wcount.score, keywords.score],
    classifyFunctions:[]
};

var feeds = JSON.parse(fs.readFileSync('./conf/feedsources.json');


//var registry = [];

var registerSource = function (){
    
};


var processDoc = function(error, doc){
    if(error){
        winston.err(error);
        return;
    }
    
    async.series([
        //preprocess
        async.apply(preprocess, doc),
        
        //score
        async.apply(score, doc),
        
        //classify
        async.apply(classify, doc)
        
    ],
    
    function(err, results){
        //save
        if(err){
            winston.info("processDoc series returned with error");
        }
        winston.info("Finished processing document - output:");
        winston.info(doc.feedbraindata.scores);
        //winston.info(doc);
        fbu.writeDocument(doc, function(err, response){
            if(err){
                throw err;
            }
            winston.info("write response status:");
            winston.info(response.statusCode);
            if(response.statusCode == 201 || response.statusCode == 200){
                winston.info("document saved");
            }
            else{
                winston.info("Document probably not saved");
            }
        });
        //registry.push(fbu.getMeta(doc, 'fullID'));
        //winston.info('registry:');
        //winston.info(JSON.stringify(registry));
        //winston.info();
    }
    );
    
    
};

var preprocess = function(pdoc, callback){
    winston.info("Aggregator.preprocess");
    //preprocess
    var funcCalls = [];
    _.each(config.preprocessFunctions, function(process){
        funcCalls.push(async.apply(process, pdoc));
    });
    
    //if there are multiple preprocess functions here are they going to overwrite eachother's docs? probably
    //TODO:FIXME: test and fix
    async.parallel(funcCalls, function(err, results){
        winston.info('parallel preprocess got results');
        //winston.info(results);
        //winston.info(err);
        var doc = results[0];
        callback(null, doc);
    });
};

var score = function(doc, callback){
    winston.info("Aggregator.score");
    //score
    var funcCalls = [];
    _.each(config.scoreFunctions, function(scoreFunc){
        var a = function(s, doc, callback){
            s(doc, function(error, result){
                //split up scores if returned multiple
                if(_.isArray(result)){
                    _.each(result, function(val){
                        doc.feedbraindata.scores.push(val);
                    });
                }
                else{
                    doc.feedbraindata.scores.push(result);
                }
                callback(null, doc);
            });
        };
        funcCalls.push(async.apply(a, scoreFunc, doc));
    });
    
    async.parallel(funcCalls, function(err, results){
        winston.info('score parallel got results');
        var doc = results[0];
        //build summary of scores for access at absolute object path
        var scoresSummary = {};
        _.each(doc.feedbraindata.scores, function(val, ind){
            scoresSummary[val.name] = val.score;
        });
        doc.feedbraindata.scoresSummary = scoresSummary;
        callback(null, doc);
    });
};

var classify = function(doc, callback){
    winston.info("Aggregator.classify");
    //classify
    var funcCalls = [];
    _.each(config.classifyFunctions, function(classify){
        funcCalls.push(async.apply(classify, doc));
    });
    
    async.parallel(funcCalls, function(err, results){
        winston.info('parallel classify got results');
        //winston.info(results);
        //winston.info(err);
        if(results.length > 0){
            doc = results[0];
        }
        callback(null, doc);
    });
};

exports.registerSource = registerSource;
exports.processDoc = processDoc;
exports.classify = classify;


if(require.main === module){
    winston.info("running Aggregate directly from node");
    if(argv.rescore) {
        //get documents and feed them through processDoc to update
        fbu.initStore(function(){
            winston.info('1');
            fbu.recentDocuments({limit:100, skip:0}, function(err, rows){
                _.each(rows, function(row, ind){
                    processDoc(null, row.value);
                });
            });
        });
    }
    else {
        fbu.initStore(function(){
            FeedImport.initSources(function(err, s){
                winston.info("about to request feed");
                //winston.info(s);
                //add all feed sources to Listen
                _.each(feeds, function(val, ind){
                    winston.info("listening to " + val);
                    FeedImport.listen({uri:val}, processDoc);
                });
                
                //save sources a minute after fetching
                var timerid = setTimeout(FeedImport.saveFeedSources, 60000, function(){});
                var timerid2 = setTimeout(function() {
                    winston.info('Summary of results from feed sources: ', FeedImport.sourceResultSummary);
                } , 50000);
                
            });
        });
    }
    
}
else{
    winston.info("running Aggregate as a module");
}


