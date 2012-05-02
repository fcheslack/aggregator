var feedbrain = require('./lib/feedbrain.js');
var testInput = {
    fulltext: 'the quick brown fox jumped over the lazy dog.',
    url: 'http://test.url/id1234'
};

feedbrain.init('faolan1');

feedbrain.runScoring(testInput, {}, function(err, results){
    console.log(results);
    feedbrain.runBrain(results);
});

