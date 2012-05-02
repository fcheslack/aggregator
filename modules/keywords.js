var conf = {};

var keywords = ['botnet', 'security', 'encryption', 'cryptography'];

var init = function(options){
    if(typeof options == 'object'){
        conf = options;
    }
    keywords = options.keywords;
    return;
};

var scorekeywords = function(doc, callback){
    //get retweet statistics for url
    var text, lower;
    var foundwords = [];
    var keywordSummary = {};
    
    if(doc.readable){
        text = doc.readabletext;
    }
    else {
        text = doc.text;
    }
    lower = text.toLowerCase();
    
    for(var i = 0; i < keywords.length; i++){
        if(lower.indexOf(keywords[i].toLowerCase()) !== -1 ){
            foundwords.push({"name":"keyword_" + keywords[i], "score":1});
            keywordSummary["keyword_" + keywords[i]] = 1;
        }
        else{
            foundwords.push({"name":"keyword_" + keywords[i], "score":0});
            keywordSummary["keyword_" + keywords[i]] = 0;
        }
    }
    
    var result = foundwords;
    
    callback(null, result);
    //callback(null, keywordSummary);
};


exports.score = scorekeywords;
exports.argtype = 'fulltext';
exports.init = init;
exports.keywords = keywords;
