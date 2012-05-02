//FeedImport
var FeedParser = require('feedparser');
var parser = new FeedParser();
// The following modules are used in the examples below
var fs = require('fs');
var _ = require('underscore')._;
var request = require('request');
var readability = require('readabilitySAX');
var winston = require('winston');

//var fbu = require('./lib/utils.js');
var fbu = require('./lib/couchstore.js');

var intervalIDs = [];
var sources = {};
var sourceResultSummary = {};

/*
parser.on('article', function (article){
    winston.info('Got article: \n\n\n');
    winston.info(article);
    winston.info("\n\n\n");
});
*/

/*
parser.on('meta', function (meta){
    winston.info("feed parsed with metadata:");
    winston.info(meta);
    winston.info("\n\n\n");
});
*/
parser.on('error', console.error);

//parser.parseFile('/home/fcheslack/Desktop/arsfeatures.xml');

var initSources = function(callback){
    winston.info("couchStore initSources");
    fbu.getFeedSources(function(err, s){
        winston.info("getSources callback");
        winston.info(s);
        if(err){
            winston.info(err);
        }
        sources = s;
        callback(null, sources);
    });
};

/**
 * Normalize doc object for feedbrain use and add placeholder feedbrain metadata property
 * @param  {Object} doc Document to normalize
 * @return {Object}     The normalized document
 */
var normalize = function(doc){
    winston.info('FeedImport normalize');
    //winston.info(doc);
    
    if(doc.title === null){
        doc.title = '';
    }
    if(doc.meta.title === null){
        doc.meta.title = '';
    }
    if(doc.summary === null){
        doc.summary = '';
    }
    if(doc.description === null){
        doc.description = '';
    }
    
    doc.feedbraindata = {scores:[]};
    //strip html from text fields and put them in standard properties
    doc.shortText = doc.summary.replace(/(<([^>]+)>)/ig, " ");
    doc.text = doc.description.replace(/(<([^>]+)>)/ig, " ");
    
    //canonical article link
    if(doc.origlink){
        doc.url = doc.origlink;
    }
    else{
        doc.url = doc.link;
    }
    
    doc._id = doc.url;
    doc.feedbraindata.uid = doc.url;
    doc.feedbraindata.source = doc.meta.title;
    doc.feedbraindata.store = fbu.sanitize(doc.meta.title.replace(/ /g, '-') );
    doc.feedbraindata.saniTitle = fbu.sanitize(doc.title.replace(/ /g, '-') );
    doc.feedbraindata.fullID = doc.feedbraindata.store + '_' + doc.feedbraindata.saniTitle;
    doc.feedbraindata.importType = 'feed';
    
    winston.info('normalized ' + doc.feedbraindata.source + ' - ' + doc.title);
    return doc;
};

var listen = function(options, callback){
    winston.info("FeedImport.listen");
    //we need a separate parser for each feed
    //trying to use the same parser for multiple feeds breaks stuff
    var parser = new FeedParser();
    parser.on('error', console.error);
    
    parser.on('article', function(article){
        winston.info("listen callback - article found");
        var normalized = normalize(article);
        var src = normalized.meta.title;
        if(sourceResultSummary[src]){
            sourceResultSummary[src]['count']++;
        }
        else {
            sourceResultSummary[src] = {'count':1};
        }
        callback(null, normalized);
    });
    
    var intervalFunc = function(){
        winston.info("requesting feed from interval");
        requestFeed(options, parser);
    };
    
    var intervalID = setInterval(intervalFunc, 900000); //15 minutes = 900000ms
    //call for first time right now
    winston.info("requesting feed for first time");
    requestFeed(options, parser);
    
};

var read = function(options, callback){
    parser.on('article', function(article){
        var normalized = normalize(article);
        callback(null, normalized);
    });
    
    if(options.url){
        parser.parseFile(options.url);
    }
};

var requestFeed = function(reqOb, parser) {
    winston.info("FeedImport.request");
    winston.info(reqOb);
    if(!sources.sources[reqOb.uri]){
        sources.sources[reqOb.uri] = {uri: reqOb.uri};
    }
    if(!reqOb.headers){
        reqOb.headers = {};
    }
    
    if(sources.sources[reqOb.uri].lastModified){
        reqOb.headers['If-Modified-Since'] = sources.sources[reqOb.uri].lastModified;
    }
    if(sources.sources[reqOb.uri].etag){
        reqOb.headers['If-None-Match'] = sources.sources[reqOb.uri].etag;
    }
    
    winston.info(reqOb);
    var req = request(reqOb, function(err, response, body){
        winston.info("request callback");
        if(err){
            winston.info("Error making request - " + reqOb.uri);
        }
        winston.info(response.headers);
        sources.sources[reqOb.uri].lastModified = response.headers['last-modified'];
        sources.sources[reqOb.uri].etag = response.headers['etag'];
        winston.info(response.statusCode);
        //winston.info(body);
        //winston.info(response.body);
        //parser.parseString(body);
        //
        //save source
        winston.info(sources.sources[reqOb.uri]);
    });
    winston.info('piping to parser.stream');
    req.pipe(parser.stream);
    
};

var saveFeedSources = function(callback){
    fbu.saveFeedSources(sources, function(err, newRev){
        if(err){
            winston.info("error saving feed sources");
        }
        sources._rev = newRev;
        winston.info("Source Saved");
        //process.exit();
        callback(null);
    });
};

var unreadableSources = ['theverge', 'sciam', 'atlantic', 'slate'];

var makeReadable = function(doc, callback){
    winston.info("FeedImport.makeReadable");
    //scan through our unreadable sources and decide if this doc came from any of them
    var isReadable = true;
    _.each(unreadableSources, function(source, ind){
        if(doc.url.indexOf(source)){
            isReadable = false;
        }
        else if(fbu.sanitize(doc.feedbraindata.fullID).toLowerCase().indexOf(fbu.sanitize(source).toLowerCase()) != -1 ){
            isReadable = false;
        }
    });
    if(!isReadable){
        winston.info("source is not readable");
        try{
            winston.info('calling readability.get');
            readability.get(doc.url, function(readable){
                winston.info("got readable back");
                doc.readable = readable;
                doc.readabletext = doc.readable.html.replace(/(<([^>]+)>)/ig, " ");
                winston.info(doc.readable);
                callback(null, doc);
            });
        }
        catch(e){
            callback(e, doc);
        }
    }
};

exports.listen = listen;
exports.read = read;
exports.requestFeed = requestFeed;
exports.initSources = initSources;
exports.saveFeedSources = saveFeedSources;
exports.makeReadable = makeReadable;
exports.sourceResultSummary = sourceResultSummary;

