import { MongoMemoryServer } from "mongodb-memory-server";
import { Collection, Db, Document, ObjectId } from "mongodb";
import _ from "underscore";

import { findMulti, config, find } from "../src";
import dbUtils from "./support/db";

let mongod: MongoMemoryServer;

describe("findMulti", () => {
  let db: Db;
  beforeAll(async () => {
    mongod = await dbUtils.start();
    db = await dbUtils.db(mongod);

    await db.collection("test_deep_sorts").insertMany([
      {
        _id: new ObjectId("64cb29a1b2a41fc8221041b1"),
        title: "Mr",
        firstName: "Aguste",
        lastName: "Teasey",
        birthYear: 1921,
        favoriteFood: "potatoes",
      },
      {
        _id: new ObjectId("64cb29a1b2a41fc8221041b2"),
        title: "Mr",
        firstName: "Aguste",
        lastName: "Pedden",
        birthYear: 1922,
        favoriteFood: "pizza",
      },
      {
        _id: new ObjectId("64cb29a1b2a41fc8221041b0"),
        title: "Mr",
        firstName: "Aguste",
        lastName: "Saunt",
        birthYear: 1923,
        favoriteFood: "potatoes",
      },
      {
        _id: new ObjectId("64cb29a1b2a41fc8221041b8"),
        title: "Mr",
        firstName: "Graig",
        lastName: "Maciunas",
        birthYear: 1921,
        favoriteFood: "potatoes",
      },
      {
        _id: new ObjectId("64cb29a1b2a41fc8221041b4"),
        title: "Mr",
        firstName: "D'arcy",
        lastName: "Sachno",
        birthYear: 1922,
        favoriteFood: "pizza",
      },
      {
        _id: new ObjectId("64cb29a1b2a41fc8221041b6"),
        title: "Mrs",
        firstName: "Wilmar",
        lastName: "Petrazzi",
        birthYear: 1923,
        favoriteFood: "potatoes",
      },
      {
        _id: new ObjectId("64cb29a1b2a41fc8221041b3"),
        title: "Mrs",
        firstName: "Flore",
        lastName: "Ternouth",
        birthYear: 1921,
        favoriteFood: "potatoes",
      },
      {
        _id: new ObjectId("64cb29a1b2a41fc8221041b7"),
        title: "Mrs",
        firstName: "Ines",
        lastName: "Richarson",
        birthYear: 1922,
        favoriteFood: "pizza",
      },
      {
        _id: new ObjectId("64cb29a1b2a41fc8221041b5"),
        title: "Mrs",
        firstName: "Carmencita",
        lastName: "Hallibone",
        birthYear: 1923,
        favoriteFood: "potatoes",
      },
      {
        _id: new ObjectId("64cb29a1b2a41fc8221041b9"),
        title: "Mrs",
        firstName: "Wilmar",
        lastName: "Petrov",
        birthYear: 1921,
        favoriteFood: "pizza",
      },
    ]);
  });

  afterAll(() => mongod.stop());

  beforeEach(() => {
    config.COLLATION = undefined;
  });

  async function runPaginateTest(caseInsensitive: boolean) {
    const collection = db.collection("test_deep_sorts");

    async function findMultiWithPrev(next: any = undefined) {
      return findMulti(collection, {
        limit: 3,
        next,
        paginatedFields: [
          {
            paginatedField: "firstName",
            sortCaseInsensitive: caseInsensitive,
            sortAscending: true,
          },
          {
            paginatedField: "lastName",
            sortCaseInsensitive: caseInsensitive,
            sortAscending: true,
          },
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
    expect(res1.results[0].firstName).toEqual("Aguste");
    expect(res1.results[1].firstName).toEqual("Aguste");
    expect(res1.results[2].firstName).toEqual("Aguste");
    expect(res1.results[0].lastName).toEqual("Pedden");
    expect(res1.results[1].lastName).toEqual("Saunt");
    expect(res1.results[2].lastName).toEqual("Teasey");

    // after a bunch of paginations, the last result should still be sorted
    expect(res4.results[0].firstName).toEqual("Wilmar");
    expect(res4.results[0].lastName).toEqual("Petrov");

    // last result should be blank
    expect(res5.results.length).toEqual(0);
    expect(res5.hasPrevious).toEqual(true);
    expect(res5.hasNext).toEqual(false);
  }

  it("paginates by multiple fields", async () => {
    await runPaginateTest(false);
  });

  it("paginates by multiple fields case insensitive", async () => {
    await runPaginateTest(true);
  });

  it("handles a bunch of nested sorts", async () => {
    const collection = db.collection("test_deep_sorts");

    async function findMultiWithPrev(next: any = undefined) {
      return findMulti(collection, {
        limit: 3,
        next,
        paginatedFields: [
          {
            paginatedField: "title",
            sortCaseInsensitive: false,
            sortAscending: true,
          },
          {
            paginatedField: "favoriteFood",
            sortCaseInsensitive: false,
            sortAscending: true,
          },
          {
            paginatedField: "birthYear",
            sortCaseInsensitive: false,
            sortAscending: true,
          },
          {
            paginatedField: "firstName",
            sortCaseInsensitive: false,
            sortAscending: true,
          },
          {
            paginatedField: "lastName",
            sortCaseInsensitive: false,
            sortAscending: true,
          },
        ],
      });
    }

    const res1 = await findMultiWithPrev();
    const res2 = await findMultiWithPrev(res1.next);

    const combinedResults = [...res1.results, ...res2.results];

    // there's 5 "Mr" in the collection so the first 5 should be "mr" followed by a mrs
    for (const result of combinedResults.slice(0, 5)) {
      expect(result.title).toEqual("Mr");
    }
    expect(combinedResults[combinedResults.length - 1].title).toEqual("Mrs");

    // of the 5 Mr, the first 2 should be "pizza", next 3 should be potatoes
    for (const result of combinedResults.slice(0, 2)) {
      expect(result.favoriteFood).toEqual("pizza");
    }
    for (const result of combinedResults.slice(2, 5)) {
      expect(result.favoriteFood).toEqual("potatoes");
    }

    // of the potatoes, the first two birthyear should be  sorted 1921 followed by 1923
    for (const result of combinedResults.slice(2, 4)) {
      expect(result.birthYear).toEqual(1921);
    }
    expect(combinedResults[4].birthYear).toEqual(1923);

    // of the 1921's, they should be sorted by firstName
    expect(combinedResults[2].firstName).toEqual("Aguste");
    expect(combinedResults[3].firstName).toEqual("Graig");
  });

  it("behaves the same as find given the same arguments", async () => {
    const collection = db.collection("test_deep_sorts");

    const findResult1 = await find(collection, {
      limit: 3,
      paginatedField: "firstName",
      sortCaseInsensitive: false,
      sortAscending: true,
    });

    const findMultiResult1 = await findMulti(collection, {
      limit: 3,
      paginatedFields: [
        {
          paginatedField: "firstName",
          sortCaseInsensitive: true,
          sortAscending: true,
        },
      ],
    });

    expect(findResult1.results.map(r => r._id)).toEqual(
      findMultiResult1.results.map(r => r._id)
    );

    const findResult2 = await find(collection, {
      limit: 3,
      next: findResult1.next,
      paginatedField: "firstName",
      sortCaseInsensitive: false,
      sortAscending: true,
    });

    const findMultiResult2 = await findMulti(collection, {
      limit: 3,
      next: findMultiResult1.next,
      paginatedFields: [
        {
          paginatedField: "firstName",
          sortCaseInsensitive: true,
          sortAscending: true,
        },
      ],
    });

    expect(findResult2.results.map(r => r._id)).toEqual(
      findMultiResult2.results.map(r => r._id)
    );
  });

  it("sorts by _id by default", async () => {
    const collection = db.collection("test_deep_sorts");

    const result1 = await findMulti(collection, {
      limit: 3,
    });
    const result2 = await findMulti(collection, {
      next: result1.next,
      limit: 3,
    });

    const ids = [...result1.results, ...result2.results].map(r => `${r._id}`);

    expect(ids).toEqual([
      "64cb29a1b2a41fc8221041b9",
      "64cb29a1b2a41fc8221041b8",
      "64cb29a1b2a41fc8221041b7",
      "64cb29a1b2a41fc8221041b6",
      "64cb29a1b2a41fc8221041b5",
      "64cb29a1b2a41fc8221041b4",
    ]);
  });

  it("sorts by _id the other way", async () => {
    const collection = db.collection("test_deep_sorts");

    const result1 = await findMulti(collection, {
      limit: 3,
      paginatedFields: [
        {
          paginatedField: "_id",
          sortCaseInsensitive: false,
          sortAscending: true,
        },
      ],
    });
    const result2 = await findMulti(collection, {
      next: result1.next,
      limit: 3,
      paginatedFields: [
        {
          paginatedField: "_id",
          sortCaseInsensitive: false,
          sortAscending: true,
        },
      ],
    });

    const ids = [...result1.results, ...result2.results].map(r => `${r._id}`);

    expect(ids).toEqual([
      "64cb29a1b2a41fc8221041b0",
      "64cb29a1b2a41fc8221041b1",
      "64cb29a1b2a41fc8221041b2",
      "64cb29a1b2a41fc8221041b3",
      "64cb29a1b2a41fc8221041b4",
      "64cb29a1b2a41fc8221041b5",
    ]);
  });

  it("sorts by _id after all other sorts in the same direction as last sort", async () => {
    const collection = db.collection("test_deep_sorts");

    const result1 = await findMulti(collection, {
      limit: 3,
      paginatedFields: [
        {
          paginatedField: "firstName",
          sortCaseInsensitive: false,
          sortAscending: true,
        },
      ],
    });
    const result2 = await findMulti(collection, {
      next: result1.next,
      limit: 3,
      paginatedFields: [
        {
          paginatedField: "firstName",
          sortCaseInsensitive: false,
          sortAscending: true,
        },
      ],
    });

    const ids = [...result1.results, ...result2.results].map(r => `${r._id}`);

    // for people of the same first name their ids should be ascending
    expect(ids).toEqual([
      "64cb29a1b2a41fc8221041b0", // Aguste
      "64cb29a1b2a41fc8221041b1", // Aguste
      "64cb29a1b2a41fc8221041b2", // Aguste
      "64cb29a1b2a41fc8221041b5", // Carmencita
      "64cb29a1b2a41fc8221041b4", // D'arcy
      "64cb29a1b2a41fc8221041b3", // Flore
    ]);

    const result3 = await findMulti(collection, {
      limit: 3,
      paginatedFields: [
        {
          paginatedField: "firstName",
          sortCaseInsensitive: false,
          sortAscending: false,
        },
      ],
    });
    const result4 = await findMulti(collection, {
      next: result3.next,
      limit: 3,
      paginatedFields: [
        {
          paginatedField: "firstName",
          sortCaseInsensitive: false,
          sortAscending: false,
        },
      ],
    });

    const ids2 = [...result3.results, ...result4.results].map(r => `${r._id}`);

    // for people of the same first name their ids should be descending
    expect(ids2).toEqual([
      "64cb29a1b2a41fc8221041b9", // Wilmar
      "64cb29a1b2a41fc8221041b6", // Wilmar
      "64cb29a1b2a41fc8221041b7", // Ines
      "64cb29a1b2a41fc8221041b8", // Graig
      "64cb29a1b2a41fc8221041b3", // Flore
      "64cb29a1b2a41fc8221041b4", // D'arcy
    ]);
  });
});
