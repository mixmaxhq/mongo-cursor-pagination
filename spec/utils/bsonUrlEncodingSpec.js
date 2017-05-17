var bsonUrlEncoding = require('../../src/utils/bsonUrlEncoding');
var getDb = require('../support/db');
var sync = require('synchronize');
var mongo = require('mongojs');
require('synchronize-bdd').replace();

describe('bson url encoding', () => {
  var db;

  beforeEach(() => {
    db = getDb();
  });

  it('should encode and decode complex objects', () => {
    var obj = {
      _id: mongo.ObjectID('58164d86f69ab45942c6ff38'),
      date: new Date('Sun Oct 30 2016 12:32:35 GMT-0700 (PDT)'),
      number: 1,
      string: 'complex String &$##$-/?'
    };
    sync.await(db.collection('test_objects').insert(obj, sync.defer()));
    var bsonObject = sync.await(db.collection('test_objects').findOne({}, sync.defer()));
    var str = bsonUrlEncoding.encode(bsonObject);

    expect(str).toEqual('eyJfaWQiOnsiJG9pZCI6IjU4MTY0ZDg2ZjY5YWI0NTk0MmM2ZmYzOCJ9LCJkYXRlIjp7IiRkYXRlIjoiMjAxNi0xMC0zMFQxOTozMjozNS4wMDBaIn0sIm51bWJlciI6MSwic3RyaW5nIjoiY29tcGxleCBTdHJpbmcgJiQjIyQtLz8ifQ');

    var decoded = bsonUrlEncoding.decode(str);
    // Check types
    expect(decoded.date).toEqual(jasmine.any(Date));
    expect(decoded.number).toEqual(jasmine.any(Number));
    expect(decoded.string).toEqual(jasmine.any(String));
  });
});
