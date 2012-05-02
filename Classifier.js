var natural = require('natural');
var brain = require('brain');
var fs = require('fs');
var util = require('util');
var _ = require('underscore')._;
var async = require('async');
var winston = require('winston');
winston.add(winston.transports.File, {filename: 'logs/classifier.log'});

var classifier;

var argv = require('optimist')
    //.usage('Usage: $0 --track=hashtag --db=DBName')
    //.demand(['track', 'db'])
    .argv;




var loadClassifier = function(path, callback){
    natural.BayesClassifier.load(path, null, function(err, loadedClassifier){
        classifier = loadedClassifier;
        callback(err);
    });
};


/**
preprocess normalized JSON into form acceptable by whatever trained machine we're using
feed it in and save machine's output (with normalized document or separate?)
*/
var classify = function(doc, callback){
    var text;
    if(typeof doc == 'string'){
        text = doc;
    }
    else if(doc.readabletext){
        text = doc.readabletext;
    }
    else{
        text = doc.text;
    }
    
    var cresults = classifier.classify(text);
    winston.info("classified doc : " + doc.title, cresults);
    //show full classifications:
    winston.info(util.inspect(classifier.getClassifications(text)));
    callback(null, cresults);
};

exports.classify = classify;
exports.loadClassifier = loadClassifier;

if(require.main === module){
    winston.info("running Classifier directly from node");
    if(argv.classifier){
        loadClassifier(argv.classifier, function(err){
            classify(argv.doc, function(err, cresults){
                winston.info("Done classifying document ", cresults);
                process.exit();
            });
        });
    }
    else{
        winston.info("no classifier defined");
    }
}
else{
    winston.info("running Classifier as a module");
}

