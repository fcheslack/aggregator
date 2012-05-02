
var natural = require('natural');
//var fbu = require('../lib/utils.js');
var fbu = require('../lib/couchstore.js');

var conf = {};

var init = function(options){
    if(typeof options == 'object'){
        conf = options;
    }
    return;
};

var tokenize = function(doc, callback){
    console.log("tokenize");
    var text = doc.text;
    //text = text.replace(/<(?:.|\n)*?>/gm, ' ');
    //text = text.replace(/(<([^>]+)>)/ig, " ");
    var stemmed = natural.PorterStemmer.tokenizeAndStem(text);
    console.log(stemmed.slice(0,5));
    fbu.addMeta(doc, {stemmedText:stemmed});
    
    callback(null, doc);
};


exports.process = tokenize;
exports.tokenize = tokenize;
exports.argtype = 'doc';
exports.init = init;
