import { MongoMemoryServer } from 'mongodb-memory-server';
import { Collection, Db, Document, ObjectId } from 'mongodb';
import _ from 'underscore';

import { findMulti, config, find } from '../src';
import dbUtils from './support/db';

let mongod: MongoMemoryServer;

describe('findMulti', () => {
  let db: Db;
  beforeAll(async () => {
    mongod = await dbUtils.start();
    db = await dbUtils.db(mongod);

    await db.collection('test_deep_sorts').insertMany([
      {
        title: 'Mr',
        firstName: 'Aguste',
        lastName: 'Teasey',
        birthYear: 1921,
        favouriteFood: 'potatoes',
      },
      {
        title: 'Mr',
        firstName: 'Aguste',
        lastName: 'Pedden',
        birthYear: 1922,
        favouriteFood: 'pizza',
      },
      {
        title: 'Mr',
        firstName: 'Aguste',
        lastName: 'Saunt',
        birthYear: 1923,
        favouriteFood: 'potatoes',
      },
      {
        title: 'Mr',
        firstName: 'Graig',
        lastName: 'Maciunas',
        birthYear: 1921,
        favouriteFood: 'potatoes',
      },
      {
        title: 'Mr',
        firstName: "D'arcy",
        lastName: 'Sachno',
        birthYear: 1922,
        favouriteFood: 'pizza',
      },
      {
        title: 'Mrs',
        firstName: 'Jae',
        lastName: 'Petrazzi',
        birthYear: 1923,
        favouriteFood: 'potatoes',
      },
      {
        title: 'Mrs',
        firstName: 'Flore',
        lastName: 'Ternouth',
        birthYear: 1921,
        favouriteFood: 'potatoes',
      },
      {
        title: 'Mrs',
        firstName: 'Ines',
        lastName: 'Richarson',
        birthYear: 1922,
        favouriteFood: 'pizza',
      },
      {
        title: 'Mrs',
        firstName: 'Carmencita',
        lastName: 'Hallibone',
        birthYear: 1923,
        favouriteFood: 'potatoes',
      },
      {
        title: 'Mrs',
        firstName: 'Wilmar',
        lastName: 'Petrov',
        birthYear: 1921,
        favouriteFood: 'pizza',
      },
    ]);
  });

  afterAll(() => mongod.stop());

  beforeEach(() => {
    config.COLLATION = undefined;
  });

  async function runPaginateTest(caseInsensitive: boolean) {
    const collection = db.collection('test_deep_sorts');

    async function findMultiWithPrev(next: any = undefined) {
      return findMulti(collection, {
        limit: 3,
        next,
        paginatedFields: [
          {
            paginatedField: 'firstName',
            sortCaseInsensitive: caseInsensitive,
            sortAscending: true,
          },
          { paginatedField: 'lastName', sortCaseInsensitive: caseInsensitive, sortAscending: true },
        ],
      });
    }

    const res1 = await findMultiWithPrev();
    const res2 = await findMultiWithPrev(res1.next);
    const res3 = await findMultiWithPrev(res2.next);
    const res4 = await findMultiWithPrev(res3.next);
    const res5 = await findMultiWithPrev(res4.next);

    // sort by first name then last should result in the
    // first names being equal meaning the next sort takes precedence
    expect(res1.results[0].firstName).toEqual('Aguste');
    expect(res1.results[1].firstName).toEqual('Aguste');
    expect(res1.results[2].firstName).toEqual('Aguste');
    expect(res1.results[0].lastName).toEqual('Pedden');
    expect(res1.results[1].lastName).toEqual('Saunt');
    expect(res1.results[2].lastName).toEqual('Teasey');

    // after a bunch of paginations, the last result should still be sorted
    expect(res4.results[0].firstName).toEqual('Wilmar');
    expect(res4.results[0].lastName).toEqual('Petrov');

    // last result should be blank
    expect(res5.results.length).toEqual(0);
    expect(res5.hasPrevious).toEqual(true);
    expect(res5.hasNext).toEqual(false);
  }

  it('paginates by multiple fields', async () => {
    await runPaginateTest(false);
  });

  it('paginates by multiple fields case insensitive', async () => {
    await runPaginateTest(true);
  });

  it('handles a bunch of nested sorts', async () => {
    const collection = db.collection('test_deep_sorts');

    async function findMultiWithPrev(next: any = undefined) {
      return findMulti(collection, {
        limit: 3,
        next,
        paginatedFields: [
          { paginatedField: 'title', sortCaseInsensitive: false, sortAscending: true },
          { paginatedField: 'favouriteFood', sortCaseInsensitive: false, sortAscending: true },
          { paginatedField: 'birthYear', sortCaseInsensitive: false, sortAscending: true },
          { paginatedField: 'firstName', sortCaseInsensitive: false, sortAscending: true },
          { paginatedField: 'lastName', sortCaseInsensitive: false, sortAscending: true },
        ],
      });
    }

    const res1 = await findMultiWithPrev();
    const res2 = await findMultiWithPrev(res1.next);

    const combinedResults = [...res1.results, ...res2.results];

    // there's 5 "Mr" in the collection so the first 5 should be "mr" followed by a mrs
    for (const result of combinedResults.slice(0, 5)) {
      expect(result.title).toEqual('Mr');
    }
    expect(combinedResults[combinedResults.length - 1].title).toEqual('Mrs');

    // of the 5 Mr, the first 2 should be "pizza", next 3 should be potatoes
    for (const result of combinedResults.slice(0, 2)) {
      expect(result.favouriteFood).toEqual('pizza');
    }
    for (const result of combinedResults.slice(2, 5)) {
      expect(result.favouriteFood).toEqual('potatoes');
    }

    // of the potatoes, the first two birthyear should be  sorted 1921 followed by 1923
    for (const result of combinedResults.slice(2, 4)) {
      expect(result.birthYear).toEqual(1921);
    }
    expect(combinedResults[4].birthYear).toEqual(1923);

    // of the 1921's, they should be sorted by firstName
    expect(combinedResults[2].firstName).toEqual('Aguste');
    expect(combinedResults[3].firstName).toEqual('Graig');
  });

  it('behaves the same as find given the same arguments', async () => {
    const collection = db.collection('test_deep_sorts');

    const findResult1 = await find(collection, {
      limit: 3,
      paginatedField: 'firstName',
      sortCaseInsensitive: false,
      sortAscending: true,
    });

    const findMultiResult1 = await findMulti(collection, {
      limit: 3,
      paginatedFields: [
        { paginatedField: 'firstName', sortCaseInsensitive: true, sortAscending: true },
      ],
    });

    expect(findResult1.results.map((r) => r._id)).toEqual(
      findMultiResult1.results.map((r) => r._id)
    );

    const findResult2 = await find(collection, {
      limit: 3,
      next: findResult1.next,
      paginatedField: 'firstName',
      sortCaseInsensitive: false,
      sortAscending: true,
    });

    const findMultiResult2 = await findMulti(collection, {
      limit: 3,
      next: findMultiResult1.next,
      paginatedFields: [
        { paginatedField: 'firstName', sortCaseInsensitive: true, sortAscending: true },
      ],
    });

    expect(findResult2.results.map((r) => r._id)).toEqual(
      findMultiResult2.results.map((r) => r._id)
    );
  });
});
