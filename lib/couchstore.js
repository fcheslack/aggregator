var _ = require('underscore')._;
var fs =  require('fs');
var request = require('request');
var winston = require('winston');
var couchbase = 'http://localhost:5984/feedbrain/';

var initStore = function(callback){
    winston.info("initStore");
    //try creating the views if not there?
    callback(null);
};

var addMeta = function(doc, meta){
    winston.info("addMeta");
    //winston.info(meta);
    _.each(meta, function(val, key){
        doc.feedbraindata[key] = val;
    });
    var uid = doc.feedbraindata.uid;
    //TODO:Save changes to couchDB or dont?
    //documentsCollection.update({'feedbraindata.uid': uid}, doc, {safe:true, upsert:true}, function(){});
    return doc;
};

var addUserMeta = function(doc, meta){
    winston.info("addUserMeta");
    var uid = doc._id;
    winston.info(uid);
    winston.info(meta);
    
    //also save userMeta in separate document dedicated to this data that won't be overwritten if document lost
    //this is extremely vulnerable to race condition conflicts, if not necessarily deadlocks
    readDocument('feedbrain_user_meta', function(err, mdoc){
        if(err){
            winston.err("Error reading feedbrain_user_meta doc");
        }
        else{
            if(typeof doc[uid] == 'undefined'){
                mdoc[uid] = {};
            }
            
            _.each(meta, function(val, key){
                mdoc[uid][key] = val;
            });
            writeDocument(mdoc, function(){
                winston.info("userMeta added to " + uid);
            });
        }
    });
    
    //update the local copy of the doc itself before returning it
    if(typeof doc.feedbraindata_user == 'undefined'){
        doc.feedbraindata_user = {};
    }
    
    _.each(meta, function(val, key){
        doc.feedbraindata_user[key] = val;
    });
    
    return doc;
};

var getMeta = function(doc, field){
    winston.info("getMeta");
    //winston.info(meta);
    return doc.feedbraindata[field];
};

var getUserMeta = function(uid, callback){
    //var collection = new mongodb.Collection(mclient, 'usermetadata');
    //collection.find({'uid': uid}).toArray(callback);
    callback(null);
};

var writeDocument = function(doc, callback){
    //fs.writeFile('./documents/' + doc.feedbraindata.fullID, JSON.stringify(doc), callback);
    winston.info("writeDocument");
    //winston.info(doc.feedbraindata.store);
    var target = couchbase + encodeURIComponent(doc._id);
    winston.info(target);
    var pbody = JSON.stringify(doc);
    request.put({uri:target, body:pbody}, function(err, response, body){
        winston.info("writeDocument http request returned");
        if(err){
            if(response.statusCode == 409){
                winston.err("Conflict writing couchdb document");
            }
            winston.err("error creating couchdb document");
            winston.info(response);
            winston.info(body);
            callback(err);
        }
        else{
            if(response.statusCode == 409){
                winston.info("Conflict writing couchdb document");
            }
            if(response.statusCode == 400){
                winston.info("bad request writing couchdb document");
                winston.info("error creating couchdb document");
                //winston.info(response);
                winston.info(body);
                process.exit();
            }
            
        }
        callback(null, response);
    });
};

var readDocument = function(uid, callback){
    //var collection = new mongodb.Collection(mclient, store);
    var target = couchbase + encodeURIComponent(uid);
    request(target, function(err, response, body){
        if(err){
            winston.err("error reading couchdb document");
        }
        var doc = JSON.parse(body);
        
        callback(err, doc);
    });
    //var collection = documentsCollection;
    //collection.find({'feedbraindata.uid': uid}).limit(1).toArray(callback);
};

var readDocuments = function(queryOb, limit, sort, callback){
    //var collection = new mongodb.Collection(mclient, store);
    //just get latest from couchdb
    var target = couchbase + '_design/latest/_view/all';
    winston.info(target);
    request({uri:target, qs:{include_docs:false, limit:25}}, function(err, response, body){
        if(err){
            winston.err("error reading couchdb documents");
            winston.verbose(body);
        }
        
        var results = JSON.parse(body);
        
        callback(null, results.rows);
    });
    //var collection = documentsCollection;
    //collection.find(queryOb).sort(sort).limit(limit).toArray(callback);
};

