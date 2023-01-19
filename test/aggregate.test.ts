import _ from 'underscore';
import { Collection, Db, Document, ObjectId } from 'mongodb';
import { aggregate, config } from '../src';
import { decode } from '../src/utils/bsonUrlEncoding';
import dbUtils from './support/db';
import { MongoMemoryServer } from 'mongodb-memory-server';

const paging = require('../');
const driver = process.env.DRIVER;

let mongod: MongoMemoryServer;

describe('aggregate', () => {
  let db: Db;
  beforeAll(async () => {
    mongod = await dbUtils.start();
    db = await dbUtils.db(mongod, driver);

    // Set up collections once for testing later.
    await Promise.all([
      db.collection('test_paging').insertMany([
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

      db
        .collection('test_aggregation_trees')
        .insertMany(
          [
            { name: 'pine' },
            { name: 'oak' },
            { name: 'palm' },
            { name: 'birch' },
            { name: 'maple' },
            { name: 'willow' },
          ].map((planet) => ({ name: planet.name, _id: new ObjectId() }))
        ),

      db.collection('test_aggregation_sort').insertMany([
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

      db.collection('test_null_values').insertMany(
        [undefined, null, 'Bravo', null, 'Alice', undefined, null, 'alpha']
          // expectation is for an incrementing set of id values, so reverse the order
          // prior adding an objectId (as objectIds will order by latest to oldest)
          .reverse()
          .map((name) => ({
            _id: new ObjectId(),
            ...(name !== undefined && { name }),
          }))
      ),
    ]);
  });

  afterAll(() => mongod.stop());

  beforeEach(() => {
    config.COLLATION = undefined;
  });

  describe('test pagination', () => {
    it('queries the first few pages with next/previous', async () => {
      const collection = db.collection('test_paging');
      // First page of 3
      let res = await aggregate(collection, {
        limit: 3,
      });

      expect(res.results.length).toEqual(3);
      expect(res.results[0].counter).toEqual(8);
      expect(res.results[1].counter).toEqual(7);
      expect(res.results[2].counter).toEqual(6);
      expect(res.hasPrevious).toBe(false);
      expect(res.hasNext).toBe(true);

      // Go forward 3
      res = await aggregate(collection, {
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
      res = await aggregate(collection, {
        limit: 3,
        next: res.next,
      });

      expect(res.results.length).toEqual(2);
      expect(res.results[0].counter).toEqual(2);
      expect(res.results[1].counter).toEqual(1);
      expect(res.hasPrevious).toBe(true);
      expect(res.hasNext).toBe(false);

      // Now back up 3
      res = await aggregate(collection, {
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
      res = await aggregate(collection, {
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
      const collection = db.collection('test_paging');
      // First page of 3
      let res = await aggregate(collection, {
        limit: 3,
      });

      expect(res.results.length).toEqual(3);
      expect(res.results[0].counter).toEqual(8);
      expect(res.results[1].counter).toEqual(7);
      expect(res.results[2].counter).toEqual(6);
      expect(res.hasPrevious).toBe(false);
      expect(res.hasNext).toBe(true);

      // Go forward 3
      res = await aggregate(collection, {
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
      res = await aggregate(collection, {
        limit: 3,
        after: res.results[res.results.length - 1]._id,
      });

      expect(res.results.length).toEqual(2);
      expect(res.results[0].counter).toEqual(2);
      expect(res.results[1].counter).toEqual(1);
      expect(res.hasPrevious).toBe(true);
      expect(res.hasNext).toBe(false);

      // Now back up 3
      res = await aggregate(collection, {
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
      res = await aggregate(collection, {
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
      const collection = db.collection('test_paging');
      // First page of 2
      let res = await aggregate(collection, {
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
      res = await aggregate(collection, {
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
      res = await aggregate(collection, {
        limit: 2,
        next: res.next,
      });

      expect(res.results.length).toEqual(1);
      expect(res.results[0].counter).toEqual(1);
      expect(res.hasPrevious).toBe(true);
      expect(res.hasNext).toBe(false);
    });

    it('handles hitting the end with after/before', async () => {
      const collection = db.collection('test_paging');
      // First page of 2
      let res = await aggregate(collection, {
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
      res = await aggregate(collection, {
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
      res = await aggregate(collection, {
        limit: 2,
        after: res.results[res.results.length - 1]._id,
      });

      expect(res.results.length).toEqual(1);
      expect(res.results[0].counter).toEqual(1);
      expect(res.hasPrevious).toBe(true);
      expect(res.hasNext).toBe(false);
    });

    it('handles hitting the beginning with next/previous', async () => {
      const collection = db.collection('test_paging');
      // First page of 2
      let res = await aggregate(collection, {
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
      res = await aggregate(collection, {
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
      res = await aggregate(collection, {
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
      const collection = db.collection('test_paging');
      // First page of 2
      let res = await aggregate(collection, {
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
      res = await aggregate(collection, {
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
      res = await aggregate(collection, {
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
      const collection = db.collection('test_paging');
      // First page.
      const res = await aggregate(collection, {
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
      const collection = db.collection('test_paging');
      // First page.
      const res = await aggregate(collection, {
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
      const collection = db.collection('test_paging');
      // First page of 3
      let res = await aggregate(collection, {
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
      res = await aggregate(collection, {
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
      res = await aggregate(collection, {
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
      res = await aggregate(collection, {
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
      res = await aggregate(collection, {
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
      const collection = db.collection('test_paging');
      // First page of 3
      let res = await aggregate(collection, {
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
      res = await aggregate(collection, {
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
      res = await aggregate(collection, {
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
      res = await aggregate(collection, {
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
      res = await aggregate(collection, {
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
    let astronomistCollection;

    const [mercuryId, venusId, earthId, marsId, jupiterId, saturnId] = [...Array(6)]
      .reverse() // reverse order prior objectIds so that mercuryId is the most recently created
      .map((planetId) => new ObjectId());

    beforeAll(async () => {
      [astronomistCollection] = await Promise.all([
        db.collection('test_aggregation_astronomistCollection').insertMany([
          {
            name: 'Amy',
            favouritePlanetIds: [mercuryId, venusId, earthId],
          },
          {
            name: 'Bill',
            favouritePlanetIds: [marsId, jupiterId, saturnId],
          },
          {
            name: 'Caitlin',
            favouritePlanetIds: [mercuryId, earthId, saturnId],
          },
          {
            name: 'Dazza',
            favouritePlanetIds: [venusId, marsId, jupiterId],
          },
        ]),

        db.collection('test_aggregation_lookup_of_planetCollection').insertMany([
          { _id: mercuryId, name: 'mercury' },
          { _id: venusId, name: 'venus' },
          { _id: earthId, name: 'earth' },
          { _id: marsId, name: 'mars' },
          { _id: jupiterId, name: 'jupiter' },
          { _id: saturnId, name: 'saturn' },
        ]),

        // create the index of the planetCollection
        // db
        //   .collection('test_aggregation_lookup_of_planetCollection')
        //   .createIndex({ name: 'text5' }, { name: 'test_index5' }),
      ]);
    });

    it('returns results from the aggregation', async () => {
      const AstronomistCollection = db.collection('test_aggregation_astronomistCollection');

      const res = await aggregate(AstronomistCollection, {
        aggregation: [
          {
            $match: { favouritePlanetIds: jupiterId },
          },
          {
            $unwind: '$favouritePlanetIds',
          },
          {
            $lookup: {
              from: 'test_aggregation_lookup_of_planetCollection',
              localField: 'favouritePlanetIds',
              foreignField: '_id',
              as: 'planetDocument',
            },
          },
          {
            $unwind: '$planetDocument',
          },
          {
            $group: {
              _id: '$_id',
              planets: { $push: '$planetDocument.name' },
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
      const collection = db.collection('test_aggregation_sort');

      const res = await aggregate(collection, {
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

      const res_localized = await aggregate(collection, {
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

      config.COLLATION = { locale: 'en' };

      const res_static_localized = await aggregate(collection, {
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

      const res_excluding_collation = await aggregate(collection, {
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
    let spy: jest.SpyInstance<any, unknown[]>;
    beforeEach(() => {
      spy = jest.spyOn(paging, 'aggregate');
    });

    afterEach(() => {
      spy.mockRestore();
    });

    it.skip('invokes aggregate with a `hint` if one is passed in via params object', async () => {
      const treesCollection = db.collection('test_aggregation_trees');

      await db.collection('test_aggregation_trees').createIndex(
        {
          name: 'text',
        },
        {
          name: 'test_index',
        }
      );

      const { results, hasPrevious, hasNext } = await aggregate(treesCollection, {
        aggregation: [
          {
            $sort: { name: 1 },
          },
        ],
        hint: 'test_index',
      });

      expect(results).toHaveLength(6);
      expect(hasNext).toBe(false);
      expect(hasPrevious).toBe(false);

      // TODO UPDATE REQUIRED TO RUN THIS TEST
      //   expect(spy).toHaveBeenCalled();
      //   expect(spy).toHaveBeenCalledWith(
      //     expect.any(Object),
      //     expect.objectContaining({ hint: 'test_index' })
      //   );
    });
  });

  describe('sorting without collation', () => {
    let collection: Collection<Document>;
    beforeAll(() => {
      collection = db.collection('test_aggregation_sort');
    });

    describe('without the `sortCaseInsensitive` parameter...', () => {
      const options = {
        paginatedField: 'name',
        sortAscending: true,
        limit: 2,
      };
      it('sorts capital letters first', async () => {
        const { results: results } = await aggregate(collection, options);
        expect(_.pluck(results, 'name')).toEqual(['Alpha', 'Beta']);
      });

      it('sorts null and undefined values at the start when paginating by name', async () => {
        const collection = db.collection('test_null_values');

        // DOCUMENTS in oldest to latest order =>
        // [undefined, null, 'Bravo', null, 'Alice' undefined, null, 'alpha']

        ////////////////////// PAGE EXPECTATIONS /////////////////////////////////
        // expect that the undefined + null values are considered the same for sorting, so
        // the most recently created will be returned first

        // expect PageOne => null, undefined, null
        // expect PageTwo => null, undefined, 'Alice'
        // expect PageThree -> 'Bravo', 'alpha'

        const expectPageOne = (response) => {
          const { results, hasNext, hasPrevious } = response;

          expect(hasNext).toBe(true);
          expect(hasPrevious).toBe(false);
          expect(results).toHaveLength(3);

          expect(results[0].name).toEqual(null);
          const firstResultDecodedCursor = decode(results[0]._cursor);
          expect(firstResultDecodedCursor).toHaveLength(2);
          expect(firstResultDecodedCursor?.[0]).toEqual(null);
          expect(firstResultDecodedCursor?.[1].toString()).toEqual(results[0]._id.toString());

          expect(results[1].name).toBeUndefined();
          const secondResultDecodedCursor = decode(results[1]._cursor);
          expect(secondResultDecodedCursor).toHaveLength(2);
          expect(secondResultDecodedCursor?.[0]).toEqual(undefined);
          expect(secondResultDecodedCursor?.[1].toString()).toEqual(results[1]._id.toString());

          expect(results[2].name).toEqual(null);
          const thirdResultDecodedCursor = decode(results[2]._cursor);
          expect(thirdResultDecodedCursor).toHaveLength(2);
          expect(thirdResultDecodedCursor?.[0]).toEqual(null);
          expect(thirdResultDecodedCursor?.[1].toString()).toEqual(results[2]._id.toString());
        };

        const expectPageTwo = (response) => {
          const { results, hasNext, hasPrevious } = response;

          expect(hasNext).toBe(true);
          expect(hasPrevious).toBe(true);
          expect(results).toHaveLength(3);

          expect(results[0].name).toEqual(null);
          const firstResultDecodedCursor = decode(results[0]._cursor);
          expect(firstResultDecodedCursor).toHaveLength(2);
          expect(firstResultDecodedCursor?.[0]).toEqual(null);
          expect(firstResultDecodedCursor?.[1].toString()).toEqual(results[0]._id.toString());

          expect(results[1].name).toBeUndefined();
          const secondResultDecodedCursor = decode(results[1]._cursor);
          expect(secondResultDecodedCursor).toHaveLength(2);
          expect(secondResultDecodedCursor?.[0]).toEqual(undefined);
          expect(secondResultDecodedCursor?.[1].toString()).toEqual(results[1]._id.toString());

          expect(results[2].name).toEqual('Alice');
          const thirdResultDecodedCursor = decode(results[2]._cursor);
          expect(thirdResultDecodedCursor).toHaveLength(2);
          expect(thirdResultDecodedCursor?.[0]).toEqual('Alice');
          expect(thirdResultDecodedCursor?.[1].toString()).toEqual(results[2]._id.toString());
        };

        const expectPageThree = (response) => {
          const { results, hasNext, hasPrevious } = response;

          expect(hasNext).toBe(false);
          expect(hasPrevious).toBe(true);
          expect(results).toHaveLength(2);

          expect(results[0].name).toEqual('Bravo');
          const firstResultDecodedCursor = decode(results[0]._cursor);
          expect(firstResultDecodedCursor).toHaveLength(2);
          expect(firstResultDecodedCursor?.[0]).toEqual('Bravo');
          expect(firstResultDecodedCursor?.[1].toString()).toEqual(results[0]._id.toString());

          expect(results[1].name).toEqual('alpha'); // as case senitivity sorted, expect 'alpha' after 'Bravo'
          const secondResultDecodedCursor = decode(results[1]._cursor);
          expect(secondResultDecodedCursor).toHaveLength(2);
          expect(secondResultDecodedCursor?.[0]).toEqual('alpha');
          expect(secondResultDecodedCursor?.[1].toString()).toEqual(results[1]._id.toString());
        };

        ///////////// TEST PAGE EXPECTATIONS /////////////////////

        const options = {
          paginatedField: 'name',
          sortAscending: true,
          limit: 3,
        };

        // Initial page
        let response = await aggregate(collection, { ...options });
        expectPageOne(response);
        const page1NextCursor = response.results[response.results.length - 1]._cursor;

        // Get second Page via forward pagination
        response = await aggregate(collection, { ...options, next: page1NextCursor });
        expectPageTwo(response);
        const page2NextCursor = response.results[response.results.length - 1]._cursor;

        // Get third Page via forward pagination
        response = await aggregate(collection, { ...options, next: page2NextCursor });
        expectPageThree(response);
        const page3StartCursor = response.results[0]._cursor;

        // Get second page via backward pagination
        response = await aggregate(collection, { ...options, previous: page3StartCursor });
        expectPageTwo(response);
        const page2StartCursor = response.results[0]._cursor;

        // Get first page via backward pagination
        response = await aggregate(collection, { ...options, previous: page2StartCursor });
        expectPageOne(response);
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
        const r = await aggregate(collection, { ...options });
        expect(_.pluck(r.results, 'name')).toEqual(['aleph', 'Alpha']);
        expect(r.hasNext).toBe(true);
        expect(r.hasPrevious).toBe(false);
      });

      it('returns the paginated field but not the temporary __lower_case_value field', async () => {
        const r = await aggregate(collection, { ...options });
        expect('name' in r.results[0]).toBe(true);
        expect('__lower_case_value' in r.results[0]).toBe(false);
      });

      it('pages correctly forward and backward', async () => {
        const { next } = await aggregate(collection, { ...options });
        const pg2 = await aggregate(collection, { ...options, next });
        expect(_.pluck(pg2.results, 'name')).toEqual(['bet', 'Beta']);
        expect(pg2.hasPrevious).toBe(true);
        const pg1 = await aggregate(collection, { ...options, previous: pg2.previous });
        expect(_.pluck(pg1.results, 'name')).toEqual(['aleph', 'Alpha']);
        expect(pg1.hasNext).toBe(true);
        expect(pg1.hasPrevious).toBe(false);
        expect(pg1.next).toEqual(next);
      });

      it('sorts null and undefined values at the start with ascending pagination, case insensitive', async () => {
        const collection = db.collection('test_null_values');

        // DOCUMENTS in oldest to latest order =>
        // [undefined, null, 'Bravo', null, 'Alice' undefined, null, 'alpha']

        ////////////////////// PAGE EXPECTATIONS /////////////////////////////////
        // expect that the undefined + null values are considered the same for sorting, so the most recently
        // created will be returned first. Expect string values to be returned in case-insensitive order, but
        // cursors to retain the lowercase values

        // expect PageOne => null, undefined, null
        // expect PageTwo => null, undefined, 'Alice'
        // expect PageThree -> 'alpha', 'Bravo'

        const expectPageOne = (response) => {
          const { results, hasNext, hasPrevious } = response;

          expect(hasNext).toBe(true);
          expect(hasPrevious).toBe(false);
          expect(results).toHaveLength(3);

          expect(results[0].name).toEqual(null);
          const firstResultDecodedCursor = decode(results[0]._cursor);
          expect(firstResultDecodedCursor).toHaveLength(2);
          expect(firstResultDecodedCursor?.[0]).toEqual(null);
          expect(firstResultDecodedCursor?.[1].toString()).toEqual(results[0]._id.toString());

          expect(results[1].name).toBeUndefined();
          const secondResultDecodedCursor = decode(results[1]._cursor);
          expect(secondResultDecodedCursor).toHaveLength(2);
          expect(secondResultDecodedCursor?.[0]).toEqual(undefined);
          expect(secondResultDecodedCursor?.[1].toString()).toEqual(results[1]._id.toString());

          expect(results[2].name).toEqual(null);
          const thirdResultDecodedCursor = decode(results[2]._cursor);
          expect(thirdResultDecodedCursor).toHaveLength(2);
          expect(thirdResultDecodedCursor?.[0]).toEqual(null);
          expect(thirdResultDecodedCursor?.[1].toString()).toEqual(results[2]._id.toString());
        };

        const expectPageTwo = (response) => {
          const { results, hasNext, hasPrevious } = response;

          expect(hasNext).toBe(true);
          expect(hasPrevious).toBe(true);
          expect(results).toHaveLength(3);

          expect(results[0].name).toEqual(null);
          const firstResultDecodedCursor = decode(results[0]._cursor);
          expect(firstResultDecodedCursor).toHaveLength(2);
          expect(firstResultDecodedCursor?.[0]).toEqual(null);
          expect(firstResultDecodedCursor?.[1].toString()).toEqual(results[0]._id.toString());

          expect(results[1].name).toBeUndefined();
          const secondResultDecodedCursor = decode(results[1]._cursor);
          expect(secondResultDecodedCursor).toHaveLength(2);
          expect(secondResultDecodedCursor?.[0]).toEqual(undefined);
          expect(secondResultDecodedCursor?.[1].toString()).toEqual(results[1]._id.toString());

          expect(results[2].name).toEqual('Alice');
          const thirdResultDecodedCursor = decode(results[2]._cursor);
          expect(thirdResultDecodedCursor).toHaveLength(2);
          expect(thirdResultDecodedCursor?.[0]).toEqual('alice');
          expect(thirdResultDecodedCursor?.[1].toString()).toEqual(results[2]._id.toString());
        };

        const expectPageThree = (response) => {
          const { results, hasNext, hasPrevious } = response;

          expect(hasNext).toBe(false);
          expect(hasPrevious).toBe(true);
          expect(results).toHaveLength(2);

          expect(results[0].name).toEqual('alpha'); // 'alpha' now prior 'Bravo'
          const firstResultDecodedCursor = decode(results[0]._cursor);
          expect(firstResultDecodedCursor).toHaveLength(2);
          expect(firstResultDecodedCursor?.[0]).toEqual('alpha');
          expect(firstResultDecodedCursor?.[1].toString()).toEqual(results[0]._id.toString());

          expect(results[1].name).toEqual('Bravo'); // as case senitivity sorted, expect 'alpha' after 'Bravo'
          const secondResultDecodedCursor = decode(results[1]._cursor);
          expect(secondResultDecodedCursor).toHaveLength(2);
          expect(secondResultDecodedCursor?.[0]).toEqual('bravo');
          expect(secondResultDecodedCursor?.[1].toString()).toEqual(results[1]._id.toString());
        };

        ///////////// TEST PAGE EXPECTATIONS /////////////////////

        const options = {
          paginatedField: 'name',
          sortCaseInsensitive: true,
          sortAscending: true,
          limit: 3,
        };

        // Initial page
        let response = await aggregate(collection, { ...options });
        expectPageOne(response);
        const page1NextCursor = response.results[response.results.length - 1]._cursor;

        // Get second Page via forward pagination
        response = await aggregate(collection, { ...options, next: page1NextCursor });
        expectPageTwo(response);
        const page2NextCursor = response.results[response.results.length - 1]._cursor;

        // Get third Page via forward pagination
        response = await aggregate(collection, { ...options, next: page2NextCursor });
        expectPageThree(response);
        const page3StartCursor = response.results[0]._cursor;

        // Get second page via backward pagination
        response = await aggregate(collection, { ...options, previous: page3StartCursor });
        expectPageTwo(response);
        const page2StartCursor = response.results[0]._cursor;

        // Get first page via backward pagination
        response = await aggregate(collection, { ...options, previous: page2StartCursor });
        expectPageOne(response);
      });
    });
  });
});
