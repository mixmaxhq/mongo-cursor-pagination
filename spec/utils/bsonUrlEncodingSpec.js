const { describe } = require('ava-spec');
const test = require('ava');
var bsonUrlEncoding = require('../../src/utils/bsonUrlEncoding');
var dbUtils = require('../support/db');
var mongo = require('mongoist');

let mongod;
test.before('start mongo server', async () => {
  mongod = dbUtils.start();
});

describe('bson url encoding', (it) => {
  it.beforeEach(async (t) => {
    t.context.db = await dbUtils.db(mongod);
  });

  it('should encode and decode complex objects', async (t) => {
    var obj = {
      _id: mongo.ObjectID('58164d86f69ab45942c6ff38'),
      date: new Date('Sun Oct 30 2016 12:32:35 GMT-0700 (PDT)'),
      number: 1,
      string: 'complex String &$##$-/?'
    };
    await t.context.db.collection('test_objects').insert(obj);
    var bsonObject = await t.context.db.collection('test_objects').findOne({});
    var str = bsonUrlEncoding.encode(bsonObject);

    t.is(str, 'eyJfaWQiOnsiJG9pZCI6IjU4MTY0ZDg2ZjY5YWI0NTk0MmM2ZmYzOCJ9LCJkYXRlIjp7IiRkYXRlIjoiMjAxNi0xMC0zMFQxOTozMjozNS4wMDBaIn0sIm51bWJlciI6MSwic3RyaW5nIjoiY29tcGxleCBTdHJpbmcgJiQjIyQtLz8ifQ');

    var decoded = bsonUrlEncoding.decode(str);
    // Check types
    t.is(typeof decoded.date, 'object');
    t.is(typeof decoded.number, 'number');
    t.is(typeof decoded.string, 'string');
  });
});
