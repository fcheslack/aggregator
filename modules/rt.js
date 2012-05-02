var conf = {scorename: "rt"};

var init = function(options){
    if(typeof options == 'object'){
        conf = options;
    }
    return;
};

var rt = function(url, callback){
    //get retweet statistics for url
    var count = Math.floor(Math.random() * 21) ;
    console.log('rt url:' + url);
    console.log(count);
    var result = {score:count,
                  name:conf.scorename
                  };
    
    callback(null, result);
};


exports.score = rt;
exports.argtype = 'url';
exports.init = init;
