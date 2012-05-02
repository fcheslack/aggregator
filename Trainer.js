var natural = require('natural');
var brain = require('brain');
var fs = require('fs');
var util = require('util');
var _ = require('underscore')._;
var async = require('async');
var winston = require('winston');
winston.add(winston.transports.File, {filename: 'logs/trainer.log'});

var fbu = require('./lib/couchstore.js');

var classifier;
var classifierType = '';
var rubric = {'input':'stemmedText', 'className':'interesting'};

var argv = require('optimist')
    //.usage('Usage: $0 --track=hashtag --db=DBName')
    //.demand(['track', 'db'])
    .argv;


var init = function(type, options){
    classifierType = type;
    switch(type){
        case 'bayes':
            classifier = new natural.BayesClassifier();
            break;
        case 'regression':
            classifier = new natural.LogisticRegressionClassifier();
            break;
        case 'neuralnet':
            classifier = new brain.NeuralNetwork({});
            break;
        default:
            classifier = new natural.BayesClassifier();
            break;
    }
    
    return classifier;
};

var setRubric = function(options){
    rubric = options;
};

var train = function(documents){
    switch(classifierType){
        case 'bayes':
            _.each(documents, function(doc){
                classifier.addDocument(fbu.getMeta(rubric.input), fbu.getMeta(rubric.className));
            });
            break;
        case 'regression':
            classifier = new natural.LogisticRegressionClassifier();
            _.each(documents, function(doc){
                var input = fbu.getMeta(rubric.input);
                var classification = fbu.getMeta(rubric.className);
                if(input && classification){
                    classifier.addDocument(input, classification);
                }
                else{
                    //didn't have some value required for training
                }
            });
            break;
        case 'neuralnet':
            //TODO:build input training array from docs+rubric and train net
            //classifier = new brain.NeuralNetwork({});
            break;
    }
};



var save = function(path, callback){
    switch(type){
        case 'bayes':
            classifier.save(path, callback);
            break;
        case 'regression':
            classifier.save(path, callback);
            break;
        case 'neuralnet':
            var classifierJson = classifier.toJSON();
            fs.write(path, classifierJson, function(err){
                if(err){
                    callback(err);
                }
                else{
                    callback(null, classifier);
                }
            });
            classifier = new brain.NeuralNetwork({});
            break;
        default:
            break;
    }
    
};

var load = function(path, callback){
    switch(type){
        case 'bayes':
            classifier = new natural.BayesClassifier();
            break;
        case 'regression':
            classifier = new natural.LogisticRegressionClassifier();
            break;
        case 'neuralnet':
            classifier = new brain.NeuralNetwork({});
            break;
        default:
            classifier = new natural.BayesClassifier();
            break;
    }
    
};

var getClassifier = function(){
    return classifier;
};

exports.init = init;
exports.setRubric = setRubric;
exports.train = train;
exports.save = save;
exports.load = load;
exports.getClassifier = getClassifier;

if(require.main === module){
    winston.info("running Trainer directly from node");
    
    classifier = new natural.BayesClassifier();
    
    fbu.recentCatDocuments({limit:100, skip:0, category:'interest_rated'}, function(err, rows){
        if(err){
            winston.err("Error getting interest_rated docs from couch", err);
            process.exit();
        }
        _.each(rows, function(row, key){
            //winston.info("iterating doc to train ", doc);
            var doc = row.value;
            winston.info("iterating doc to train ");
            var text;
            if(doc.readabletext){
                text = doc.readabletext;
            }
            else{
                text = doc.text;
            }
            
            var interest_rating = doc.feedbraindata_user.interesting;
            var interesting = (interest_rating > 2) ? 'interesting' : 'uninteresting';
            classifier.addDocument(text, interesting);
        });
        
        
        classifier.train();
            
        classifier.save('classifiers/interesting_classifier.json', function(err, classifier){
            if(err){
                winston.err("error saving classifier");
            }
            else{
                winston.info("classifier saved to file");
            }
        });
    });
    
    
}
else{
    winston.info("running Trainer as a module");
}


