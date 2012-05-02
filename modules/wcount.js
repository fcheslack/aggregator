var conf = {scorename:'wcount'};

var init = function(options){
    if(typeof options == 'object'){
        conf = options;
    }
    return;
};

var wcount = function(doc, callback){
    console.log("wcount");
    var text, split, count, result;
    if(doc.readable){
        text = doc.readabletext;
    }
    else {
        text = doc.text;
    }
    
    split = text.split(/\s+/);
    count = split.length;
    result = {score:count,
                  name:conf.scorename
                  };
    callback(null, result);
};


exports.score = wcount;
exports.argtype = 'fulltext';
exports.init = init;
