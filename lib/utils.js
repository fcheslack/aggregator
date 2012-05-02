var _ = require('underscore')._;
var fs =  require('fs');
var mongodb = require('mongodb');
var server = new mongodb.Server("127.0.0.1", 27017, {});
var mclient;
var documentsCollection;
var sourcesCollection;

var initStore = function(callback){
    console.log("initStore");
    new mongodb.Db('feedbrain', server, {}).open(function (error, client) {
        if (error) throw error;
        console.log("mongodb opened");
        mclient = client;
        documentsCollection = new mongodb.Collection(mclient, 'docs');
        sourcesCollection = new mongodb.Collection(mclient, 'sources');
        
        documentsCollection.ensureIndex({"feedbraindata.uid":1}, {unique:true}, function(err, ind){
            if(err){
                console.log("Error ensuring index on feedbraindata uid");
                callback(err);
            }
            documentsCollection.ensureIndex({"date":-1}, {unique:false}, function(err, ind){
                if(err){
                    console.log("Error ensuring index on date");
                    callback(err);
                }
                callback();
            });
        });
    });
};

var addMeta = function(doc, meta){
    console.log("addMeta");
    //console.log(meta);
    _.each(meta, function(val, key){
        doc.feedbraindata[key] = val;
    });
    var uid = doc.feedbraindata.uid;
    documentsCollection.update({'feedbraindata.uid': uid}, doc, {safe:true, upsert:true}, function(){});
    return doc;
};

var addUserMeta = function(uid, meta, callback){
    console.log("addUserMeta");
    console.log(uid);
    console.log(meta);
    var collection = new mongodb.Collection(mclient, 'usermetadata');
    //update user input for this document to persist even if we replace the doc
    collection.update({uid: uid}, {'$set': meta}, {safe:true, upsert:true}, callback);
    //update the actual doc so user input is available whenever we get it
    documentsCollection.find({'feedbraindata.uid':uid}).toArray(function(err, docs){
        var doc = docs[0];
        console.log(doc);
        _.each(meta, function(val, key){
            doc.feedbraindata[key] = val;
        });
        documentsCollection.update({'feedbraindata.uid': uid}, doc, {safe:true, upsert:true}, callback);
    });
    
};

var getMeta = function(doc, field){
    console.log("getMeta");
    //console.log(meta);
    return doc.feedbraindata[field];
};

var getUserMeta = function(uid, callback){
    var collection = new mongodb.Collection(mclient, 'usermetadata');
    collection.find({'uid': uid}).toArray(callback);
};

var writeDocument = function(doc, callback){
    //fs.writeFile('./documents/' + doc.feedbraindata.fullID, JSON.stringify(doc), callback);
    console.log("writeDocument");
    console.log(doc.feedbraindata.store);
    //var collection = new mongodb.Collection(mclient, doc.feedbraindata.store);
    var collection = documentsCollection;
    var uid = doc.feedbraindata.uid;
    collection.update({'feedbraindata.uid': uid}, doc, {safe:true, upsert:true}, callback);
};

var readDocument = function(uid, callback){
    //var collection = new mongodb.Collection(mclient, store);
    var collection = documentsCollection;
    collection.find({'feedbraindata.uid': uid}).limit(1).toArray(callback);
};

var readDocuments = function(queryOb, limit, sort, callback){
    //var collection = new mongodb.Collection(mclient, store);
    var collection = documentsCollection;
    collection.find(queryOb).sort(sort).limit(limit).toArray(callback);
};

var addSource = function(source, callback){
    console.log("addSource");
    console.log(source);
    //var collection = new mongodb.Collection(mclient, doc.feedbraindata.store);
    sourcesCollection.insert(source, {safe:true}, callback);
};

var saveSource = function(source, callback){
    console.log("saveSource");
    console.log(source);
    //var collection = new mongodb.Collection(mclient, doc.feedbraindata.store);
    sourcesCollection.update({uri:source.uri}, source, {safe:true, upsert:true}, callback);
};

var getSources = function(callback){
    console.log('getSources');
    sourcesCollection.find().toArray(callback);
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
exports.addSource = addSource;
exports.saveSource = saveSource;
exports.getSources = getSources;
exports.sanitize = sanitize;

