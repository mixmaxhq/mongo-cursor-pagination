var sync = require('synchronize');
var MongoClient = require('mongodb').MongoClient;
var db;
require('synchronize-bdd').replace();

const DB_NAME = '__mongo-cursor-pagination-tests__';

beforeEach(() => {
  db = sync.await(MongoClient.connect(`mongodb://localhost:27017/${DB_NAME}`, sync.defer()));
});

afterEach(() => {
  sync.await(db.dropDatabase(sync.defer()));
  db.close();
});

module.exports = () => db;
