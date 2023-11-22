const dbUtils = require('./support/db');
const paging = require('../');

const driver = process.env.DRIVER;

describe('search', () => {
  let mongod;
  let client;
  const t = {};
  beforeAll(async () => {
    mongod = dbUtils.start();
    ({ db: t.db, client } = await dbUtils.db(mongod, driver));

    await Promise.all([
      t.db.collection('test_paging_search').createIndex(
        {
          mytext: 'text',
        },
        {
          name: 'test_index',
        }
      ),
      t.db.collection('test_duplicate_search').createIndex(
        {
          mytext: 'text',
        },
        {
          name: 'test_index',
        }
      ),
    ]);

    await Promise.all([
      t.db.collection('test_paging_search').insertMany([
        {
          mytext: 'one',
        },
        {
          mytext: 'one two',
        },
        {
          mytext: 'one two three',
        },
        {
          mytext: 'one two three four',
        },
        {
          mytext: 'one two three four five',
          group: 'one',
        },
        {
          mytext: 'one two three four five six',
          group: 'one',
        },
        {
          mytext: 'one two three four five six seven',
          group: 'one',
        },
        {
          mytext: 'one two three four five six seven eight',
          group: 'one',
        },
      ]),
      t.db.collection('test_duplicate_search').insertMany([
        {
          _id: 6,
          mytext: 'one',
          counter: 1,
        },
        {
          _id: 5,
          mytext: 'one',
          counter: 2,
        },
        {
          _id: 4,
          mytext: 'one',
          counter: 3,
        },
        {
          _id: 3,
          mytext: 'one two',
          counter: 4,
        },
        {
          _id: 2,
          mytext: 'one two',
          counter: 5,
        },
        {
          _id: 1,
          mytext: 'one two',
          counter: 6,
        },
      ]),
    ]);
  });

  afterAll(async () => {
    await (client ? client.close() : t.db.close());
    await mongod.stop();
  });

  describe('basic usage', () => {
    it('queries the first few pages', async () => {
      const collection = t.db.collection('test_paging_search');
      // First page of 2
      let res = await paging.search(collection, 'one', {
        fields: {
          mytext: 1,
        },
        limit: 2,
      });

      expect(res.results.length).toEqual(2);
      expect(res.results[0].mytext).toEqual('one');
      expect(res.results[0].score).toEqual(1.1);
      expect(res.results[1].mytext).toEqual('one two');
      expect(res.results[1].score).toEqual(0.75);
      expect(res.previous).toBeFalsy();
      expect(typeof res.next).toEqual('string');

      // Go forward 2
      res = await paging.search(collection, 'one', {
        fields: {
          mytext: 1,
        },
        limit: 3,
        next: res.next,
      });

      expect(res.results.length).toEqual(3);
      expect(res.results[0].mytext).toEqual('one two three');
      expect(res.results[0].score).toEqual(0.6666666666666666);
      expect(res.results[1].mytext).toEqual('one two three four');
      expect(res.results[1].score).toEqual(0.625);
      expect(res.results[2].mytext).toEqual('one two three four five');
      expect(res.results[2].score).toEqual(0.6);
      expect(typeof res.next).toEqual('string');

      // Go forward another 2
      res = await paging.search(collection, 'one', {
        fields: {
          mytext: 1,
        },
        limit: 4,
        next: res.next,
      });

      expect(res.results.length).toEqual(3);
      expect(res.results[0].mytext).toEqual('one two three four five six');
      expect(res.results[0].score).toEqual(0.5833333333333334);
      expect(res.results[1].mytext).toEqual('one two three four five six seven');
      expect(res.results[1].score).toEqual(0.5714285714285714);
      expect(res.results[2].mytext).toEqual('one two three four five six seven eight');
      expect(res.results[2].score).toEqual(0.5625);
      expect(res.next).toEqual(undefined);
    });
  });

  describe('when there are duplicate scores', () => {
    it('queries the first few pages', async () => {
      const collection = t.db.collection('test_duplicate_search');
      // First page of 2.
      let res = await paging.search(collection, 'one', {
        fields: {
          mytext: 1,
          counter: 1,
        },
        limit: 2,
      });

      expect(res.results.length).toEqual(2);
      expect(res.results[0].counter).toEqual(1);
      expect(res.results[1].counter).toEqual(2);
      expect(res.previous).toBeFalsy();
      expect(typeof res.next).toEqual('string');

      // Go forward 2
      res = await paging.search(collection, 'one', {
        fields: {
          mytext: 1,
          counter: 1,
        },
        limit: 2,
        next: res.next,
      });

      expect(res.results.length).toEqual(2);
      expect(res.results[0].counter).toEqual(3);
      expect(res.results[1].counter).toEqual(4);
      expect(typeof res.next).toEqual('string');

      // Go forward another 2
      res = await paging.search(collection, 'one', {
        fields: {
          mytext: 1,
          counter: 1,
        },
        limit: 4,
        next: res.next,
      });

      expect(res.results.length).toEqual(2);
      expect(res.results[0].counter).toEqual(5);
      expect(res.results[1].counter).toEqual(6);
      expect(res.next).toEqual(undefined);
    });
  });
});
