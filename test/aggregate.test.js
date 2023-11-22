const _ = require('underscore');

const dbUtils = require('./support/db');
const paging = require('../');

const driver = process.env.DRIVER;

describe('aggregate', () => {
  let mongod;
  let client;
  const t = {};
  beforeAll(async () => {
    mongod = dbUtils.start();
    ({ db: t.db, client } = await dbUtils.db(mongod, driver));

    // Set up collections once for testing later.
    await Promise.all([
      t.db.collection('test_paging').insertMany([
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
      t.db.collection('test_aggregation').insertMany([
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
      t.db.collection('test_aggregation_lookup').insertMany([
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
      t.db.collection('test_aggregation_lookup').createIndex(
        {
          name: 'text',
        },
        {
          name: 'test_index',
        }
      ),
      t.db.collection('test_aggregation_sort').insertMany([
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
      t.db
        .collection('test_null_values')
        .insertMany(
          [
            undefined,
            undefined,
            undefined,
            null,
            null,
            'Alice',
            'Bob',
            'alpha',
            'bravo',
          ].map((name, i) => (name === undefined ? { _id: i + 1 } : { _id: i + 1, name }))
        ),
    ]);
  });

  afterAll(async () => {
    await (client ? client.close() : t.db.close());
    await mongod.stop();
  });

  beforeEach(() => {
    paging.config.COLLATION = undefined;
  });

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
          { $unwind: '$planets' },
        ],
        limit: 3,
      });

      expect(res.results.length).toEqual(3);
      expect(_.pluck(res.results, 'planets')).toEqual(
        expect.arrayContaining(['jupiter', 'venus', 'mars'])
      );
      expect(res.hasNext).toBe(true);
    });
  });

  describe('sort aggregations', () => {
    it('sorts alphabetically, uppercase first', async () => {
      const collection = t.db.collection('test_aggregation_sort');

      const res = await paging.aggregate(collection, {
        paginatedField: 'name',
        sortAscending: true,
      });

      expect(_.pluck(res.results, 'name')).toEqual([
        'Alpha',
        'Beta',
        'Gamma',
        'aleph',
        'bet',
        'gimel',
      ]);

      const res_localized = await paging.aggregate(collection, {
        paginatedField: 'name',
        sortAscending: true,
        collation: { locale: 'en' },
      });

      expect(_.pluck(res_localized.results, 'name')).toEqual([
        'aleph',
        'Alpha',
        'bet',
        'Beta',
        'Gamma',
        'gimel',
      ]);

      paging.config.COLLATION = { locale: 'en' };

      const res_static_localized = await paging.aggregate(collection, {
        paginatedField: 'name',
        sortAscending: true,
      });

      expect(_.pluck(res_static_localized.results, 'name')).toEqual([
        'aleph',
        'Alpha',
        'bet',
        'Beta',
        'Gamma',
        'gimel',
      ]);

      const res_excluding_collation = await paging.aggregate(collection, {
        paginatedField: 'name',
        sortAscending: true,
        limit: 10,
        collation: null,
      });

      expect(_.pluck(res_excluding_collation.results, 'name')).toEqual([
        'Alpha',
        'Beta',
        'Gamma',
        'aleph',
        'bet',
        'gimel',
      ]);
    });
  });

  describe('aggregation options', () => {
    let spy;
    beforeEach(() => {
      spy = jest.spyOn(paging, 'aggregate');
    });

    afterEach(() => {
      spy.mockRestore();
    });

    it('invokes aggregate with a `hint` if one is passed in via params object', async () => {
      const collection = t.db.collection('test_aggregation_lookup');

      await paging.aggregate(collection, {
        aggregation: [
          {
            $sort: { name: 1 },
          },
        ],
        hint: 'test_index',
      });

      expect(spy).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ hint: 'test_index' })
      );
    });
  });

  describe('sorting without collation', () => {
    let collection;
    beforeAll(() => {
      collection = t.db.collection('test_aggregation_sort');
    });

    describe('without the `sortCaseInsensitive` parameter...', () => {
      const options = {
        paginatedField: 'name',
        sortAscending: true,
        limit: 2,
      };
      it('sorts capital letters first', async () => {
        const { results: results } = await paging.aggregate(collection, options);
        expect(_.pluck(results, 'name')).toEqual(['Alpha', 'Beta']);
      });

      it('sorts null and undefined values at the start', async () => {
        const collection = t.db.collection('test_null_values');

        const pg1 = await paging.aggregate(collection, { ...options });
        expect(pg1.hasNext).toBe(true);
        expect(pg1.hasPrevious).toBe(false);
        expect(_.pluck(pg1.results, 'name')).toEqual([undefined, undefined]);
        expect(_.pluck(pg1.results, '_id')).toEqual([1, 2]);

        const pg2 = await paging.aggregate(collection, {
          ...options,
          next: pg1.next,
        });
        expect(pg2.hasNext).toBe(true);
        expect(pg2.hasPrevious).toBe(true);
        expect(_.pluck(pg2.results, 'name')).toEqual([undefined, null]);
        expect(_.pluck(pg2.results, '_id')).toEqual([3, 4]);

        const pg3 = await paging.aggregate(collection, {
          ...options,
          next: pg2.next,
        });
        expect(pg3.hasNext).toBe(true);
        expect(pg3.hasPrevious).toBe(true);
        expect(_.pluck(pg3.results, 'name')).toEqual([null, 'Alice']);
        expect(_.pluck(pg3.results, '_id')).toEqual([5, 6]);

        const pg4 = await paging.aggregate(collection, {
          ...options,
          next: pg3.next,
        });
        expect(pg4.hasNext).toBe(true);
        expect(pg4.hasPrevious).toBe(true);
        expect(_.pluck(pg4.results, 'name')).toEqual(['Bob', 'alpha']);
        expect(_.pluck(pg4.results, '_id')).toEqual([7, 8]);

        const pg3b = await paging.aggregate(collection, {
          ...options,
          previous: pg4.previous,
        });
        expect(pg3b.hasNext).toBe(true);
        expect(pg3b.next).toEqual(pg3.next);
        expect(pg3b.hasPrevious).toBe(true);
        expect(pg3b.previous).toEqual(pg3.previous);
        expect(pg3b.results).toEqual(pg3.results);

        const pg2b = await paging.aggregate(collection, {
          ...options,
          previous: pg3.previous,
        });
        expect(pg2b.hasNext).toBe(true);
        expect(pg2b.next).toEqual(pg2.next);
        expect(pg2b.hasPrevious).toBe(true);
        expect(pg2b.previous).toEqual(pg2.previous);
        expect(pg2b.results).toEqual(pg2.results);

        const pg1b = await paging.aggregate(collection, {
          ...options,
          previous: pg2.previous,
        });
        expect(pg1b.hasNext).toBe(true);
        expect(pg1b.next).toEqual(pg1.next);
        expect(pg1b.hasPrevious).toBe(false);
        expect(pg1b.previous).toEqual(pg1.previous);
        expect(pg1b.results).toEqual(pg1.results);
      });
    });

    describe('with the `sortCaseInsensitive` parameter...', () => {
      const options = {
        paginatedField: 'name',
        sortCaseInsensitive: true,
        sortAscending: true,
        limit: 2,
      };

      it('sorts case-insensitively', async () => {
        const r = await paging.aggregate(collection, { ...options });
        expect(_.pluck(r.results, 'name')).toEqual(['aleph', 'Alpha']);
        expect(r.hasNext).toBe(true);
        expect(r.hasPrevious).toBe(false);
      });

      it('returns the paginated field but not the temporary __lc field', async () => {
        const r = await paging.aggregate(collection, { ...options });
        expect('name' in r.results[0]).toBe(true);
        expect('__lc' in r.results[0]).toBe(false);
      });

      it('pages correctly forward and backward', async () => {
        const { next } = await paging.aggregate(collection, { ...options });
        const pg2 = await paging.aggregate(collection, { ...options, next });
        expect(_.pluck(pg2.results, 'name')).toEqual(['bet', 'Beta']);
        expect(pg2.hasPrevious).toBe(true);
        const pg1 = await paging.aggregate(collection, { ...options, previous: pg2.previous });
        expect(_.pluck(pg1.results, 'name')).toEqual(['aleph', 'Alpha']);
        expect(pg1.hasNext).toBe(true);
        expect(pg1.hasPrevious).toBe(false);
        expect(pg1.next).toEqual(next);
      });

      it('sorts null and undefined values at the start', async () => {
        const collection = t.db.collection('test_null_values');

        const pg1 = await paging.aggregate(collection, { ...options });
        expect(pg1.hasNext).toBe(true);
        expect(pg1.hasPrevious).toBe(false);
        expect(_.pluck(pg1.results, 'name')).toEqual([undefined, undefined]);
        expect(_.pluck(pg1.results, '_id')).toEqual([1, 2]);

        const pg2 = await paging.aggregate(collection, {
          ...options,
          next: pg1.next,
        });
        expect(pg2.hasNext).toBe(true);
        expect(pg2.hasPrevious).toBe(true);
        expect(_.pluck(pg2.results, 'name')).toEqual([undefined, null]);
        expect(_.pluck(pg2.results, '_id')).toEqual([3, 4]);

        const pg3 = await paging.aggregate(collection, {
          ...options,
          next: pg2.next,
        });
        expect(pg3.hasNext).toBe(true);
        expect(pg3.hasPrevious).toBe(true);
        expect(_.pluck(pg3.results, 'name')).toEqual([null, 'Alice']);
        expect(_.pluck(pg3.results, '_id')).toEqual([5, 6]);

        const pg4 = await paging.aggregate(collection, {
          ...options,
          next: pg3.next,
        });
        expect(pg4.hasNext).toBe(true);
        expect(pg4.hasPrevious).toBe(true);
        expect(_.pluck(pg4.results, 'name')).toEqual(['alpha', 'Bob']);
        expect(_.pluck(pg4.results, '_id')).toEqual([8, 7]);

        const pg3b = await paging.aggregate(collection, {
          ...options,
          previous: pg4.previous,
        });
        expect(pg3b.hasNext).toBe(true);
        expect(pg3b.next).toEqual(pg3.next);
        expect(pg3b.hasPrevious).toBe(true);
        expect(pg3b.previous).toEqual(pg3.previous);
        expect(pg3b.results).toEqual(pg3.results);

        const pg2b = await paging.aggregate(collection, {
          ...options,
          previous: pg3.previous,
        });
        expect(pg2b.hasNext).toBe(true);
        expect(pg2b.next).toEqual(pg2.next);
        expect(pg2b.hasPrevious).toBe(true);
        expect(pg2b.previous).toEqual(pg2.previous);
        expect(pg2b.results).toEqual(pg2.results);

        const pg1b = await paging.aggregate(collection, {
          ...options,
          previous: pg2.previous,
        });
        expect(pg1b.hasNext).toBe(true);
        expect(pg1b.next).toEqual(pg1.next);
        expect(pg1b.hasPrevious).toBe(false);
        expect(pg1b.previous).toEqual(pg1.previous);
        expect(pg1b.results).toEqual(pg1.results);
      });
    });
  });
});
