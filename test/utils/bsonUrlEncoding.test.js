const mongo = require('mongoist');

const bsonUrlEncoding = require('../../src/utils/bsonUrlEncoding');
const dbUtils = require('../support/db');

describe('bson url encoding', () => {
  let mongod;
  const t = {};
  beforeAll(async () => {
    mongod = dbUtils.start();
    t.db = await dbUtils.db(mongod);
  });

  afterAll(() => mongod.stop());

  it('encodes and decodes complex objects', async () => {
    const obj = {
      _id: mongo.ObjectID('58164d86f69ab45942c6ff38'),
      date: new Date('Sun Oct 30 2016 12:32:35 GMT-0700 (PDT)'),
      number: 1,
      string: 'complex String &$##$-/?',
    };
    await t.db.collection('test_objects').insert(obj);
    const bsonObject = await t.db.collection('test_objects').findOne({});
    const str = bsonUrlEncoding.encode(bsonObject);

    expect(str).toEqual(
      'eyJfaWQiOnsiJG9pZCI6IjU4MTY0ZDg2ZjY5YWI0NTk0MmM2ZmYzOCJ9LCJkYXRlIjp7IiRkYXRlIjoiMjAxNi0xMC0zMFQxOTozMjozNVoifSwibnVtYmVyIjoxLCJzdHJpbmciOiJjb21wbGV4IFN0cmluZyAmJCMjJC0vPyJ9'
    );

    const decoded = bsonUrlEncoding.decode(str);
    // Check types
    expect(typeof decoded.date).toEqual('object');
    expect(typeof decoded.number).toEqual('number');
    expect(typeof decoded.string).toEqual('string');
  });

  it('encodes and decodes strings', async () => {
    const str = bsonUrlEncoding.encode('string _id');

    expect(str).toEqual('InN0cmluZyBfaWQi');

    const decoded = bsonUrlEncoding.decode(str);
    expect(decoded).toEqual('string _id');
    expect(typeof decoded).toEqual('string');
  });
});
