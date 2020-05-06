const paging = require('../');
const dbUtils = require('./support/db');
const _ = require('underscore');

const driver = process.env.DRIVER;

let mongod;

describe('aggregate', () => {
  const t = {};
  beforeAll(async () => {
    mongod = dbUtils.start();
    t.db = await dbUtils.db(mongod, driver);

    // Set up collections once for testing later.
    await Promise.all([
      t.db.collection('test_paging').insert([
        {
          counter: 1,
        },
        {
          counter: 2,
        },
        {
          counter: 3,
        },
        {
          counter: 4,
          color: 'blue',
        },
        {
          counter: 5,
          color: 'blue',
        },
        {
          counter: 6,
          color: 'blue',
        },
        {
          counter: 7,
          color: 'blue',
        },
        {
          counter: 8,
          color: 'blue',
        },
      ]),
      t.db.collection('test_aggregation').insert([
        {
          items: [1, 2, 3],
        },
        {
          items: [4, 5, 6],
        },
        {
          items: [1, 3, 6],
        },
        {
          items: [2, 4, 5],
        },
      ]),
      t.db.collection('test_aggregation_lookup').insert([
        {
          _id: 1,
          name: 'mercury',
        },
        {
          _id: 2,
          name: 'venus',
        },
        {
          _id: 3,
          name: 'earth',
        },
        {
          _id: 4,
          name: 'mars',
        },
        {
          _id: 5,
          name: 'jupiter',
        },
        {
          _id: 6,
          name: 'saturn',
        },
      ]),
      t.db.collection('test_aggregation_sort').insert([
        {
          name: 'Alpha',
        },
        {
          name: 'gimel',
        },
        {
          name: 'Beta',
        },
        {
          name: 'bet',
        },
        {
          name: 'Gamma',
        },
        {
          name: 'aleph',
        },
      ]),
    ]);
  });

  afterAll(() => mongod.stop());

  describe('test pagination', () => {
    it('queries the first few pages with next/previous', async () => {
      const collection = t.db.collection('test_paging');
      // First page of 3
      let res = await paging.aggregate(collection, {
        limit: 3,
      });

      expect(res.results.length).toEqual(3);
      expect(res.results[0].counter).toEqual(8);
      expect(res.results[1].counter).toEqual(7);
      expect(res.results[2].counter).toEqual(6);
      expect(res.hasPrevious).toBe(false);
      expect(res.hasNext).toBe(true);

      // Go forward 3
      res = await paging.aggregate(collection, {
        limit: 3,
        next: res.next,
      });

      expect(res.results.length).toEqual(3);
      expect(res.results[0].counter).toEqual(5);
      expect(res.results[1].counter).toEqual(4);
      expect(res.results[2].counter).toEqual(3);
      expect(res.hasPrevious).toBe(true);
      expect(res.hasNext).toBe(true);

      // Go forward another 3
      res = await paging.aggregate(collection, {
        limit: 3,
        next: res.next,
      });

      expect(res.results.length).toEqual(2);
      expect(res.results[0].counter).toEqual(2);
      expect(res.results[1].counter).toEqual(1);
      expect(res.hasPrevious).toBe(true);
      expect(res.hasNext).toBe(false);

      // Now back up 3
      res = await paging.aggregate(collection, {
        limit: 3,
        previous: res.previous,
      });

      expect(res.results.length).toEqual(3);
      expect(res.results[0].counter).toEqual(5);
      expect(res.results[1].counter).toEqual(4);
      expect(res.results[2].counter).toEqual(3);
      expect(res.hasPrevious).toBe(true);
      expect(res.hasNext).toBe(true);

      // Now back up 3 more
      res = await paging.aggregate(collection, {
        limit: 3,
        previous: res.previous,
      });

      expect(res.results.length).toEqual(3);
      expect(res.results[0].counter).toEqual(8);
      expect(res.results[1].counter).toEqual(7);
      expect(res.results[2].counter).toEqual(6);
      expect(res.hasPrevious).toBe(false);
      expect(res.hasNext).toBe(true);
    });

    it('queries the first few pages with after/before', async () => {
      const collection = t.db.collection('test_paging');
      // First page of 3
      let res = await paging.aggregate(collection, {
        limit: 3,
      });

      expect(res.results.length).toEqual(3);
      expect(res.results[0].counter).toEqual(8);
      expect(res.results[1].counter).toEqual(7);
      expect(res.results[2].counter).toEqual(6);
      expect(res.hasPrevious).toBe(false);
      expect(res.hasNext).toBe(true);

      // Go forward 3
      res = await paging.aggregate(collection, {
        limit: 3,
        after: res.results[res.results.length - 1]._id,
      });

      expect(res.results.length).toEqual(3);
      expect(res.results[0].counter).toEqual(5);
      expect(res.results[1].counter).toEqual(4);
      expect(res.results[2].counter).toEqual(3);
      expect(res.hasPrevious).toBe(true);
      expect(res.hasNext).toBe(true);

      // Go forward another 3
      res = await paging.aggregate(collection, {
        limit: 3,
        after: res.results[res.results.length - 1]._id,
      });

      expect(res.results.length).toEqual(2);
      expect(res.results[0].counter).toEqual(2);
      expect(res.results[1].counter).toEqual(1);
      expect(res.hasPrevious).toBe(true);
      expect(res.hasNext).toBe(false);

      // Now back up 3
      res = await paging.aggregate(collection, {
        limit: 3,
        before: res.results[0]._id,
      });

      expect(res.results.length).toEqual(3);
      expect(res.results[0].counter).toEqual(5);
      expect(res.results[1].counter).toEqual(4);
      expect(res.results[2].counter).toEqual(3);
      expect(res.hasPrevious).toBe(true);
      expect(res.hasNext).toBe(true);

      // Now back up 3 more
      res = await paging.aggregate(collection, {
        limit: 3,
        before: res.results[0]._id,
      });

      expect(res.results.length).toEqual(3);
      expect(res.results[0].counter).toEqual(8);
      expect(res.results[1].counter).toEqual(7);
      expect(res.results[2].counter).toEqual(6);
      expect(res.hasPrevious).toBe(false);
      expect(res.hasNext).toBe(true);
    });

    it('handles hitting the end with next/previous', async () => {
      const collection = t.db.collection('test_paging');
      // First page of 2
      let res = await paging.aggregate(collection, {
        limit: 4,
      });

      expect(res.results.length).toEqual(4);
      expect(res.results[0].counter).toEqual(8);
      expect(res.results[1].counter).toEqual(7);
      expect(res.results[2].counter).toEqual(6);
      expect(res.results[3].counter).toEqual(5);
      expect(res.hasPrevious).toBe(false);
      expect(res.hasNext).toBe(true);

      // Go forward 2
      res = await paging.aggregate(collection, {
        limit: 3,
        next: res.next,
      });

      expect(res.results.length).toEqual(3);
      expect(res.results[0].counter).toEqual(4);
      expect(res.results[1].counter).toEqual(3);
      expect(res.results[2].counter).toEqual(2);
      expect(res.hasPrevious).toBe(true);
      expect(res.hasNext).toBe(true);

      // Go forward another 1, results be empty.
      res = await paging.aggregate(collection, {
        limit: 2,
        next: res.next,
      });

      expect(res.results.length).toEqual(1);
      expect(res.results[0].counter).toEqual(1);
      expect(res.hasPrevious).toBe(true);
      expect(res.hasNext).toBe(false);
    });

    it('handles hitting the end with after/before', async () => {
      const collection = t.db.collection('test_paging');
      // First page of 2
      let res = await paging.aggregate(collection, {
        limit: 4,
      });

      expect(res.results.length).toEqual(4);
      expect(res.results[0].counter).toEqual(8);
      expect(res.results[1].counter).toEqual(7);
      expect(res.results[2].counter).toEqual(6);
      expect(res.results[3].counter).toEqual(5);
      expect(res.hasPrevious).toBe(false);
      expect(res.hasNext).toBe(true);

      // Go forward 2
      res = await paging.aggregate(collection, {
        limit: 3,
        after: res.results[res.results.length - 1]._id,
      });

      expect(res.results.length).toEqual(3);
      expect(res.results[0].counter).toEqual(4);
      expect(res.results[1].counter).toEqual(3);
      expect(res.results[2].counter).toEqual(2);
      expect(res.hasPrevious).toBe(true);
      expect(res.hasNext).toBe(true);

      // Go forward another 1, results be empty.
      res = await paging.aggregate(collection, {
        limit: 2,
        after: res.results[res.results.length - 1]._id,
      });

      expect(res.results.length).toEqual(1);
      expect(res.results[0].counter).toEqual(1);
      expect(res.hasPrevious).toBe(true);
      expect(res.hasNext).toBe(false);
    });

    it('handles hitting the beginning with next/previous', async () => {
      const collection = t.db.collection('test_paging');
      // First page of 2
      let res = await paging.aggregate(collection, {
        limit: 4,
      });

      expect(res.results.length).toEqual(4);
      expect(res.results[0].counter).toEqual(8);
      expect(res.results[1].counter).toEqual(7);
      expect(res.results[2].counter).toEqual(6);
      expect(res.results[3].counter).toEqual(5);
      expect(res.hasPrevious).toBe(false);
      expect(res.hasNext).toBe(true);

      // Go forward 2
      res = await paging.aggregate(collection, {
        limit: 3,
        next: res.next,
      });

      expect(res.results.length).toEqual(3);
      expect(res.results[0].counter).toEqual(4);
      expect(res.results[1].counter).toEqual(3);
      expect(res.results[2].counter).toEqual(2);
      expect(res.hasPrevious).toBe(true);
      expect(res.hasNext).toBe(true);

      // Go back to beginning.
      res = await paging.aggregate(collection, {
        limit: 100,
        previous: res.previous,
      });

      expect(res.results.length).toEqual(4);
      expect(res.results[0].counter).toEqual(8);
      expect(res.results[1].counter).toEqual(7);
      expect(res.results[2].counter).toEqual(6);
      expect(res.results[3].counter).toEqual(5);
      expect(res.hasPrevious).toBe(false);
      expect(res.hasNext).toBe(true);
    });

    it('handles hitting the beginning with after/before', async () => {
      const collection = t.db.collection('test_paging');
      // First page of 2
      let res = await paging.aggregate(collection, {
        limit: 4,
      });

      expect(res.results.length).toEqual(4);
      expect(res.results[0].counter).toEqual(8);
      expect(res.results[1].counter).toEqual(7);
      expect(res.results[2].counter).toEqual(6);
      expect(res.results[3].counter).toEqual(5);
      expect(res.hasPrevious).toBe(false);
      expect(res.hasNext).toBe(true);

      // Go forward 2
      res = await paging.aggregate(collection, {
        limit: 3,
        after: res.results[res.results.length - 1]._id,
      });

      expect(res.results.length).toEqual(3);
      expect(res.results[0].counter).toEqual(4);
      expect(res.results[1].counter).toEqual(3);
      expect(res.results[2].counter).toEqual(2);
      expect(res.hasPrevious).toBe(true);
      expect(res.hasNext).toBe(true);

      // Go back to beginning.
      res = await paging.aggregate(collection, {
        limit: 100,
        before: res.results[0]._id,
      });

      expect(res.results.length).toEqual(4);
      expect(res.results[0].counter).toEqual(8);
      expect(res.results[1].counter).toEqual(7);
      expect(res.results[2].counter).toEqual(6);
      expect(res.results[3].counter).toEqual(5);
      expect(res.hasPrevious).toBe(false);
      expect(res.hasNext).toBe(true);
    });

    it('uses passed-in simple aggregation', async () => {
      const collection = t.db.collection('test_paging');
      // First page.
      const res = await paging.aggregate(collection, {
        aggregation: [
          {
            $match: { color: 'blue' },
          },
        ],
      });

      expect(res.results.length).toEqual(5);
      expect(res.results[0].color).toEqual('blue');
      expect(res.hasNext).toBe(false);
      expect(res.hasPrevious).toBe(false);
    });

    it('does not return "next" or "previous" if there are no results', async () => {
      const collection = t.db.collection('test_paging');
      // First page.
      const res = await paging.aggregate(collection, {
        limit: 3,
        aggregation: [
          {
            $match: { nonexistantfield: true },
          },
        ],
      });

      expect(res.results.length).toEqual(0);
      expect(res.hasNext).toBe(false);
      expect(res.hasPrevious).toBe(false);
    });

    it('respects sortAscending option with next/previous', async () => {
      const collection = t.db.collection('test_paging');
      // First page of 3
      let res = await paging.aggregate(collection, {
        limit: 3,
        sortAscending: true,
      });

      expect(res.results.length).toEqual(3);
      expect(res.results[0].counter).toEqual(1);
      expect(res.results[1].counter).toEqual(2);
      expect(res.results[2].counter).toEqual(3);
      expect(res.hasPrevious).toBe(false);
      expect(res.hasNext).toBe(true);

      // Go forward 3
      res = await paging.aggregate(collection, {
        limit: 3,
        next: res.next,
        sortAscending: true,
      });

      expect(res.results.length).toEqual(3);
      expect(res.results[0].counter).toEqual(4);
      expect(res.results[1].counter).toEqual(5);
      expect(res.results[2].counter).toEqual(6);
      expect(res.hasPrevious).toBe(true);
      expect(res.hasNext).toBe(true);

      // Go forward another 3
      res = await paging.aggregate(collection, {
        limit: 3,
        next: res.next,
        sortAscending: true,
      });

      expect(res.results.length).toEqual(2);
      expect(res.results[0].counter).toEqual(7);
      expect(res.results[1].counter).toEqual(8);
      expect(res.hasPrevious).toBe(true);
      expect(res.hasNext).toBe(false);

      // // Now back up 3
      res = await paging.aggregate(collection, {
        limit: 3,
        previous: res.previous,
        sortAscending: true,
      });

      expect(res.results.length).toEqual(3);
      expect(res.results[0].counter).toEqual(4);
      expect(res.results[1].counter).toEqual(5);
      expect(res.results[2].counter).toEqual(6);
      expect(res.hasPrevious).toBe(true);
      expect(res.hasNext).toBe(true);

      // Now back up 3 more
      res = await paging.aggregate(collection, {
        limit: 3,
        previous: res.previous,
        sortAscending: true,
      });

      expect(res.results.length).toEqual(3);
      expect(res.results[0].counter).toEqual(1);
      expect(res.results[1].counter).toEqual(2);
      expect(res.results[2].counter).toEqual(3);
      expect(res.hasPrevious).toBe(false);
      expect(res.hasNext).toBe(true);
    });

    it('respects sortAscending option with after/before', async () => {
      const collection = t.db.collection('test_paging');
      // First page of 3
      let res = await paging.aggregate(collection, {
        limit: 3,
        sortAscending: true,
      });

      expect(res.results.length).toEqual(3);
      expect(res.results[0].counter).toEqual(1);
      expect(res.results[1].counter).toEqual(2);
      expect(res.results[2].counter).toEqual(3);
      expect(res.hasPrevious).toBe(false);
      expect(res.hasNext).toBe(true);

      // Go forward 3
      res = await paging.aggregate(collection, {
        limit: 3,
        after: res.results[res.results.length - 1]._id,
        sortAscending: true,
      });

      expect(res.results.length).toEqual(3);
      expect(res.results[0].counter).toEqual(4);
      expect(res.results[1].counter).toEqual(5);
      expect(res.results[2].counter).toEqual(6);
      expect(res.hasPrevious).toBe(true);
      expect(res.hasNext).toBe(true);

      // Go forward another 3
      res = await paging.aggregate(collection, {
        limit: 3,
        after: res.results[res.results.length - 1]._id,
        sortAscending: true,
      });

      expect(res.results.length).toEqual(2);
      expect(res.results[0].counter).toEqual(7);
      expect(res.results[1].counter).toEqual(8);
      expect(res.hasPrevious).toBe(true);
      expect(res.hasNext).toBe(false);

      // // Now back up 3
      res = await paging.aggregate(collection, {
        limit: 3,
        before: res.results[0]._id,
        sortAscending: true,
      });

      expect(res.results.length).toEqual(3);
      expect(res.results[0].counter).toEqual(4);
      expect(res.results[1].counter).toEqual(5);
      expect(res.results[2].counter).toEqual(6);
      expect(res.hasPrevious).toBe(true);
      expect(res.hasNext).toBe(true);

      // Now back up 3 more
      res = await paging.aggregate(collection, {
        limit: 3,
        before: res.results[0]._id,
        sortAscending: true,
      });

      expect(res.results.length).toEqual(3);
      expect(res.results[0].counter).toEqual(1);
      expect(res.results[1].counter).toEqual(2);
      expect(res.results[2].counter).toEqual(3);
      expect(res.hasPrevious).toBe(false);
      expect(res.hasNext).toBe(true);
    });
  });

  describe('lookup aggregations', () => {
    it('returns results from the aggregation', async () => {
      const collection = t.db.collection('test_aggregation');

      const res = await paging.aggregate(collection, {
        aggregation: [
          {
            $match: {
              items: 5,
            },
          },
          {
            $unwind: '$items',
          },
          {
            $lookup: {
              from: 'test_aggregation_lookup',
              localField: 'items',
              foreignField: '_id',
              as: 'itemDoc',
            },
          },
          {
            $unwind: '$itemDoc',
          },
          {
            $group: {
              _id: '$_id',
              planets: { $push: '$itemDoc.name' },
            },
          },
        ],
        limit: 1,
      });

      expect(res.results.length).toEqual(1);
      expect(res.results[0].planets).toEqual(['mars', 'jupiter', 'saturn']);
      expect(res.hasNext).toBe(true);
    });
  });

  describe('sort aggregations', () => {
    it('sorts alphabetically, uppercase first', async () => {
      const collection = t.db.collection('test_aggregation_sort');

      const res = await paging.aggregate(collection, {
        aggregation: [
          {
            $sort: { name: 1 },
          },
        ],
      });

      paging.config.COLLATION = { locale: 'en' };

      expect(_.pluck(res.results, 'name')).toEqual([
        'Alpha',
        'Beta',
        'Gamma',
        'aleph',
        'bet',
        'gimel',
      ]);

      const res_localized = await paging.aggregate(collection, {
        aggregation: [
          {
            $sort: { name: 1 },
          },
        ],
      });

      expect(_.pluck(res_localized.results, 'name')).toEqual([
        'aleph',
        'Alpha',
        'bet',
        'Beta',
        'Gamma',
        'gimel',
      ]);
    });
  });
});
