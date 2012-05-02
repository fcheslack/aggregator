var FeedParser = require('feedparser');
var parser = new FeedParser();
// The following modules are used in the examples below
var request = require('request');

parser.on('article', function (article){
    console.log('Got article: %s', JSON.stringify(article));
});

var reqObj = {uri: 'http://cyber.law.harvard.edu/rss/examples/rss2sample.xml',
              headers: { 'If-Modified-Since': 'Fri, 06 Apr 2007 15:11:55 GMT',
                         'If-None-Match': '"d46a5b-9e0-42d731ba304c0"'
                       }
             };

request(reqObj).pipe(parser.stream);

