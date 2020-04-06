const { describe } = require('ava-spec');
const test = require('ava');
const paging = require('../');
const dbUtils = require('./support/db');

const driver = process.env.DRIVER;

let mongod;
test.before('start mongo server', async () => {
  mongod = dbUtils.start();
  const db = await dbUtils.db(mongod, driver);

  await Promise.all([
    db.collection('test_paging_search').ensureIndex(
      {
        mytext: 'text',
      },
      {
        name: 'test_index',
      }
    ),
    db.collection('test_duplicate_search').ensureIndex(
      {
        mytext: 'text',
      },
      {
        name: 'test_index',
      }
    ),
  ]);

  await Promise.all([
    db.collection('test_paging_search').insert([
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
    db.collection('test_duplicate_search').insert([
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

describe('search', (it) => {
  it.beforeEach(async (t) => {
    t.context.db = await dbUtils.db(mongod, driver);
  });

  it.describe('basic usage', (it) => {
    it('should query first few pages', async (t) => {
      const collection = t.context.db.collection('test_paging_search');
      // First page of 2
      let res = await paging.search(collection, 'one', {
        fields: {
          mytext: 1,
        },
        limit: 2,
      });

      t.is(res.results.length, 2);
      t.is(res.results[0].mytext, 'one');
      t.is(res.results[0].score, 1.1);
      t.is(res.results[1].mytext, 'one two');
      t.is(res.results[1].score, 0.75);
      t.falsy(res.previous);
      t.is(typeof res.next, 'string');

      // Go forward 2
      res = await paging.search(collection, 'one', {
        fields: {
          mytext: 1,
        },
        limit: 3,
        next: res.next,
      });

      t.is(res.results.length, 3);
      t.is(res.results[0].mytext, 'one two three');
      t.is(res.results[0].score, 0.6666666666666666);
      t.is(res.results[1].mytext, 'one two three four');
      t.is(res.results[1].score, 0.625);
      t.is(res.results[2].mytext, 'one two three four five');
      t.is(res.results[2].score, 0.6);
      t.is(typeof res.next, 'string');

      // Go forward another 2
      res = await paging.search(collection, 'one', {
        fields: {
          mytext: 1,
        },
        limit: 4,
        next: res.next,
      });

      t.is(res.results.length, 3);
      t.is(res.results[0].mytext, 'one two three four five six');
      t.is(res.results[0].score, 0.5833333333333334);
      t.is(res.results[1].mytext, 'one two three four five six seven');
      t.is(res.results[1].score, 0.5714285714285714);
      t.is(res.results[2].mytext, 'one two three four five six seven eight');
      t.is(res.results[2].score, 0.5625);
      t.is(res.next, undefined);
    });
  });

  it.describe('duplicate scores', (it) => {
    it('should query first few pages', async (t) => {
      const collection = t.context.db.collection('test_duplicate_search');
      // First page of 2.
      let res = await paging.search(collection, 'one', {
        fields: {
          mytext: 1,
          counter: 1,
        },
        limit: 2,
      });

      t.is(res.results.length, 2);
      t.is(res.results[0].counter, 1);
      t.is(res.results[1].counter, 2);
      t.falsy(res.previous);
      t.is(typeof res.next, 'string');

      // Go forward 2
      res = await paging.search(collection, 'one', {
        fields: {
          mytext: 1,
          counter: 1,
        },
        limit: 2,
        next: res.next,
      });

      t.is(res.results.length, 2);
      t.is(res.results[0].counter, 3);
      t.is(res.results[1].counter, 4);
      t.is(typeof res.next, 'string');

      // Go forward another 2
      res = await paging.search(collection, 'one', {
        fields: {
          mytext: 1,
          counter: 1,
        },
        limit: 4,
        next: res.next,
      });

      t.is(res.results.length, 2);
      t.is(res.results[0].counter, 5);
      t.is(res.results[1].counter, 6);
      t.is(res.next, undefined);
    });
  });
});
