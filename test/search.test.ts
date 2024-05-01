import { Db, ObjectId } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { search } from "../src";
import dbUtils from "./support/db";
import { decode } from "../src/utils/bsonUrlEncoding";

describe("search", () => {
  let mongod: MongoMemoryServer;
  let db: Db;
  beforeAll(async () => {
    mongod = await dbUtils.start();
    db = await dbUtils.db(mongod);

    // create two collections with indexes for searching
    await Promise.all([
      db
        .collection("test_paging_search")
        .createIndex({ mytext: "text" }, { name: "test_index" }),
      db
        .collection("test_duplicate_search")
        .createIndex({ mytext: "text" }, { name: "test_index" }),
    ]);

    await Promise.all([
      db.collection("test_paging_search").insertMany([
        {
          mytext: "one",
        },
        {
          mytext: "one two",
        },
        {
          mytext: "one two three",
        },
        {
          mytext: "one two three four",
        },
        {
          mytext: "one two three four five",
          group: "one",
        },
        {
          mytext: "one two three four five six",
          group: "one",
        },
        {
          mytext: "one two three four five six seven",
          group: "one",
        },
        {
          mytext: "one two three four five six seven eight",
          group: "one",
        },
      ]),

      db.collection("test_duplicate_search").insertMany(
        [
          {
            mytext: "one",
            counter: 1,
          },
          {
            mytext: "one",
            counter: 2,
          },
          {
            mytext: "one",
            counter: 3,
          },
          {
            mytext: "one two",
            counter: 4,
          },
          {
            mytext: "one two",
            counter: 5,
          },
          {
            mytext: "one two",
            counter: 6,
          },
        ]
          // expected returned order is above, however when sorted by duplicate fields, the secondary field
          // (in this case, the _id) is sorted from most the recent to oldest created. Thus, by reversing the
          // array of documents and adding the _id, means that counter 1 document has the latest object id
          .reverse()
          .map(document => ({ ...document, _id: new ObjectId() }))
      ),
    ]);
  });

  afterAll(() => mongod.stop());

  describe("query documents without duplicate values in the indexted field", () => {
    it("queries the first few pages", async () => {
      const collection = db.collection("test_paging_search");

      // First page of 2
      let res = await search(collection, "one", {
        fields: { mytext: 1 },
        limit: 2,
      });

      expect(res.results.length).toEqual(2);
      expect(res.results[0].mytext).toEqual("one");
      expect(res.results[0].score).toEqual(1.1);
      expect(res.results[1].mytext).toEqual("one two");
      expect(res.results[1].score).toEqual(0.75);
      expect(res.previous).toBeFalsy();
      expect(typeof res.next).toEqual("string");

      // Go forward 2
      res = await search(collection, "one", {
        fields: {
          mytext: 1,
        },
        limit: 3,
        next: res.next,
      });

      expect(res.results.length).toEqual(3);
      expect(res.results[0].mytext).toEqual("one two three");
      expect(res.results[0].score).toEqual(0.6666666666666666);
      expect(res.results[1].mytext).toEqual("one two three four");
      expect(res.results[1].score).toEqual(0.625);
      expect(res.results[2].mytext).toEqual("one two three four five");
      expect(res.results[2].score).toEqual(0.6);
      expect(typeof res.next).toEqual("string");

      // Go forward another 2
      res = await search(collection, "one", {
        fields: {
          mytext: 1,
        },
        limit: 4,
        next: res.next,
      });

      expect(res.results.length).toEqual(3);
      expect(res.results[0].mytext).toEqual("one two three four five six");
      expect(res.results[0].score).toEqual(0.5833333333333334);
      expect(res.results[1].mytext).toEqual(
        "one two three four five six seven"
      );
      expect(res.results[1].score).toEqual(0.5714285714285714);
      expect(res.results[2].mytext).toEqual(
        "one two three four five six seven eight"
      );
      expect(res.results[2].score).toEqual(0.5625);
      expect(res.next).toEqual(undefined);
    });

    it("paginates ONLY FORWARDS in ascending order on text search (need previous cursor value", async () => {
      const collection = db.collection("test_paging_search");

      ////////////////////// PAGE EXPECTATIONS ///////////////////////////////

      const expectPageOne = paginationReturn => {
        const {
          results: documentResults,
          next: nextCursor,
          previous: previousCursor,
        } = paginationReturn;

        expect(typeof nextCursor).toEqual("string");
        expect(previousCursor).toBeUndefined();

        expect(documentResults).toHaveLength(3);
        expect(documentResults[0]).toEqual(
          expect.objectContaining({
            mytext: "one",
            score: 1.1,
          })
        );
        expect(documentResults[1]).toEqual(
          expect.objectContaining({
            mytext: "one two",
            score: 0.75,
          })
        );
        expect(documentResults[2]).toEqual(
          expect.objectContaining({
            mytext: "one two three",
            score: 0.6666666666666666,
          })
        );

        expect(decode(nextCursor)).toEqual([
          0.6666666666666666,
          new ObjectId(documentResults[2]._id),
        ]);
      };

      const expectPageTwo = paginationReturn => {
        const { results: documentResults, next: nextCursor } = paginationReturn;

        expect(typeof nextCursor).toEqual("string");

        expect(documentResults).toHaveLength(3);
        expect(documentResults[0]).toEqual(
          expect.objectContaining({
            mytext: "one two three four",
            score: 0.625,
          })
        );
        expect(documentResults[1]).toEqual(
          expect.objectContaining({
            mytext: "one two three four five",
            score: 0.6,
          })
        );
        expect(documentResults[2]).toEqual(
          expect.objectContaining({
            mytext: "one two three four five six",
            score: 0.5833333333333334,
          })
        );

        expect(decode(nextCursor)).toEqual([
          0.5833333333333334,
          new ObjectId(documentResults[2]._id),
        ]);
      };

      const expectPageThree = paginationReturn => {
        const {
          results: documentResults,
          next: nextCursor,
          previous: previousCursor,
        } = paginationReturn;

        expect(nextCursor).toBeUndefined();

        expect(documentResults).toHaveLength(2);
        expect(documentResults[0]).toEqual(
          expect.objectContaining({
            mytext: "one two three four five six seven",
            score: 0.5714285714285714,
          })
        );
        expect(documentResults[1]).toEqual(
          expect.objectContaining({
            mytext: "one two three four five six seven eight",
            score: 0.5625,
          })
        );
      };

      /////////////////// PAGE 1 ///////////////////////

      let response = await search(collection, "one", {
        fields: { mytext: 1 },
        limit: 3,
      });

      expectPageOne(response);
      const page1NextCursor = response.next;

      ///////////// PAGE 2 (paginated forwards) /////////

      response = await search(collection, "one", {
        fields: { mytext: 1 },
        limit: 3,
        next: page1NextCursor,
      });

      expectPageTwo(response);
      const page2NextCursor = response.next;

      ///////////// PAGE 3 (paginated forwards) /////////

      response = await search(collection, "one", {
        fields: { mytext: 1 },
        limit: 3,
        next: page2NextCursor,
      });

      expectPageThree(response);
    });
  });

  describe("when there are duplicate scores", () => {
    it("queries the first few pages", async () => {
      const collection = db.collection("test_duplicate_search");
      // First page of 2.
      let res = await search(collection, "one", {
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
      expect(typeof res.next).toEqual("string");

      // Go forward 2
      res = await search(collection, "one", {
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
      expect(typeof res.next).toEqual("string");

      // Go forward another 2
      res = await search(collection, "one", {
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