var recentDocuments = function(q, callback){
    //var collection = new mongodb.Collection(mclient, store);
    //just get latest from couchdb
    var target = couchbase + '_design/latest/_view/all';
    winston.info(target);
    var reqOb = {uri:target, qs:{limit:q.limit, skip:q.skip, descending:true}};
    if(q.beforeID){
        reqOb.startkey = q.beforeID;
    }
    
    request(reqOb, function(err, response, body){
        if(err){
            winston.err("error reading couchdb documents");
            winston.info(body);
        }
        var results = JSON.parse(body);
        winston.info(results);
        callback(null, results.rows);
    });
};

var recentCatDocuments = function(q, callback){
    //var collection = new mongodb.Collection(mclient, store);
    //just get latest from couchdb
    var target = couchbase + '_design/categories/_view/';
    if(q.category){
        target += q.category;
    }
    else{
        target += 'all';
    }
    winston.info(target);
    
    var reqOb = {uri:target, qs:{limit:q.limit, skip:q.skip, descending:true}};
    if(q.beforeID){
        reqOb.startkey = q.beforeID;
    }
    
    request(reqOb, function(err, response, body){
        if(err){
            winston.err("error reading couchdb documents");
            winston.info(body);
        }
        var results = JSON.parse(body);
        winston.info(results);
        callback(null, results.rows);
    });
};

var addSource = function(source, callback){
    winston.info("addSource");
    winston.info(source);
    
    //var collection = new mongodb.Collection(mclient, doc.feedbraindata.store);
    //sourcesCollection.insert(source, {safe:true}, callback);
};

var saveSource = function(source, callback){
    winston.info("saveSource");
    winston.info(source);
    //var collection = new mongodb.Collection(mclient, doc.feedbraindata.store);
    //sourcesCollection.update({uri:source.uri}, source, {safe:true, upsert:true}, callback);
};

var saveFeedSources = function(sources, callback){
    winston.info('saveFeedSources');
    
    var target = couchbase + 'feed_sources';
    winston.info(target);
    var pbody = JSON.stringify(sources);
    request.put({uri:target, body:pbody}, function(err, response, body){
        if(err){
            winston.info("error saving feed sources to couchdb");
            winston.info(body);
        }
        var result = JSON.parse(body);
        if(!result.ok){
            winston.info("couchdb reports not okay on saveFeedSources PUT");
            winston.info(result);
            callback("couchdb reports not okay on saveFeedSources PUT " + result.error + " : " + result.reason);
        }
        
        callback(null, result.rev);
    });
};

var getFeedSources = function(callback){
    winston.info('getFeedSources');
    
    var target = couchbase + 'feed_sources';
    winston.info(target);
    request({uri:target}, function(err, response, body){
        if(err){
            winston.info("error reading couchdb documents");
            winston.info(body);
        }
        var sources;
        if(typeof body == 'string'){
            winston.info('body is a string');
            sources = JSON.parse(body);
        }
        else{
            winston.info('body is pre-parsed');
            sources = body;
        }
        callback(null, sources);
    });
    //sourcesCollection.find().toArray(callback);
};

var sanitize = function(str){
    return str.replace(/[^a-zA-Z0-9_-]/g, '');
};



exports.initStore = initStore;
exports.addMeta = addMeta;
exports.addUserMeta = addUserMeta;
exports.getMeta = getMeta;
exports.getUserMeta = getUserMeta;
exports.writeDocument = writeDocument;
exports.readDocument = readDocument;
exports.readDocuments = readDocuments;
exports.recentDocuments = recentDocuments;
exports.recentCatDocuments = recentCatDocuments;
exports.addSource = addSource;
exports.saveFeedSources = saveFeedSources;
exports.getFeedSources = getFeedSources;
exports.sanitize = sanitize;

