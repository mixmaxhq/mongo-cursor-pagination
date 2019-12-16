const { describe } = require('ava-spec');
const test = require('ava');
const paging = require('../');
const dbUtils = require('./support/db');
const _ = require('underscore');

const driver = process.env.DRIVER;

let mongod;
test.before('start mongo server', async () => {
  mongod = dbUtils.start();
  const db = await dbUtils.db(mongod, driver);

  // Set up collections once for testing later.
  await Promise.all([
    db.collection('test_paging').insert([{
      counter: 1
    }, {
      counter: 2
    }, {
      counter: 3
    }, {
      counter: 4,
      color: 'blue'
    }, {
      counter: 5,
      color: 'blue'
    }, {
      counter: 6,
      color: 'blue'
    }, {
      counter: 7,
      color: 'blue'
    }, {
      counter: 8,
      color: 'blue'
    }]),
    db.collection('test_aggregation').insert([{
      items: [1,2,3]
    }, {
      items: [4,5,6]
    }, {
      items: [1,3,6]
    }, {
      items: [2,4,5]
    }]),
    db.collection('test_aggregation_lookup').insert([{
      _id: 1,
      name: 'mercury'
    }, {
      _id: 2,
      name: 'venus'
    }, {
      _id: 3,
      name: 'earth'
    }, {
      _id: 4,
      name: 'mars'
    }, {
      _id: 5,
      name: 'jupiter'
    }, {
      _id: 6,
      name: 'saturn'
    }]),
    db.collection('test_aggregation_sort').insert([{
      name: 'Alpha'
    }, {
      name: 'gimel'
    }, {
      name: 'Beta'
    }, {
      name: 'bet'
    }, {
      name: 'Gamma'
    }, {
      name: 'aleph'
    }])
  ]);
});

