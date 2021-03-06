'use strict';

var request = require('request'),
    ESConfiguration = require('esn-elasticsearch-configuration'),
    Path = require('path'),
    q = require('q'),
    fs = require('fs');

var readdir = q.denodeify(fs.readdir);

module.exports.getDBOptions = function(host, port, dbName) {

  host = host || 'localhost';
  port = port || 27017;
  dbName = dbName || 'esn';

  return {connectionString: 'mongodb://' + host + ':' + port + '/' + dbName};
};

module.exports.getESConfiguration = function(host, port) {
  return new ESConfiguration({ host: host || 'localhost', port: port || 9200 });
};

module.exports.exit = function() {
  process.exit();
};

module.exports.loginAsUser = function(baseUrl, email, password, done) {
  request({
    uri: baseUrl + '/api/login',
    method: 'POST',
    jar: true,
    json: true,
    body: {username: email, password: password, rememberme: false}
  }, function(err, resp, body) {
    if (err) {
      return done(err);
    }
    if (resp.statusCode !== 200) {
      return done(new Error('Can not auth user', body));
    }
    return done(null, body);
  });
};

function log(level, message) {
  console.log('[CLI] ' + level + ' ' + message);
}

module.exports.logInfo = function(message) {
  log('INFO', message);
};

module.exports.logError = function(message) {
  log('ERROR', message);
};

module.exports.loadMongooseModels = function loadMongooseModels() {
  var ESN_ROOT = Path.resolve(__dirname, '../');
  var MODELS_ROOT = Path.resolve(ESN_ROOT, 'backend/core/db/mongo/models');

  return readdir(MODELS_ROOT).then(function(files) {
    files.forEach(function(filename) {
      var file = Path.resolve(MODELS_ROOT, filename);

      if (fs.statSync(file).isFile()) {
        require(file);
      }
    });
  });
};
