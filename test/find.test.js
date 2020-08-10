const paging = require('../');
const dbUtils = require('./support/db');
const _ = require('underscore');
const { ObjectId } = require('mongoist');
const driver = process.env.DRIVER;

let mongod;

describe('find', () => {
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
      t.db.collection('test_duplicate_custom_fields').insert([
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
      t.db.collection('test_paging_custom_fields').insert([
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
      t.db.collection('test_paging_date').insert([
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
      t.db.collection('test_paging_date_in_object').insert([
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
      t.db.collection('test_paging_limits').insert([
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
      t.db.collection('test_sorting').insert([
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
        await t.db.collection('test_paging').ensureIndex({ color: 1 }, { name: 'color_1' });
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
        await t.db.collection('test_paging_string_ids').insert([
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
          .ensureIndex({ color: 1 }, { name: 'color_1' });
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

      paging.config.COLLATION = { locale: 'en' };

      const res_localized = await paging.find(collection, {
        paginatedField: 'name',
        sortAscending: true,
        limit: 10,
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
});