describe('aggregate', (it) => {
  it.beforeEach(async (t) => {
    t.context.db = await dbUtils.db(mongod, driver);
  });

  it.describe('test pagination', (it) => {
    it('should query first few pages with next/previous', async (t) => {
      const collection = t.context.db.collection('test_paging');
      // First page of 3
      let res = await paging.aggregate(collection, {
        limit: 3
      });

      t.is(res.results.length, 3);
      t.is(res.results[0].counter, 8);
      t.is(res.results[1].counter, 7);
      t.is(res.results[2].counter, 6);
      t.false(res.hasPrevious);
      t.true(res.hasNext);

      // Go forward 3
      res = await paging.aggregate(collection, {
        limit: 3,
        next: res.next
      });

      t.is(res.results.length, 3);
      t.is(res.results[0].counter, 5);
      t.is(res.results[1].counter, 4);
      t.is(res.results[2].counter, 3);
      t.true(res.hasPrevious);
      t.true(res.hasNext);

      // Go forward another 3
      res = await paging.aggregate(collection, {
        limit: 3,
        next: res.next
      });

      t.is(res.results.length, 2);
      t.is(res.results[0].counter, 2);
      t.is(res.results[1].counter, 1);
      t.true(res.hasPrevious);
      t.false(res.hasNext);

      // Now back up 3
      res = await paging.aggregate(collection, {
        limit: 3,
        previous: res.previous
      });

      t.is(res.results.length, 3);
      t.is(res.results[0].counter, 5);
      t.is(res.results[1].counter, 4);
      t.is(res.results[2].counter, 3);
      t.true(res.hasPrevious);
      t.true(res.hasNext);

      // Now back up 3 more
      res = await paging.aggregate(collection, {
        limit: 3,
        previous: res.previous
      });

      t.is(res.results.length, 3);
      t.is(res.results[0].counter, 8);
      t.is(res.results[1].counter, 7);
      t.is(res.results[2].counter, 6);
      t.false(res.hasPrevious);
      t.true(res.hasNext);
    });

    it('should query first few pages with after/before', async (t) => {
      const collection = t.context.db.collection('test_paging');
      // First page of 3
      let res = await paging.aggregate(collection, {
        limit: 3
      });

      t.is(res.results.length, 3);
      t.is(res.results[0].counter, 8);
      t.is(res.results[1].counter, 7);
      t.is(res.results[2].counter, 6);
      t.false(res.hasPrevious);
      t.true(res.hasNext);

      // Go forward 3
      res = await paging.aggregate(collection, {
        limit: 3,
        after: res.results[res.results.length -1]._id
      });

      t.is(res.results.length, 3);
      t.is(res.results[0].counter, 5);
      t.is(res.results[1].counter, 4);
      t.is(res.results[2].counter, 3);
      t.true(res.hasPrevious);
      t.true(res.hasNext);

      // Go forward another 3
      res = await paging.aggregate(collection, {
        limit: 3,
        after: res.results[res.results.length -1]._id
      });

      t.is(res.results.length, 2);
      t.is(res.results[0].counter, 2);
      t.is(res.results[1].counter, 1);
      t.true(res.hasPrevious);
      t.false(res.hasNext);

      // Now back up 3
      res = await paging.aggregate(collection, {
        limit: 3,
        before: res.results[0]._id
      });

      t.is(res.results.length, 3);
      t.is(res.results[0].counter, 5);
      t.is(res.results[1].counter, 4);
      t.is(res.results[2].counter, 3);
      t.true(res.hasPrevious);
      t.true(res.hasNext);

      // Now back up 3 more
      res = await paging.aggregate(collection, {
        limit: 3,
        before: res.results[0]._id
      });

      t.is(res.results.length, 3);
      t.is(res.results[0].counter, 8);
      t.is(res.results[1].counter, 7);
      t.is(res.results[2].counter, 6);
      t.false(res.hasPrevious);
      t.true(res.hasNext);
    });

    it('should handle hitting the end with next/previous', async (t) => {
      const collection = t.context.db.collection('test_paging');
      // First page of 2
      var res = await paging.aggregate(collection, {
        limit: 4
      });

      t.is(res.results.length, 4);
      t.is(res.results[0].counter, 8);
      t.is(res.results[1].counter, 7);
      t.is(res.results[2].counter, 6);
      t.is(res.results[3].counter, 5);
      t.false(res.hasPrevious);
      t.true(res.hasNext);

      // Go forward 2
      res = await paging.aggregate(collection, {
        limit: 3,
        next: res.next
      });

      t.is(res.results.length, 3);
      t.is(res.results[0].counter, 4);
      t.is(res.results[1].counter, 3);
      t.is(res.results[2].counter, 2);
      t.true(res.hasPrevious);
      t.true(res.hasNext);

      // Go forward another 1, results should be empty.
      res = await paging.aggregate(collection, {
        limit: 2,
        next: res.next
      });

      t.is(res.results.length, 1);
      t.is(res.results[0].counter, 1);
      t.true(res.hasPrevious);
      t.false(res.hasNext);
    });

    it('should handle hitting the end with after/before', async (t) => {
      const collection = t.context.db.collection('test_paging');
      // First page of 2
      var res = await paging.aggregate(collection, {
        limit: 4
      });

      t.is(res.results.length, 4);
      t.is(res.results[0].counter, 8);
      t.is(res.results[1].counter, 7);
      t.is(res.results[2].counter, 6);
      t.is(res.results[3].counter, 5);
      t.false(res.hasPrevious);
      t.true(res.hasNext);

      // Go forward 2
      res = await paging.aggregate(collection, {
        limit: 3,
        after: res.results[res.results.length -1]._id
      });

      t.is(res.results.length, 3);
      t.is(res.results[0].counter, 4);
      t.is(res.results[1].counter, 3);
      t.is(res.results[2].counter, 2);
      t.true(res.hasPrevious);
      t.true(res.hasNext);

      // Go forward another 1, results should be empty.
      res = await paging.aggregate(collection, {
        limit: 2,
        after: res.results[res.results.length -1]._id
      });

      t.is(res.results.length, 1);
      t.is(res.results[0].counter, 1);
      t.true(res.hasPrevious);
      t.false(res.hasNext);
    });

    it('should handle hitting the beginning with next/previous', async (t) => {
      const collection = t.context.db.collection('test_paging');
      // First page of 2
      var res = await paging.aggregate(collection, {
        limit: 4
      });

      t.is(res.results.length, 4);
      t.is(res.results[0].counter, 8);
      t.is(res.results[1].counter, 7);
      t.is(res.results[2].counter, 6);
      t.is(res.results[3].counter, 5);
      t.false(res.hasPrevious);
      t.true(res.hasNext);

      // Go forward 2
      res = await paging.aggregate(collection, {
        limit: 3,
        next: res.next
      });

      t.is(res.results.length, 3);
      t.is(res.results[0].counter, 4);
      t.is(res.results[1].counter, 3);
      t.is(res.results[2].counter, 2);
      t.true(res.hasPrevious);
      t.true(res.hasNext);

      // Go back to beginning.
      res = await paging.aggregate(collection, {
        limit: 100,
        previous: res.previous
      });

      t.is(res.results.length, 4);
      t.is(res.results[0].counter, 8);
      t.is(res.results[1].counter, 7);
      t.is(res.results[2].counter, 6);
      t.is(res.results[3].counter, 5);
      t.false(res.hasPrevious);
      t.true(res.hasNext);
    });

    it('should handle hitting the beginning with after/before', async (t) => {
      const collection = t.context.db.collection('test_paging');
      // First page of 2
      var res = await paging.aggregate(collection, {
        limit: 4
      });

      t.is(res.results.length, 4);
      t.is(res.results[0].counter, 8);
      t.is(res.results[1].counter, 7);
      t.is(res.results[2].counter, 6);
      t.is(res.results[3].counter, 5);
      t.false(res.hasPrevious);
      t.true(res.hasNext);

      // Go forward 2
      res = await paging.aggregate(collection, {
        limit: 3,
        after: res.results[res.results.length -1]._id
      });

      t.is(res.results.length, 3);
      t.is(res.results[0].counter, 4);
      t.is(res.results[1].counter, 3);
      t.is(res.results[2].counter, 2);
      t.true(res.hasPrevious);
      t.true(res.hasNext);

      // Go back to beginning.
      res = await paging.aggregate(collection, {
        limit: 100,
        before: res.results[0]._id
      });

      t.is(res.results.length, 4);
      t.is(res.results[0].counter, 8);
      t.is(res.results[1].counter, 7);
      t.is(res.results[2].counter, 6);
      t.is(res.results[3].counter, 5);
      t.false(res.hasPrevious);
      t.true(res.hasNext);
    });

    it('should use passed-in simple aggregation', async (t) => {
      const collection = t.context.db.collection('test_paging');
      // First page.
      var res = await paging.aggregate(collection, {
        aggregation: [{
          $match: { color: 'blue' }
        }]
      });

      t.is(res.results.length, 5);
      t.is(res.results[0].color, 'blue');
      t.false(res.hasNext);
      t.false(res.hasPrevious);
    });

    it('should not return "next" or "previous" if there are no results', async (t) => {
      const collection = t.context.db.collection('test_paging');
      // First page.
      var res = await paging.aggregate(collection, {
        limit: 3,
        aggregation: [{
          $match: { nonexistantfield: true }
        }]
      });

      t.is(res.results.length, 0);
      t.false(res.hasNext);
      t.false(res.hasPrevious);
    });

    it('should respect sortAscending option with next/previous', async (t) => {
      const collection = t.context.db.collection('test_paging');
      // First page of 3
      var res = await paging.aggregate(collection, {
        limit: 3,
        sortAscending: true
      });

      t.is(res.results.length, 3);
      t.is(res.results[0].counter, 1);
      t.is(res.results[1].counter, 2);
      t.is(res.results[2].counter, 3);
      t.false(res.hasPrevious);
      t.true(res.hasNext);

      // Go forward 3
      res = await paging.aggregate(collection, {
        limit: 3,
        next: res.next,
        sortAscending: true
      });

      t.is(res.results.length, 3);
      t.is(res.results[0].counter, 4);
      t.is(res.results[1].counter, 5);
      t.is(res.results[2].counter, 6);
      t.true(res.hasPrevious);
      t.true(res.hasNext);

      // Go forward another 3
      res = await paging.aggregate(collection, {
        limit: 3,
        next: res.next,
        sortAscending: true
      });

      t.is(res.results.length, 2);
      t.is(res.results[0].counter, 7);
      t.is(res.results[1].counter, 8);
      t.true(res.hasPrevious);
      t.false(res.hasNext);

      // // Now back up 3
      res = await paging.aggregate(collection, {
        limit: 3,
        previous: res.previous,
        sortAscending: true
      });

      t.is(res.results.length, 3);
      t.is(res.results[0].counter, 4);
      t.is(res.results[1].counter, 5);
      t.is(res.results[2].counter, 6);
      t.true(res.hasPrevious);
      t.true(res.hasNext);

      // Now back up 3 more
      res = await paging.aggregate(collection, {
        limit: 3,
        previous: res.previous,
        sortAscending: true
      });

      t.is(res.results.length, 3);
      t.is(res.results[0].counter, 1);
      t.is(res.results[1].counter, 2);
      t.is(res.results[2].counter, 3);
      t.false(res.hasPrevious);
      t.true(res.hasNext);
    });

    it('should respect sortAscending option with after/before', async (t) => {
      const collection = t.context.db.collection('test_paging');
      // First page of 3
      var res = await paging.aggregate(collection, {
        limit: 3,
        sortAscending: true
      });

      t.is(res.results.length, 3);
      t.is(res.results[0].counter, 1);
      t.is(res.results[1].counter, 2);
      t.is(res.results[2].counter, 3);
      t.false(res.hasPrevious);
      t.true(res.hasNext);

      // Go forward 3
      res = await paging.aggregate(collection, {
        limit: 3,
        after: res.results[res.results.length -1]._id,
        sortAscending: true
      });

      t.is(res.results.length, 3);
      t.is(res.results[0].counter, 4);
      t.is(res.results[1].counter, 5);
      t.is(res.results[2].counter, 6);
      t.true(res.hasPrevious);
      t.true(res.hasNext);

      // Go forward another 3
      res = await paging.aggregate(collection, {
        limit: 3,
        after: res.results[res.results.length -1]._id,
        sortAscending: true
      });

      t.is(res.results.length, 2);
      t.is(res.results[0].counter, 7);
      t.is(res.results[1].counter, 8);
      t.true(res.hasPrevious);
      t.false(res.hasNext);

      // // Now back up 3
      res = await paging.aggregate(collection, {
        limit: 3,
        before: res.results[0]._id,
        sortAscending: true
      });

      t.is(res.results.length, 3);
      t.is(res.results[0].counter, 4);
      t.is(res.results[1].counter, 5);
      t.is(res.results[2].counter, 6);
      t.true(res.hasPrevious);
      t.true(res.hasNext);

      // Now back up 3 more
      res = await paging.aggregate(collection, {
        limit: 3,
        before: res.results[0]._id,
        sortAscending: true
      });

      t.is(res.results.length, 3);
      t.is(res.results[0].counter, 1);
      t.is(res.results[1].counter, 2);
      t.is(res.results[2].counter, 3);
      t.false(res.hasPrevious);
      t.true(res.hasNext);
    });
  });

  it.describe('lookup aggregations', (it) => {
    it('return expected results from aggregation', async (t) => {
      const collection = t.context.db.collection('test_aggregation');

      const res = await paging.aggregate(collection, {
        aggregation: [{
          $match: {
            items: 5
          }
        }, {
          $unwind: '$items'
        }, {
          $lookup: {
            from: 'test_aggregation_lookup',
            localField: 'items',
            foreignField: '_id',
            as: 'itemDoc'
          }
        }, {
          $unwind: '$itemDoc'
        }, {
          $group: {
            _id: '$_id',
            planets: { $push: '$itemDoc.name' }
          }
        }],
        limit: 1
      });

      t.is(res.results.length, 1);
      t.deepEqual(res.results[0].planets, ['mars', 'jupiter', 'saturn']);
      t.true(res.hasNext);
    });
  });

  it.describe('sort aggregations', (it) => {
    it('sort alphabetically, uppercase first', async (t) => {
      const collection = t.context.db.collection('test_aggregation_sort');

      const res = await paging.aggregate(collection, {
        aggregation: [{
          $sort: { name: 1 }
        }]
      });

      paging.config.COLLATION = { locale: 'en' };

      t.deepEqual(_.pluck(res.results, 'name'), ['Alpha', 'Beta', 'Gamma', 'aleph', 'bet', 'gimel']);

      const res_localized = await paging.aggregate(collection, {
        aggregation: [{
          $sort: { name: 1 }
        }]
      });

      t.deepEqual(_.pluck(res_localized.results, 'name'), ['aleph', 'Alpha', 'bet', 'Beta', 'Gamma', 'gimel']);
    });
  });
});
