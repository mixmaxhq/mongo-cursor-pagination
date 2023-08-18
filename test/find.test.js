const { ObjectId } = require('mongoist');
const _ = require('underscore');

const dbUtils = require('./support/db');
const paging = require('../');
const driver = process.env.DRIVER;

describe('find', () => {
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
      t.db.collection('test_duplicate_custom_fields').insertMany([
        {
          _id: 6,
          counter: 6,
          timestamp: 1477347800603,
        },
        {
          _id: 5,
          counter: 5,
          timestamp: 1477347800603,
        },
        {
          _id: 4,
          counter: 4,
          timestamp: 1477347800603,
        },
        {
          _id: 3,
          counter: 3,
          timestamp: 1477347772077,
        },
        {
          _id: 2,
          counter: 2,
          timestamp: 1477347772077,
        },
        {
          _id: 1,
          counter: 1,
          timestamp: 1477347772077,
        },
      ]),
      t.db.collection('test_paging_custom_fields').insertMany([
        {
          counter: 6,
          timestamp: 1477347800603,
        },
        {
          counter: 5,
          timestamp: 1477347792380,
        },
        {
          counter: 4,
          timestamp: 1477347784766,
        },
        {
          counter: 3,
          timestamp: 1477347772077,
        },
        {
          counter: 2,
          timestamp: 1477347763813,
        },
        {
          counter: 1,
          timestamp: 1477347755654,
        },
      ]),
      t.db.collection('test_paging_date').insertMany([
        {
          counter: 2,
          date: new Date(1477347763813),
        },
        {
          counter: 3,
          date: new Date(1477347772077),
        },
        {
          counter: 4,
          date: new Date(1477347784766),
        },
        {
          counter: 1,
          date: new Date(1477347755654),
        },
      ]),
      t.db.collection('test_paging_date_in_object').insertMany([
        {
          counter: 2,
          start: { date: new Date(1477347763813) },
        },
        {
          counter: 3,
          start: { date: new Date(1477347772077) },
        },
        {
          counter: 4,
          start: { date: new Date(1477347784766) },
        },
        {
          counter: 1,
          start: { date: new Date(1477347755654) },
        },
      ]),
      t.db.collection('test_paging_limits').insertMany([
        {
          counter: 6,
        },
        {
          counter: 5,
        },
        {
          counter: 4,
        },
        {
          counter: 3,
        },
        {
          counter: 2,
        },
        {
          counter: 1,
        },
      ]),
      t.db.collection('test_sorting').insertMany([
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
      t.db.collection('test_null_values').insertMany(
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
        // Ids start with 1 because Mongoist driver doesn't support _id as 0
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

  describe('basic usage', () => {
    describe('when using Mongo ObjectIds', () => {
      it('queries first few pages with next/previous', async () => {
        const collection = t.db.collection('test_paging');
        // First page of 3
        let res = await paging.find(collection, {
          limit: 3,
        });

        expect(res.results.length).toEqual(3);
        expect(res.results[0].counter).toEqual(8);
        expect(res.results[1].counter).toEqual(7);
        expect(res.results[2].counter).toEqual(6);
        expect(res.hasPrevious).toBe(false);
        expect(res.hasNext).toBe(true);

        // Go forward 3
        res = await paging.find(collection, {
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
        res = await paging.find(collection, {
          limit: 3,
          next: res.next,
        });

        expect(res.results.length).toEqual(2);
        expect(res.results[0].counter).toEqual(2);
        expect(res.results[1].counter).toEqual(1);
        expect(res.hasPrevious).toBe(true);
        expect(res.hasNext).toBe(false);

        // Now back up 3
        res = await paging.find(collection, {
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
        res = await paging.find(collection, {
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

      it('queries first few pages with after/before', async () => {
        const collection = t.db.collection('test_paging');
        // First page of 3
        let res = await paging.find(collection, {
          limit: 3,
        });

        expect(res.results.length).toEqual(3);
        expect(res.results[0].counter).toEqual(8);
        expect(res.results[1].counter).toEqual(7);
        expect(res.results[2].counter).toEqual(6);
        expect(res.hasPrevious).toBe(false);
        expect(res.hasNext).toBe(true);

        // Go forward 3
        res = await paging.find(collection, {
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
        res = await paging.find(collection, {
          limit: 3,
          after: res.results[res.results.length - 1]._id,
        });

        expect(res.results.length).toEqual(2);
        expect(res.results[0].counter).toEqual(2);
        expect(res.results[1].counter).toEqual(1);
        expect(res.hasPrevious).toBe(true);
        expect(res.hasNext).toBe(false);

        // Now back up 3
        res = await paging.find(collection, {
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
        res = await paging.find(collection, {
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
        let res = await paging.find(collection, {
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
        res = await paging.find(collection, {
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
        res = await paging.find(collection, {
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
        let res = await paging.find(collection, {
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
        res = await paging.find(collection, {
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
        res = await paging.find(collection, {
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
        let res = await paging.find(collection, {
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
        res = await paging.find(collection, {
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
        res = await paging.find(collection, {
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
        let res = await paging.find(collection, {
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
        res = await paging.find(collection, {
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
        res = await paging.find(collection, {
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

      it('usees passed-in criteria', async () => {
        const collection = t.db.collection('test_paging');
        // First page.
        const res = await paging.find(collection, {
          query: {
            color: 'blue',
          },
        });

        expect(res.results.length).toEqual(5);
        expect(res.results[0].color).toEqual('blue');
        expect(res.hasNext).toBe(false);
        expect(res.hasPrevious).toBe(false);
      });

      it('uses the hint parameter', async () => {
        const collection = t.db.collection('test_paging');
        await t.db.collection('test_paging').createIndex({ color: 1 }, { name: 'color_1' });
        // First page.
        const res = await paging.find(collection, {
          query: {
            color: 'blue',
          },
          hint: 'color_1',
        });

        expect(res.results.length).toEqual(5);
        expect(res.results[0].color).toEqual('blue');
        expect(res.hasNext).toBe(false);
        expect(res.hasPrevious).toBe(false);
      });

      it('uses the "fields" parameter', async () => {
        const collection = t.db.collection('test_paging');
        // First page.
        const res = await paging.find(collection, {
          query: {
            color: 'blue',
          },
          fields: {
            _id: 1,
          },
        });

        expect(res.results.length).toEqual(5);
        expect(res.results[0].color).toBeFalsy();
      });

      it('does not return "next" or "previous" if there are no results', async () => {
        const collection = t.db.collection('test_paging');
        // First page.
        const res = await paging.find(collection, {
          limit: 3,
          query: {
            nonexistantfield: true,
          },
        });

        expect(res.results.length).toEqual(0);
        expect(res.hasNext).toBe(false);
        expect(res.hasPrevious).toBe(false);
      });

      it('respects sortAscending option with next/previous', async () => {
        const collection = t.db.collection('test_paging');
        // First page of 3
        let res = await paging.find(collection, {
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
        res = await paging.find(collection, {
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
        res = await paging.find(collection, {
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
        res = await paging.find(collection, {
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
        res = await paging.find(collection, {
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
        let res = await paging.find(collection, {
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
        res = await paging.find(collection, {
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
        res = await paging.find(collection, {
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
        res = await paging.find(collection, {
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
        res = await paging.find(collection, {
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

    describe('when using strings as _ids', () => {
      beforeEach(async () => {
        await t.db.collection('test_paging_string_ids').insertMany([
          {
            _id: new ObjectId().toString(),
            counter: 1,
          },
          {
            _id: new ObjectId().toString(),
            counter: 2,
          },
          {
            _id: new ObjectId().toString(),
            counter: 3,
          },
          {
            _id: new ObjectId().toString(),
            counter: 4,
            color: 'blue',
          },
          {
            _id: new ObjectId().toString(),
            counter: 5,
            color: 'blue',
          },
          {
            _id: new ObjectId().toString(),
            counter: 6,
            color: 'blue',
          },
          {
            _id: new ObjectId().toString(),
            counter: 7,
            color: 'blue',
          },
          {
            _id: new ObjectId().toString(),
            counter: 8,
            color: 'blue',
          },
        ]);
      });

      afterEach(async () => {
        await t.db.collection('test_paging_string_ids').remove({});
      });

      it('queries first few pages with next/previous', async () => {
        const collection = t.db.collection('test_paging_string_ids');
        // First page of 3
        let res = await paging.find(collection, {
          limit: 3,
        });

        expect(res.results.length).toEqual(3);
        expect(res.results[0].counter).toEqual(8);
        expect(res.results[1].counter).toEqual(7);
        expect(res.results[2].counter).toEqual(6);
        expect(res.hasPrevious).toBe(false);
        expect(res.hasNext).toBe(true);

        // Go forward 3
        res = await paging.find(collection, {
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
        res = await paging.find(collection, {
          limit: 3,
          next: res.next,
        });

        expect(res.results.length).toEqual(2);
        expect(res.results[0].counter).toEqual(2);
        expect(res.results[1].counter).toEqual(1);
        expect(res.hasPrevious).toBe(true);
        expect(res.hasNext).toBe(false);

        // Now back up 3
        res = await paging.find(collection, {
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
        res = await paging.find(collection, {
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

      it('queries first few pages with after/before', async () => {
        const collection = t.db.collection('test_paging_string_ids');
        // First page of 3
        let res = await paging.find(collection, {
          limit: 3,
        });

        expect(res.results.length).toEqual(3);
        expect(res.results[0].counter).toEqual(8);
        expect(res.results[1].counter).toEqual(7);
        expect(res.results[2].counter).toEqual(6);
        expect(res.hasPrevious).toBe(false);
        expect(res.hasNext).toBe(true);

        // Go forward 3
        res = await paging.find(collection, {
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
        res = await paging.find(collection, {
          limit: 3,
          after: res.results[res.results.length - 1]._id,
        });

        expect(res.results.length).toEqual(2);
        expect(res.results[0].counter).toEqual(2);
        expect(res.results[1].counter).toEqual(1);
        expect(res.hasPrevious).toBe(true);
        expect(res.hasNext).toBe(false);

        // Now back up 3
        res = await paging.find(collection, {
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
        res = await paging.find(collection, {
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
        const collection = t.db.collection('test_paging_string_ids');
        // First page of 2
        let res = await paging.find(collection, {
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
        res = await paging.find(collection, {
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
        res = await paging.find(collection, {
          limit: 2,
          next: res.next,
        });

        expect(res.results.length).toEqual(1);
        expect(res.results[0].counter).toEqual(1);
        expect(res.hasPrevious).toBe(true);
        expect(res.hasNext).toBe(false);
      });

      it('handles hitting the end with after/before', async () => {
        const collection = t.db.collection('test_paging_string_ids');
        // First page of 2
        let res = await paging.find(collection, {
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
        res = await paging.find(collection, {
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
        res = await paging.find(collection, {
          limit: 2,
          after: res.results[res.results.length - 1]._id,
        });

        expect(res.results.length).toEqual(1);
        expect(res.results[0].counter).toEqual(1);
        expect(res.hasPrevious).toBe(true);
        expect(res.hasNext).toBe(false);
      });

      it('handles hitting the beginning with next/previous', async () => {
        const collection = t.db.collection('test_paging_string_ids');
        // First page of 2
        let res = await paging.find(collection, {
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
        res = await paging.find(collection, {
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
        res = await paging.find(collection, {
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
        const collection = t.db.collection('test_paging_string_ids');
        // First page of 2
        let res = await paging.find(collection, {
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
        res = await paging.find(collection, {
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
        res = await paging.find(collection, {
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

      it('uses passed-in criteria', async () => {
        const collection = t.db.collection('test_paging_string_ids');
        // First page.
        const res = await paging.find(collection, {
          query: {
            color: 'blue',
          },
        });

        expect(res.results.length).toEqual(5);
        expect(res.results[0].color).toEqual('blue');
        expect(res.hasNext).toBe(false);
        expect(res.hasPrevious).toBe(false);
      });

      it('uses the hint parameter', async () => {
        const collection = t.db.collection('test_paging_string_ids');
        await t.db
          .collection('test_paging_string_ids')
          .createIndex({ color: 1 }, { name: 'color_1' });
        // First page.
        const res = await paging.find(collection, {
          query: {
            color: 'blue',
          },
          hint: 'color_1',
        });

        expect(res.results.length).toEqual(5);
        expect(res.results[0].color).toEqual('blue');
        expect(res.hasNext).toBe(false);
        expect(res.hasPrevious).toBe(false);
      });

      it('uses the "fields" parameter', async () => {
        const collection = t.db.collection('test_paging_string_ids');
        // First page.
        const res = await paging.find(collection, {
          query: {
            color: 'blue',
          },
          fields: {
            _id: 1,
          },
        });

        expect(res.results.length).toEqual(5);
        expect(res.results[0].color).toBeFalsy();
        expect(res.results[0]._id).not.toBeFalsy();
      });

      it('does not return "next" or "previous" if there are no results', async () => {
        const collection = t.db.collection('test_paging_string_ids');
        // First page.
        const res = await paging.find(collection, {
          limit: 3,
          query: {
            nonexistantfield: true,
          },
        });

        expect(res.results.length).toEqual(0);
        expect(res.hasNext).toBe(false);
        expect(res.hasPrevious).toBe(false);
      });

      it('respects sortAscending option with next/previous', async () => {
        const collection = t.db.collection('test_paging_string_ids');
        // First page of 3
        let res = await paging.find(collection, {
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
        res = await paging.find(collection, {
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
        res = await paging.find(collection, {
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
        res = await paging.find(collection, {
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
        res = await paging.find(collection, {
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
        const collection = t.db.collection('test_paging_string_ids');
        // First page of 3
        let res = await paging.find(collection, {
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
        res = await paging.find(collection, {
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
        res = await paging.find(collection, {
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
        res = await paging.find(collection, {
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
        res = await paging.find(collection, {
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
  });

  describe('when paginating on custom fields', () => {
    it('queries the first few pages with next/previous', async () => {
      const collection = t.db.collection('test_paging_custom_fields');
      // First page of 2
      let res = await paging.find(collection, {
        limit: 2,
        paginatedField: 'timestamp',
      });

      expect(res.results.length).toEqual(2);
      expect(res.results[0].counter).toEqual(6);
      expect(res.results[1].counter).toEqual(5);
      expect(res.hasPrevious).toBe(false);
      expect(res.hasNext).toBe(true);

      // Go forward 2
      res = await paging.find(collection, {
        limit: 2,
        paginatedField: 'timestamp',
        next: res.next,
      });

      expect(res.results.length).toEqual(2);
      expect(res.results[0].counter).toEqual(4);
      expect(res.results[1].counter).toEqual(3);
      expect(res.hasPrevious).toBe(true);
      expect(res.hasNext).toBe(true);

      // Go forward another 2
      res = await paging.find(collection, {
        limit: 2,
        paginatedField: 'timestamp',
        next: res.next,
      });

      expect(res.results.length).toEqual(2);
      expect(res.results[0].counter).toEqual(2);
      expect(res.results[1].counter).toEqual(1);
      expect(res.hasPrevious).toBe(true);
      expect(res.hasNext).toBe(false);

      // Now back up 2
      res = await paging.find(collection, {
        limit: 2,
        paginatedField: 'timestamp',
        previous: res.previous,
      });

      expect(res.results.length).toEqual(2);
      expect(res.results[0].counter).toEqual(4);
      expect(res.results[1].counter).toEqual(3);
      expect(res.hasPrevious).toBe(true);
      expect(res.hasNext).toBe(true);
    });

    it('queries the first few pages with after/before', async () => {
      const collection = t.db.collection('test_paging_custom_fields');
      // First page of 2
      let res = await paging.find(collection, {
        limit: 2,
        paginatedField: 'timestamp',
      });

      expect(res.results.length).toEqual(2);
      expect(res.results[0].counter).toEqual(6);
      expect(res.results[1].counter).toEqual(5);
      expect(res.hasPrevious).toBe(false);
      expect(res.hasNext).toBe(true);

      // Go forward 2
      res = await paging.find(collection, {
        limit: 2,
        paginatedField: 'timestamp',
        after: res.results[res.results.length - 1]._id,
      });

      expect(res.results.length).toEqual(2);
      expect(res.results[0].counter).toEqual(4);
      expect(res.results[1].counter).toEqual(3);
      expect(res.hasPrevious).toBe(true);
      expect(res.hasNext).toBe(true);

      // Go forward another 2
      res = await paging.find(collection, {
        limit: 2,
        paginatedField: 'timestamp',
        after: res.results[res.results.length - 1]._id,
      });

      expect(res.results.length).toEqual(2);
      expect(res.results[0].counter).toEqual(2);
      expect(res.results[1].counter).toEqual(1);
      expect(res.hasPrevious).toBe(true);
      expect(res.hasNext).toBe(false);

      // Now back up 2
      res = await paging.find(collection, {
        limit: 2,
        paginatedField: 'timestamp',
        before: res.results[0]._id,
      });

      expect(res.results.length).toEqual(2);
      expect(res.results[0].counter).toEqual(4);
      expect(res.results[1].counter).toEqual(3);
      expect(res.hasPrevious).toBe(true);
      expect(res.hasNext).toBe(true);
    });

    it('does not include the paginatedField in the results if not desired', async () => {
      const collection = t.db.collection('test_paging_custom_fields');
      const res = await paging.find(collection, {
        limit: 1,
        fields: {
          counter: 1,
        },
        paginatedField: 'timestamp',
      });
      expect(res.results[0].timestamp).toBe(undefined);
      expect(res.hasNext).toBe(true);
    });

    it('does not overwrite $or used in a query with next/previous', async () => {
      const collection = t.db.collection('test_paging_custom_fields');
      // First page of 2
      let res = await paging.find(collection, {
        query: { $or: [{ counter: { $gt: 3 } }] },
        limit: 2,
        paginatedField: 'timestamp',
      });

      expect(res.results.length).toEqual(2);
      expect(res.results[0].counter).toEqual(6);
      expect(res.results[1].counter).toEqual(5);
      expect(res.hasPrevious).toBe(false);
      expect(res.hasNext).toBe(true);

      // Go forward 2
      res = await paging.find(collection, {
        query: { $or: [{ counter: { $gt: 3 } }] },
        limit: 2,
        paginatedField: 'timestamp',
        next: res.next,
      });

      expect(res.results.length).toEqual(1);
      expect(res.results[0].counter).toEqual(4);
      expect(res.hasPrevious).toBe(true);
      expect(res.hasNext).toBe(false);
    });

    it('does not overwrite $or used in a query with after/before', async () => {
      const collection = t.db.collection('test_paging_custom_fields');
      // First page of 2
      let res = await paging.find(collection, {
        query: { $or: [{ counter: { $gt: 3 } }] },
        limit: 2,
        paginatedField: 'timestamp',
      });

      expect(res.results.length).toEqual(2);
      expect(res.results[0].counter).toEqual(6);
      expect(res.results[1].counter).toEqual(5);
      expect(res.hasPrevious).toBe(false);
      expect(res.hasNext).toBe(true);

      // Go forward 2
      res = await paging.find(collection, {
        query: { $or: [{ counter: { $gt: 3 } }] },
        limit: 2,
        paginatedField: 'timestamp',
        after: res.results[res.results.length - 1]._id,
      });

      expect(res.results.length).toEqual(1);
      expect(res.results[0].counter).toEqual(4);
      expect(res.hasPrevious).toBe(true);
      expect(res.hasNext).toBe(false);
    });
  });

  describe('when there are duplicate values for the paginated field', () => {
    it('queries the first few pages with next/previous', async () => {
      const collection = t.db.collection('test_duplicate_custom_fields');
      // First page of 2
      let res = await paging.find(collection, {
        limit: 2,
        paginatedField: 'timestamp',
      });

      expect(res.results.length).toEqual(2);
      expect(res.results[0].counter).toEqual(6);
      expect(res.results[1].counter).toEqual(5);
      expect(res.hasPrevious).toBe(false);
      expect(res.hasNext).toBe(true);

      // Go forward 2
      res = await paging.find(collection, {
        limit: 2,
        paginatedField: 'timestamp',
        next: res.next,
      });

      expect(res.results.length).toEqual(2);
      expect(res.results[0].counter).toEqual(4);
      expect(res.results[1].counter).toEqual(3);
      expect(res.hasPrevious).toBe(true);
      expect(res.hasNext).toBe(true);

      // Go forward another 2
      res = await paging.find(collection, {
        limit: 2,
        paginatedField: 'timestamp',
        next: res.next,
      });

      expect(res.results.length).toEqual(2);
      expect(res.results[0].counter).toEqual(2);
      expect(res.results[1].counter).toEqual(1);
      expect(res.hasPrevious).toBe(true);
      expect(res.hasNext).toBe(false);

      // Now back up 2
      res = await paging.find(collection, {
        limit: 2,
        paginatedField: 'timestamp',
        previous: res.previous,
      });

      expect(res.results.length).toEqual(2);
      expect(res.results[0].counter).toEqual(4);
      expect(res.results[1].counter).toEqual(3);
      expect(res.hasPrevious).toBe(true);
      expect(res.hasNext).toBe(true);
    });

    it('queries the first few pages with after/before', async () => {
      const collection = t.db.collection('test_duplicate_custom_fields');
      // First page of 2
      let res = await paging.find(collection, {
        limit: 2,
        paginatedField: 'timestamp',
      });

      expect(res.results.length).toEqual(2);
      expect(res.results[0].counter).toEqual(6);
      expect(res.results[1].counter).toEqual(5);
      expect(res.hasPrevious).toBe(false);
      expect(res.hasNext).toBe(true);

      // Go forward 2
      res = await paging.find(collection, {
        limit: 2,
        paginatedField: 'timestamp',
        after: res.results[res.results.length - 1]._id,
      });

      expect(res.results.length).toEqual(2);
      expect(res.results[0].counter).toEqual(4);
      expect(res.results[1].counter).toEqual(3);
      expect(res.hasPrevious).toBe(true);
      expect(res.hasNext).toBe(true);

      // Go forward another 2
      res = await paging.find(collection, {
        limit: 2,
        paginatedField: 'timestamp',
        after: res.results[res.results.length - 1]._id,
      });

      expect(res.results.length).toEqual(2);
      expect(res.results[0].counter).toEqual(2);
      expect(res.results[1].counter).toEqual(1);
      expect(res.hasPrevious).toBe(true);
      expect(res.hasNext).toBe(false);

      // Now back up 2
      res = await paging.find(collection, {
        limit: 2,
        paginatedField: 'timestamp',
        before: res.results[0]._id,
      });

      expect(res.results.length).toEqual(2);
      expect(res.results[0].counter).toEqual(4);
      expect(res.results[1].counter).toEqual(3);
      expect(res.hasPrevious).toBe(true);
      expect(res.hasNext).toBe(true);
    });

    it('does not include fields not desired', async () => {
      const collection = t.db.collection('test_duplicate_custom_fields');
      const res = await paging.find(collection, {
        limit: 1,
        fields: {
          counter: 1,
        },
        paginatedField: 'timestamp',
      });

      expect(res.results[0]).toEqual({
        counter: 6,
      });
      expect(res.hasNext).toBe(true);
    });

    it('respects sortAscending with next/previous', async () => {
      const collection = t.db.collection('test_duplicate_custom_fields');
      // First page of 2
      let res = await paging.find(collection, {
        limit: 2,
        paginatedField: 'timestamp',
        sortAscending: true,
      });

      expect(res.results.length).toEqual(2);
      expect(res.results[0].counter).toEqual(1);
      expect(res.results[1].counter).toEqual(2);
      expect(res.hasPrevious).toBe(false);
      expect(res.hasNext).toBe(true);

      // Go forward 2
      res = await paging.find(collection, {
        limit: 2,
        paginatedField: 'timestamp',
        next: res.next,
        sortAscending: true,
      });

      expect(res.results.length).toEqual(2);
      expect(res.results[0].counter).toEqual(3);
      expect(res.results[1].counter).toEqual(4);
      expect(res.hasPrevious).toBe(true);
      expect(res.hasNext).toBe(true);

      // Go forward another 2
      res = await paging.find(collection, {
        limit: 2,
        paginatedField: 'timestamp',
        next: res.next,
        sortAscending: true,
      });

      expect(res.results.length).toEqual(2);
      expect(res.results[0].counter).toEqual(5);
      expect(res.results[1].counter).toEqual(6);
      expect(res.hasPrevious).toBe(true);
      expect(res.hasNext).toBe(false);

      // Now back up 2
      res = await paging.find(collection, {
        limit: 2,
        paginatedField: 'timestamp',
        previous: res.previous,
        sortAscending: true,
      });

      expect(res.results.length).toEqual(2);
      expect(res.results[0].counter).toEqual(3);
      expect(res.results[1].counter).toEqual(4);
      expect(res.hasPrevious).toBe(true);
      expect(res.hasNext).toBe(true);
    });

    it('respects sortAscending with after/before', async () => {
      const collection = t.db.collection('test_duplicate_custom_fields');
      // First page of 2
      let res = await paging.find(collection, {
        limit: 2,
        paginatedField: 'timestamp',
        sortAscending: true,
      });

      expect(res.results.length).toEqual(2);
      expect(res.results[0].counter).toEqual(1);
      expect(res.results[1].counter).toEqual(2);
      expect(res.hasPrevious).toBe(false);
      expect(res.hasNext).toBe(true);

      // Go forward 2
      res = await paging.find(collection, {
        limit: 2,
        paginatedField: 'timestamp',
        after: res.results[res.results.length - 1]._id,
        sortAscending: true,
      });

      expect(res.results.length).toEqual(2);
      expect(res.results[0].counter).toEqual(3);
      expect(res.results[1].counter).toEqual(4);
      expect(res.hasPrevious).toBe(true);
      expect(res.hasNext).toBe(true);

      // Go forward another 2
      res = await paging.find(collection, {
        limit: 2,
        paginatedField: 'timestamp',
        after: res.results[res.results.length - 1]._id,
        sortAscending: true,
      });

      expect(res.results.length).toEqual(2);
      expect(res.results[0].counter).toEqual(5);
      expect(res.results[1].counter).toEqual(6);
      expect(res.hasPrevious).toBe(true);
      expect(res.hasNext).toBe(false);

      // Now back up 2
      res = await paging.find(collection, {
        limit: 2,
        paginatedField: 'timestamp',
        before: res.results[0]._id,
        sortAscending: true,
      });

      expect(res.results.length).toEqual(2);
      expect(res.results[0].counter).toEqual(3);
      expect(res.results[1].counter).toEqual(4);
      expect(res.hasPrevious).toBe(true);
      expect(res.hasNext).toBe(true);
    });
  });

  describe('when sorting using dates', () => {
    it('queries the first few pages with next/previous', async () => {
      const collection = t.db.collection('test_paging_date');
      // First page of 2
      let res = await paging.find(collection, {
        limit: 2,
        paginatedField: 'date',
      });

      expect(res.results.length).toEqual(2);
      expect(res.results[0].counter).toEqual(4);
      expect(res.results[1].counter).toEqual(3);
      expect(res.hasPrevious).toBe(false);
      expect(res.hasNext).toBe(true);

      // Go forward 2
      res = await paging.find(collection, {
        limit: 2,
        paginatedField: 'date',
        next: res.next,
      });

      expect(res.results.length).toEqual(2);
      expect(res.results[0].counter).toEqual(2);
      expect(res.results[1].counter).toEqual(1);
      expect(res.hasPrevious).toBe(true);
      expect(res.hasNext).toBe(false);
    });

    it('queries the first few pages with after/before', async () => {
      const collection = t.db.collection('test_paging_date');
      // First page of 2
      let res = await paging.find(collection, {
        limit: 2,
        paginatedField: 'date',
      });

      expect(res.results.length).toEqual(2);
      expect(res.results[0].counter).toEqual(4);
      expect(res.results[1].counter).toEqual(3);
      expect(res.hasPrevious).toBe(false);
      expect(res.hasNext).toBe(true);

      // Go forward 2
      res = await paging.find(collection, {
        limit: 2,
        paginatedField: 'date',
        after: res.results[res.results.length - 1]._id,
      });

      expect(res.results.length).toEqual(2);
      expect(res.results[0].counter).toEqual(2);
      expect(res.results[1].counter).toEqual(1);
      expect(res.hasPrevious).toBe(true);
      expect(res.hasNext).toBe(false);
    });
  });

  describe('when the paginated fields is a date and using dot notation', () => {
    it('queries the first few pages with next/previous', async () => {
      const collection = t.db.collection('test_paging_date_in_object');
      const paginatedField = 'start.date'; // Use dot notation in paginated field.
      const limit = 2;

      // First page.
      let res = await paging.find(collection, {
        limit,
        paginatedField,
      });

      expect(res.results.start).toEqual(undefined); // Verify it is not returned since it is not requested.
      expect(res.results.length).toEqual(2);
      expect(res.results[0].counter).toEqual(4);
      expect(res.results[1].counter).toEqual(3);
      expect(res.hasPrevious).toBe(false);
      expect(res.hasNext).toBe(true);

      // Go forward.
      res = await paging.find(collection, {
        limit,
        paginatedField,
        next: res.next,
      });

      expect(res.results.start).toEqual(undefined); // Verify it is not returned since it is not requested.
      expect(res.results.length).toEqual(2);
      expect(res.results[0].counter).toEqual(2);
      expect(res.results[1].counter).toEqual(1);
      expect(res.hasPrevious).toBe(true);
      expect(res.hasNext).toBe(false);

      // Go backward
      res = await paging.find(collection, {
        limit,
        paginatedField,
        previous: res.previous,
      });

      expect(res.results.start).toEqual(undefined); // Verify it is not returned since it is not requested.
      expect(res.results.length).toEqual(2);
      expect(res.results[0].counter).toEqual(4);
      expect(res.results[1].counter).toEqual(3);
      expect(res.hasPrevious).toBe(false);
      expect(res.hasNext).toBe(true);
    });

    it('queries the first few pages with after/before', async () => {
      const collection = t.db.collection('test_paging_date_in_object');
      const paginatedField = 'start.date'; // Use dot notation in paginated field.
      const limit = 2;

      // First page.
      let res = await paging.find(collection, {
        limit,
        paginatedField,
      });

      expect(res.results.start).toEqual(undefined); // Verify it is not returned since it is not requested.
      expect(res.results.length).toEqual(2);
      expect(res.results[0].counter).toEqual(4);
      expect(res.results[1].counter).toEqual(3);
      expect(res.hasPrevious).toBe(false);
      expect(res.hasNext).toBe(true);

      // Go forward.
      res = await paging.find(collection, {
        limit,
        paginatedField,
        after: res.results[res.results.length - 1]._id,
      });

      expect(res.results.start).toEqual(undefined); // Verify it is not returned since it is not requested.
      expect(res.results.length).toEqual(2);
      expect(res.results[0].counter).toEqual(2);
      expect(res.results[1].counter).toEqual(1);
      expect(res.hasPrevious).toBe(true);
      expect(res.hasNext).toBe(false);

      // Go backward
      res = await paging.find(collection, {
        limit,
        paginatedField,
        before: res.results[0]._id,
      });

      expect(res.results.start).toEqual(undefined); // Verify it is not returned since it is not requested.
      expect(res.results.length).toEqual(2);
      expect(res.results[0].counter).toEqual(4);
      expect(res.results[1].counter).toEqual(3);
      expect(res.hasPrevious).toBe(false);
      expect(res.hasNext).toBe(true);
    });
  });

  describe('when using alphabetical sorting', () => {
    it('queries the first few pages with next/previous', async () => {
      const collection = t.db.collection('test_sorting');

      const res = await paging.find(collection, {
        paginatedField: 'name',
        sortAscending: true,
        limit: 10,
      });

      expect(_.pluck(res.results, 'name')).toEqual([
        'Alpha',
        'Beta',
        'Gamma',
        'aleph',
        'bet',
        'gimel',
      ]);

      const res_localized = await paging.find(collection, {
        paginatedField: 'name',
        sortAscending: true,
        limit: 10,
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

      const res_static_localized = await paging.find(collection, {
        paginatedField: 'name',
        sortAscending: true,
        limit: 10,
      });

      expect(_.pluck(res_static_localized.results, 'name')).toEqual([
        'aleph',
        'Alpha',
        'bet',
        'Beta',
        'Gamma',
        'gimel',
      ]);

      const res_excluding_collation = await paging.find(collection, {
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

  describe('when default limits are hit', () => {
    const originalDefaultLimit = paging.config.DEFAULT_LIMIT;
    beforeAll(() => (paging.config.DEFAULT_LIMIT = 2));
    afterAll(() => (paging.config.DEFAULT_LIMIT = originalDefaultLimit));

    it('clamps to the lower limit', async () => {
      const collection = t.db.collection('test_paging_limits');
      const res = await paging.find(collection, {
        limit: -1,
      });

      expect(res.results.length).toEqual(1);
    });

    it('sets a default limit', async () => {
      const collection = t.db.collection('test_paging_limits');
      const res = await paging.find(collection, {});

      expect(res.results.length).toEqual(2);
    });

    it('allows overriding the limit', async () => {
      const collection = t.db.collection('test_paging_limits');
      const res = await paging.find(collection, {
        limit: 4,
      });

      expect(res.results.length).toEqual(4);
    });
  });
  describe('when max limits are hit', () => {
    const originalMaxLimit = paging.config.MAX_LIMIT;
    beforeAll(() => (paging.config.MAX_LIMIT = 2));
    afterAll(() => (paging.config.MAX_LIMIT = originalMaxLimit));

    it('clamps to the max limit', async () => {
      const collection = t.db.collection('test_paging_limits');
      const res = await paging.find(collection, {
        limit: 999,
      });

      expect(res.results.length).toEqual(2);
    });
  });

  describe('sorting without collation', () => {
    let collection;
    beforeAll(() => {
      collection = t.db.collection('test_sorting');
    });

    describe('without the `sortCaseInsensitive` parameter', () => {
      const options = {
        paginatedField: 'name',
        sortAscending: true,
        limit: 2,
      };

      it('sorts capital letters first', async () => {
        const { results: results } = await paging.find(collection, options);
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
        const r = await paging.find(collection, { ...options });
        expect(_.pluck(r.results, 'name')).toEqual(['aleph', 'Alpha']);
        expect(r.hasNext).toBe(true);
        expect(r.hasPrevious).toBe(false);
      });

      it('returns the paginated field but not the temporary __lc field', async () => {
        const r = await paging.find(collection, { ...options });
        expect('name' in r.results[0]).toBe(true);
        expect('__lc' in r.results[0]).toBe(false);
      });

      it('pages correctly forward and backward', async () => {
        const { next } = await paging.find(collection, { ...options });
        const pg2 = await paging.find(collection, { ...options, next });
        expect(_.pluck(pg2.results, 'name')).toEqual(['bet', 'Beta']);
        expect(pg2.hasPrevious).toBe(true);
        const pg1 = await paging.find(collection, { ...options, previous: pg2.previous });
        expect(_.pluck(pg1.results, 'name')).toEqual(['aleph', 'Alpha']);
        expect(pg1.hasNext).toBe(true);
        expect(pg1.hasPrevious).toBe(false);
        expect(pg1.next).toEqual(next);
      });
    });
  });
});
