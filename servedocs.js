var app = require('http').createServer(handler);
var io = require('socket.io').listen(app);
var fs = require('fs');
var util = require('util');
var winston = require('winston');
winston.add(winston.transports.File, {filename: 'logs/serve.log'});
//var fbu = require('./lib/utils.js');
var fbu = require('./lib/couchstore.js');
var recentDocs = [];

var FeedImport = require('./FeedImport.js');


var argv = require('optimist')
    .usage('Usage: $0 --db=DBName')
    //.demand(['track', 'db'])
    .default('db', 'feedbrain') //db to store tweets in
    .argv;

//initialize docstore
fbu.initStore(function(){});
//listen for socket.io
app.listen(8080);

//blank successful responses for regular http requests on our port
function handler (req, res) {
    res.writeHead(200);
    res.end('');
}

//deal with socket.io connections on our port
io.sockets.on('connection', function (socket) {
    socket.emit('initialDocs', { docs: recentDocs });
    socket.on('moreDocs', function (docreq) {
        winston.info('moreDocs received');
        fbu.recentDocuments({limit:docreq.limit, skip:docreq.skip, beforeID:docreq.beforeID}, function(err, docs){
            winston.info("moreDocs called back");
            if(err){
                winston.err(err);
            }
            else{
                socket.emit('gotMoreDocs', docs);
            }
        });
    });
    
    socket.on('getDocs', function(docreq){
        winston.info('getDocs received');
        fbu.readDocuments(docreq.query, docreq.limit, {date:-1}, function(err, docs){
            winston.info("readDocuments called back");
            if(err){
                winston.err(err);
            }
            else{
                socket.emit('gotDocs', docs);
            }
        });
    });
    
    socket.on('getRecentDocs', function(docreq){
        winston.info('getRecentDocs received');
        fbu.recentDocuments({limit:docreq.limit, skip:docreq.skip}, function(err, docs){
            winston.info("readDocuments called back");
            if(err){
                winston.err(err);
            }
            else{
                socket.emit('gotRecentDocs', docs);
            }
        });
    });
    
    socket.on('getRecentCatDocs', function(docreq){
        winston.info('getRecentCatDocs received');
        fbu.recentCatDocuments({limit:docreq.limit, skip:docreq.skip, category:docreq.category}, function(err, docs){
            winston.info("readCatDocuments called back");
            if(err){
                winston.err(err);
            }
            else{
                socket.emit('gotRecentDocs', docs);
            }
        });
    });
    
    socket.on('userClassifyDoc', function(docClass){
        var uid = docClass.docuid;
        var meta = docClass.meta;
        fbu.readDocument(uid, function(err, doc){
            doc = fbu.addUserMeta(doc, meta);
            fbu.writeDocument(doc, function(err, response){
                
            });
        });
        
    });
    
    socket.on('readDocAgain', function(docid){
        fbu.readDocument(docid, function(err, doc){
            FeedImport.makeReadable(doc, function(err, doc){
                socket.emit('rereadDoc', doc);
                fbu.writeDocument(doc, function(err, response){
                    
                });
            });
        });
    });
});

//set timeout to get new docs.
//this should be done with an event from the logger process
//but for now we'll just check with mongo every few seconds
/*
var updateRecentDocs = function(){
    winston.info('updateRecentTweets');
    if(recentTweets.length > 0){
        winston.info('recent tweets > 0 - fetching since last one');
        tweetstore.fetchSince(recentTweets[0].id_str, function(err, data){
            winston.info(util.inspect(data));
            if(data.length > 0){
                winston.info("new tweets received in servetweets");
                winston.info(data);
                //send tweet to clients
                io.sockets.emit('newTweets', {tweets:data});
                for(var i = data.length - 1; i >= 0; i--){
                    recentTweets.unshift(data[i]);
                }
            }
            else{
                winston.info("no new tweets found");
            }
        });
    }
};

var intervalID = setInterval(updateRecentTweets, 30000);
*/
