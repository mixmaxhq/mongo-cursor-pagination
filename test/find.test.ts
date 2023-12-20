import { MongoMemoryServer } from "mongodb-memory-server";
import { Collection, Db, Document, ObjectId } from "mongodb";
import _ from "underscore";

import { find, config } from "../src";
import dbUtils from "./support/db";

import { decode } from "../src/utils/bsonUrlEncoding";

let mongod: MongoMemoryServer;

describe("find", () => {
  let db: Db;
  beforeAll(async () => {
    mongod = await dbUtils.start();
    db = await dbUtils.db(mongod);

    // Set up collections once for testing later.
    await Promise.all([
      db.collection("test_paging").insertMany([
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
          color: "blue",
        },
        {
          counter: 5,
          color: "blue",
        },
        {
          counter: 6,
          color: "blue",
        },
        {
          counter: 7,
          color: "blue",
        },
        {
          counter: 8,
          color: "blue",
        },
      ]),

      db.collection("test_duplicate_custom_fields").insertMany(
        [
          {
            counter: 6,
            timestamp: 1477347800603,
          },
          {
            counter: 5,
            timestamp: 1477347800603,
          },
          {
            counter: 4,
            timestamp: 1477347800603,
          },
          {
            counter: 3,
            timestamp: 1477347772077,
          },
          {
            counter: 2,
            timestamp: 1477347772077,
          },
          {
            counter: 1,
            timestamp: 1477347772077,
          },
        ]
          .reverse()
          // the returnable order when queried on duplicate values is as above. Prior adding the
          // objectId, reverse the fields, which means that the counter: 6 will have the latest
          // objectId (as secondarily sorting by objectId will return the latest document)
          .map(fields => ({ ...fields, _id: new ObjectId() }))
      ),

      db.collection("test_paging_custom_fields").insertMany([
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

      db.collection("test_paging_date").insertMany([
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
      db.collection("test_paging_date_in_object").insertMany([
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

      db.collection("test_paging_limits").insertMany([
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

      db
        .collection("test_sorting")
        .insertMany(
          ["Alpha", "gimel", "Beta", "bet", "Gamma", "aleph"].map(name => ({
            name,
          }))
        ),

      db.collection("test_null_values").insertMany(
        [undefined, null, "Bravo", null, "Alice", undefined, null, "alpha"]
          // expectation is for an incrementing set of id values, so reverse the order
          // prior adding an objectId (as objectIds will order by latest to oldest)
          .reverse()
          .map(name => ({
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

  describe("basic usage", () => {
    describe("when using Mongo ObjectIds", () => {
      it("queries first few pages with next/previous", async () => {
        const collection = db.collection("test_paging");
        // First page of 3
        let res = await find(collection, {
          limit: 3,
        });

        expect(res.results.length).toEqual(3);
        expect(res.results[0].counter).toEqual(8);
        expect(res.results[1].counter).toEqual(7);
        expect(res.results[2].counter).toEqual(6);
        expect(res.hasPrevious).toBe(false);
        expect(res.hasNext).toBe(true);

        // Go forward 3
        res = await find(collection, {
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
        res = await find(collection, {
          limit: 3,
          next: res.next,
        });

        expect(res.results.length).toEqual(2);
        expect(res.results[0].counter).toEqual(2);
        expect(res.results[1].counter).toEqual(1);
        expect(res.hasPrevious).toBe(true);
        expect(res.hasNext).toBe(false);

        // Now back up 3
        res = await find(collection, {
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
        res = await find(collection, {
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

      it("queries first few pages with after/before", async () => {
        const collection = db.collection("test_paging");
        // First page of 3
        let res = await find(collection, {
          limit: 3,
        });

        expect(res.results.length).toEqual(3);
        expect(res.results[0].counter).toEqual(8);
        expect(res.results[1].counter).toEqual(7);
        expect(res.results[2].counter).toEqual(6);
        expect(res.hasPrevious).toBe(false);
        expect(res.hasNext).toBe(true);

        // Go forward 3
        res = await find(collection, {
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
        res = await find(collection, {
          limit: 3,
          after: res.results[res.results.length - 1]._id,
        });

        expect(res.results.length).toEqual(2);
        expect(res.results[0].counter).toEqual(2);
        expect(res.results[1].counter).toEqual(1);
        expect(res.hasPrevious).toBe(true);
        expect(res.hasNext).toBe(false);

        // Now back up 3
        res = await find(collection, {
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
        res = await find(collection, {
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

      it("handles hitting the end with next/previous", async () => {
        const collection = db.collection("test_paging");
        // First page of 2
        let res = await find(collection, {
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
        res = await find(collection, {
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
        res = await find(collection, {
          limit: 2,
          next: res.next,
        });

        expect(res.results.length).toEqual(1);
        expect(res.results[0].counter).toEqual(1);
        expect(res.hasPrevious).toBe(true);
        expect(res.hasNext).toBe(false);
      });

      it("handles hitting the end with after/before", async () => {
        const collection = db.collection("test_paging");
        // First page of 2
        let res = await find(collection, {
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
        res = await find(collection, {
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
        res = await find(collection, {
          limit: 2,
          after: res.results[res.results.length - 1]._id,
        });

        expect(res.results.length).toEqual(1);
        expect(res.results[0].counter).toEqual(1);
        expect(res.hasPrevious).toBe(true);
        expect(res.hasNext).toBe(false);
      });

      it("handles hitting the beginning with next/previous", async () => {
        const collection = db.collection("test_paging");
        // First page of 2
        let res = await find(collection, {
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
        res = await find(collection, {
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
        res = await find(collection, {
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

      it("handles hitting the beginning with after/before", async () => {
        const collection = db.collection("test_paging");
        // First page of 2
        let res = await find(collection, {
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
        res = await find(collection, {
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
        res = await find(collection, {
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

      it("usees passed-in criteria", async () => {
        const collection = db.collection("test_paging");
        // First page.
        const res = await find(collection, {
          query: {
            color: "blue",
          },
        });

        expect(res.results.length).toEqual(5);
        expect(res.results[0].color).toEqual("blue");
        expect(res.hasNext).toBe(false);
        expect(res.hasPrevious).toBe(false);
      });

      it("uses the hint parameter", async () => {
        const collection = db.collection("test_paging");
        await db
          .collection("test_paging")
          .createIndex({ color: 1 }, { name: "color_1" });
        // First page.
        const res = await find(collection, {
          query: {
            color: "blue",
          },
          hint: "color_1",
        });

        expect(res.results.length).toEqual(5);
        expect(res.results[0].color).toEqual("blue");
        expect(res.hasNext).toBe(false);
        expect(res.hasPrevious).toBe(false);
      });

      it('uses the "fields" parameter', async () => {
        const collection = db.collection("test_paging");
        // First page.
        const res = await find(collection, {
          query: {
            color: "blue",
          },
          fields: {
            _id: 1,
          },
        });

        expect(res.results.length).toEqual(5);
        expect(res.results[0].color).toBeFalsy();
      });

      it('does not return "next" or "previous" if there are no results', async () => {
        const collection = db.collection("test_paging");
        // First page.
        const res = await find(collection, {
          limit: 3,
          query: {
            nonexistantfield: true,
          },
        });

        expect(res.results.length).toEqual(0);
        expect(res.hasNext).toBe(false);
        expect(res.hasPrevious).toBe(false);
      });

      it("respects sortAscending option with next/previous", async () => {
        const collection = db.collection("test_paging");
        // First page of 3
        let res = await find(collection, {
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
        res = await find(collection, {
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
        res = await find(collection, {
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
        res = await find(collection, {
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
        res = await find(collection, {
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

      it("respects sortAscending option with after/before", async () => {
        const collection = db.collection("test_paging");
        // First page of 3
        let res = await find(collection, {
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
        res = await find(collection, {
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
        res = await find(collection, {
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
        res = await find(collection, {
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
        res = await find(collection, {
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

    describe("when using strings as _ids", () => {
      beforeAll(async () => {
        await db.collection("test_paging_string_ids").insertMany([
          {
            _id: new ObjectId(),
            counter: 1,
          },
          {
            _id: new ObjectId(),
            counter: 2,
          },
          {
            _id: new ObjectId(),
            counter: 3,
          },
          {
            _id: new ObjectId(),
            counter: 4,
            color: "blue",
          },
          {
            _id: new ObjectId(),
            counter: 5,
            color: "blue",
          },
          {
            _id: new ObjectId(),
            counter: 6,
            color: "blue",
          },
          {
            _id: new ObjectId(),
            counter: 7,
            color: "blue",
          },
          {
            _id: new ObjectId(),
            counter: 8,
            color: "blue",
          },
        ]);
      });

      afterAll(async () => {
        await db.collection("test_paging_string_ids").deleteMany();
        // beforeEach changed to beforeAll to handle
      });

      it("queries first few pages with next/previous", async () => {
        const collection = db.collection("test_paging_string_ids");
        // First page of 3
        let res = await find(collection, {
          limit: 3,
        });

        expect(res.results.length).toEqual(3);
        expect(res.results[0].counter).toEqual(8);
        expect(res.results[1].counter).toEqual(7);
        expect(res.results[2].counter).toEqual(6);
        expect(res.hasPrevious).toBe(false);
        expect(res.hasNext).toBe(true);

        // Go forward 3
        res = await find(collection, {
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
        res = await find(collection, {
          limit: 3,
          next: res.next,
        });

        expect(res.results.length).toEqual(2);
        expect(res.results[0].counter).toEqual(2);
        expect(res.results[1].counter).toEqual(1);
        expect(res.hasPrevious).toBe(true);
        expect(res.hasNext).toBe(false);

        // Now back up 3
        res = await find(collection, {
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
        res = await find(collection, {
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

      it("queries first few pages with after/before", async () => {
        const collection = db.collection("test_paging_string_ids");
        // First page of 3
        let res = await find(collection, {
          limit: 3,
        });

        expect(res.results.length).toEqual(3);
        expect(res.results[0].counter).toEqual(8);
        expect(res.results[1].counter).toEqual(7);
        expect(res.results[2].counter).toEqual(6);
        expect(res.hasPrevious).toBe(false);
        expect(res.hasNext).toBe(true);

        // Go forward 3
        res = await find(collection, {
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
        res = await find(collection, {
          limit: 3,
          after: res.results[res.results.length - 1]._id,
        });

        expect(res.results.length).toEqual(2);
        expect(res.results[0].counter).toEqual(2);
        expect(res.results[1].counter).toEqual(1);
        expect(res.hasPrevious).toBe(true);
        expect(res.hasNext).toBe(false);

        // Now back up 3
        res = await find(collection, {
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
        res = await find(collection, {
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

      it("handles hitting the end with next/previous", async () => {
        const collection = db.collection("test_paging_string_ids");
        // First page of 2
        let res = await find(collection, {
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
        res = await find(collection, {
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
        res = await find(collection, {
          limit: 2,
          next: res.next,
        });

        expect(res.results.length).toEqual(1);
        expect(res.results[0].counter).toEqual(1);
        expect(res.hasPrevious).toBe(true);
        expect(res.hasNext).toBe(false);
      });

      it("handles hitting the end with after/before", async () => {
        const collection = db.collection("test_paging_string_ids");
        // First page of 2
        let res = await find(collection, {
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
        res = await find(collection, {
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
        res = await find(collection, {
          limit: 2,
          after: res.results[res.results.length - 1]._id,
        });

        expect(res.results.length).toEqual(1);
        expect(res.results[0].counter).toEqual(1);
        expect(res.hasPrevious).toBe(true);
        expect(res.hasNext).toBe(false);
      });

      it("handles hitting the beginning with next/previous", async () => {
        const collection = db.collection("test_paging_string_ids");
        // First page of 2
        let res = await find(collection, {
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
        res = await find(collection, {
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
        res = await find(collection, {
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

      it("handles hitting the beginning with after/before", async () => {
        const collection = db.collection("test_paging_string_ids");
        // First page of 2
        let res = await find(collection, {
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
        res = await find(collection, {
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
        res = await find(collection, {
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

      it("uses passed-in criteria", async () => {
        const collection = db.collection("test_paging_string_ids");
        // First page.
        const res = await find(collection, {
          query: {
            color: "blue",
          },
        });

        expect(res.results.length).toEqual(5);
        expect(res.results[0].color).toEqual("blue");
        expect(res.hasNext).toBe(false);
        expect(res.hasPrevious).toBe(false);
      });

      it("uses the hint parameter", async () => {
        const collection = db.collection("test_paging_string_ids");
        await db
          .collection("test_paging_string_ids")
          .createIndex({ color: 1 }, { name: "color_1" });
        // First page.
        const res = await find(collection, {
          query: {
            color: "blue",
          },
          hint: "color_1",
        });

        expect(res.results.length).toEqual(5);
        expect(res.results[0].color).toEqual("blue");
        expect(res.hasNext).toBe(false);
        expect(res.hasPrevious).toBe(false);
      });

      it('uses the "fields" parameter', async () => {
        const collection = db.collection("test_paging_string_ids");
        // First page.
        const res = await find(collection, {
          query: {
            color: "blue",
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
        const collection = db.collection("test_paging_string_ids");
        // First page.
        const res = await find(collection, {
          limit: 3,
          query: {
            nonexistantfield: true,
          },
        });

        expect(res.results.length).toEqual(0);
        expect(res.hasNext).toBe(false);
        expect(res.hasPrevious).toBe(false);
      });

      it("respects sortAscending option with next/previous", async () => {
        const collection = db.collection("test_paging_string_ids");
        // First page of 3
        let res = await find(collection, {
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
        res = await find(collection, {
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
        res = await find(collection, {
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
        res = await find(collection, {
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
        res = await find(collection, {
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

      it("respects sortAscending option with after/before", async () => {
        const collection = db.collection("test_paging_string_ids");
        // First page of 3
        let res = await find(collection, {
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
        res = await find(collection, {
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
        res = await find(collection, {
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
        res = await find(collection, {
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
        res = await find(collection, {
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

  describe("when paginating on custom fields", () => {
    it("queries the first few pages with next/previous", async () => {
      const collection = db.collection("test_paging_custom_fields");
      // First page of 2
      let res = await find(collection, {
        limit: 2,
        paginatedField: "timestamp",
      });

      expect(res.results.length).toEqual(2);
      expect(res.results[0].counter).toEqual(6);
      expect(res.results[1].counter).toEqual(5);
      expect(res.hasPrevious).toBe(false);
      expect(res.hasNext).toBe(true);

      // Go forward 2
      res = await find(collection, {
        limit: 2,
        paginatedField: "timestamp",
        next: res.next,
      });

      expect(res.results.length).toEqual(2);
      expect(res.results[0].counter).toEqual(4);
      expect(res.results[1].counter).toEqual(3);
      expect(res.hasPrevious).toBe(true);
      expect(res.hasNext).toBe(true);

      // Go forward another 2
      res = await find(collection, {
        limit: 2,
        paginatedField: "timestamp",
        next: res.next,
      });

      expect(res.results.length).toEqual(2);
      expect(res.results[0].counter).toEqual(2);
      expect(res.results[1].counter).toEqual(1);
      expect(res.hasPrevious).toBe(true);
      expect(res.hasNext).toBe(false);

      // Now back up 2
      res = await find(collection, {
        limit: 2,
        paginatedField: "timestamp",
        previous: res.previous,
      });

      expect(res.results.length).toEqual(2);
      expect(res.results[0].counter).toEqual(4);
      expect(res.results[1].counter).toEqual(3);
      expect(res.hasPrevious).toBe(true);
      expect(res.hasNext).toBe(true);
    });

    it("queries the first few pages with after/before", async () => {
      const collection = db.collection("test_paging_custom_fields");

      ///////////// PAGE EXPECTATIONS //////////////

      const expectPageOne = response => {
        const { results, hasPrevious, hasNext } = response;

        expect(results.length).toEqual(2);
        expect(results[0].counter).toEqual(6);
        expect(results[1].counter).toEqual(5);
        expect(hasPrevious).toBe(false);
        expect(hasNext).toBe(true);
      };

      const expectPageTwo = response => {
        const { results, hasPrevious, hasNext } = response;
        expect(results.length).toEqual(2);
        expect(results[0].counter).toEqual(4);
        expect(results[1].counter).toEqual(3);
        expect(hasPrevious).toBe(true);
        expect(hasNext).toBe(true);
      };

      const expectPageThree = response => {
        const { results, hasPrevious, hasNext } = response;
        expect(results.length).toEqual(2);
        expect(results[0].counter).toEqual(2);
        expect(results[1].counter).toEqual(1);
        expect(hasPrevious).toBe(true);
        expect(hasNext).toBe(false);
      };

      ///////////// PAGINATION //////////////////

      // First page of 2
      let res = await find(collection, {
        limit: 2,
        paginatedField: "timestamp",
      });
      expectPageOne(res);
      const page1LastResultId = res.results[res.results.length - 1]._id;

      // Go forward 2
      res = await find(collection, {
        limit: 2,
        paginatedField: "timestamp",
        after: page1LastResultId,
      });
      expectPageTwo(res);
      const page2LastResultId = res.results[res.results.length - 1]._id;

      // Go forward another 2
      res = await find(collection, {
        limit: 2,
        paginatedField: "timestamp",
        after: page2LastResultId,
      });
      expectPageThree(res);
      const page3FirstResultId = res.results[0]._id;

      // Now back up 2
      res = await find(collection, {
        limit: 2,
        paginatedField: "timestamp",
        before: page3FirstResultId,
      });

      expectPageTwo(res);
      const page2FirstResultId = res.results[0]._id;

      // Now back up a final x2 to the original first page
      res = await find(collection, {
        limit: 2,
        paginatedField: "timestamp",
        before: page2FirstResultId,
      });
      expectPageOne(res);
    });

    it("does not include the paginatedField in the results if not desired", async () => {
      const collection = db.collection("test_paging_custom_fields");
      const res = await find(collection, {
        limit: 1,
        fields: { counter: 1 },
        paginatedField: "timestamp",
      });
      expect(res.results[0].timestamp).toBe(undefined);
      expect(res.hasNext).toBe(true);
    });

    it("does not overwrite $or used in a query with next/previous", async () => {
      const collection = db.collection("test_paging_custom_fields");
      // First page of 2
      let res = await find(collection, {
        query: { $or: [{ counter: { $gt: 3 } }] },
        limit: 2,
        paginatedField: "timestamp",
      });

      expect(res.results.length).toEqual(2);
      expect(res.results[0].counter).toEqual(6);
      expect(res.results[1].counter).toEqual(5);
      expect(res.hasPrevious).toBe(false);
      expect(res.hasNext).toBe(true);

      // Go forward 2
      res = await find(collection, {
        query: { $or: [{ counter: { $gt: 3 } }] },
        limit: 2,
        paginatedField: "timestamp",
        next: res.next,
      });

      expect(res.results.length).toEqual(1);
      expect(res.results[0].counter).toEqual(4);
      expect(res.hasPrevious).toBe(true);
      expect(res.hasNext).toBe(false);
    });

    it("does not overwrite $or used in a query with after/before", async () => {
      const collection = db.collection("test_paging_custom_fields");
      // First page of 2
      let res = await find(collection, {
        query: { $or: [{ counter: { $gt: 3 } }] },
        limit: 2,
        paginatedField: "timestamp",
      });

      expect(res.results.length).toEqual(2);
      expect(res.results[0].counter).toEqual(6);
      expect(res.results[1].counter).toEqual(5);
      expect(res.hasPrevious).toBe(false);
      expect(res.hasNext).toBe(true);

      // Go forward 2
      res = await find(collection, {
        query: { $or: [{ counter: { $gt: 3 } }] },
        limit: 2,
        paginatedField: "timestamp",
        after: res.results[res.results.length - 1]._id,
      });

      expect(res.results.length).toEqual(1);
      expect(res.results[0].counter).toEqual(4);
      expect(res.hasPrevious).toBe(true);
      expect(res.hasNext).toBe(false);
    });
  });

  describe("when there are duplicate values for the paginated field", () => {
    it("queries the first few pages with next/previous", async () => {
      const collection = db.collection("test_duplicate_custom_fields");
      // First page of 2
      let res = await find(collection, {
        limit: 2,
        paginatedField: "timestamp",
      });

      expect(res.results.length).toEqual(2);
      expect(res.results[0].counter).toEqual(6);
      expect(res.results[1].counter).toEqual(5);
      expect(res.hasPrevious).toBe(false);
      expect(res.hasNext).toBe(true);

      // Go forward 2
      res = await find(collection, {
        limit: 2,
        paginatedField: "timestamp",
        next: res.next,
      });

      expect(res.results.length).toEqual(2);
      expect(res.results[0].counter).toEqual(4);
      expect(res.results[1].counter).toEqual(3);
      expect(res.hasPrevious).toBe(true);
      expect(res.hasNext).toBe(true);

      // Go forward another 2
      res = await find(collection, {
        limit: 2,
        paginatedField: "timestamp",
        next: res.next,
      });

      expect(res.results.length).toEqual(2);
      expect(res.results[0].counter).toEqual(2);
      expect(res.results[1].counter).toEqual(1);
      expect(res.hasPrevious).toBe(true);
      expect(res.hasNext).toBe(false);

      // Now back up 2
      res = await find(collection, {
        limit: 2,
        paginatedField: "timestamp",
        previous: res.previous,
      });

      expect(res.results.length).toEqual(2);
      expect(res.results[0].counter).toEqual(4);
      expect(res.results[1].counter).toEqual(3);
      expect(res.hasPrevious).toBe(true);
      expect(res.hasNext).toBe(true);
    });

    it("queries the first few pages with after/before", async () => {
      const collection = db.collection("test_duplicate_custom_fields");
      // First page of 2
      let res = await find(collection, {
        limit: 2,
        paginatedField: "timestamp",
      });

      expect(res.results.length).toEqual(2);
      expect(res.results[0].counter).toEqual(6);
      expect(res.results[1].counter).toEqual(5);
      expect(res.hasPrevious).toBe(false);
      expect(res.hasNext).toBe(true);

      // Go forward 2
      res = await find(collection, {
        limit: 2,
        paginatedField: "timestamp",
        after: res.results[res.results.length - 1]._id,
      });

      expect(res.results.length).toEqual(2);
      expect(res.results[0].counter).toEqual(4);
      expect(res.results[1].counter).toEqual(3);
      expect(res.hasPrevious).toBe(true);
      expect(res.hasNext).toBe(true);

      // Go forward another 2
      res = await find(collection, {
        limit: 2,
        paginatedField: "timestamp",
        after: res.results[res.results.length - 1]._id,
      });

      expect(res.results.length).toEqual(2);
      expect(res.results[0].counter).toEqual(2);
      expect(res.results[1].counter).toEqual(1);
      expect(res.hasPrevious).toBe(true);
      expect(res.hasNext).toBe(false);

      // Now back up 2
      res = await find(collection, {
        limit: 2,
        paginatedField: "timestamp",
        before: res.results[0]._id,
      });

      expect(res.results.length).toEqual(2);
      expect(res.results[0].counter).toEqual(4);
      expect(res.results[1].counter).toEqual(3);
      expect(res.hasPrevious).toBe(true);
      expect(res.hasNext).toBe(true);
    });

    it("does not include fields not desired", async () => {
      const collection = db.collection("test_duplicate_custom_fields");
      const res = await find(collection, {
        limit: 1,
        fields: {
          counter: 1,
        },
        paginatedField: "timestamp",
      });

      expect(res.results[0]).toEqual(expect.not.objectContaining({ _id: 123 }));
      expect(res.hasNext).toBe(true);
    });

    it("respects sortAscending with next/previous", async () => {
      const collection = db.collection("test_duplicate_custom_fields");
      // First page of 2
      let res = await find(collection, {
        limit: 2,
        paginatedField: "timestamp",
        sortAscending: true,
      });

      expect(res.results.length).toEqual(2);
      expect(res.results[0].counter).toEqual(1);
      expect(res.results[1].counter).toEqual(2);
      expect(res.hasPrevious).toBe(false);
      expect(res.hasNext).toBe(true);

      // Go forward 2
      res = await find(collection, {
        limit: 2,
        paginatedField: "timestamp",
        next: res.next,
        sortAscending: true,
      });

      expect(res.results.length).toEqual(2);
      expect(res.results[0].counter).toEqual(3);
      expect(res.results[1].counter).toEqual(4);
      expect(res.hasPrevious).toBe(true);
      expect(res.hasNext).toBe(true);

      // Go forward another 2
      res = await find(collection, {
        limit: 2,
        paginatedField: "timestamp",
        next: res.next,
        sortAscending: true,
      });

      expect(res.results.length).toEqual(2);
      expect(res.results[0].counter).toEqual(5);
      expect(res.results[1].counter).toEqual(6);
      expect(res.hasPrevious).toBe(true);
      expect(res.hasNext).toBe(false);

      // Now back up 2
      res = await find(collection, {
        limit: 2,
        paginatedField: "timestamp",
        previous: res.previous,
        sortAscending: true,
      });

      expect(res.results.length).toEqual(2);
      expect(res.results[0].counter).toEqual(3);
      expect(res.results[1].counter).toEqual(4);
      expect(res.hasPrevious).toBe(true);
      expect(res.hasNext).toBe(true);
    });

    it("respects sortAscending with after/before", async () => {
      const collection = db.collection("test_duplicate_custom_fields");
      // First page of 2
      let res = await find(collection, {
        limit: 2,
        paginatedField: "timestamp",
        sortAscending: true,
      });

      expect(res.results.length).toEqual(2);
      expect(res.results[0].counter).toEqual(1);
      expect(res.results[1].counter).toEqual(2);
      expect(res.hasPrevious).toBe(false);
      expect(res.hasNext).toBe(true);

      // Go forward 2
      res = await find(collection, {
        limit: 2,
        paginatedField: "timestamp",
        after: res.results[res.results.length - 1]._id,
        sortAscending: true,
      });

      expect(res.results.length).toEqual(2);
      expect(res.results[0].counter).toEqual(3);
      expect(res.results[1].counter).toEqual(4);
      expect(res.hasPrevious).toBe(true);
      expect(res.hasNext).toBe(true);

      // Go forward another 2
      res = await find(collection, {
        limit: 2,
        paginatedField: "timestamp",
        after: res.results[res.results.length - 1]._id,
        sortAscending: true,
      });

      expect(res.results.length).toEqual(2);
      expect(res.results[0].counter).toEqual(5);
      expect(res.results[1].counter).toEqual(6);
      expect(res.hasPrevious).toBe(true);
      expect(res.hasNext).toBe(false);

      // Now back up 2
      res = await find(collection, {
        limit: 2,
        paginatedField: "timestamp",
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

  describe("when sorting using dates", () => {
    it("queries the first few pages with next/previous", async () => {
      const collection = db.collection("test_paging_date");
      // First page of 2
      let res = await find(collection, {
        limit: 2,
        paginatedField: "date",
      });

      expect(res.results.length).toEqual(2);
      expect(res.results[0].counter).toEqual(4);
      expect(res.results[1].counter).toEqual(3);
      expect(res.hasPrevious).toBe(false);
      expect(res.hasNext).toBe(true);

      // Go forward 2
      res = await find(collection, {
        limit: 2,
        paginatedField: "date",
        next: res.next,
      });

      expect(res.results.length).toEqual(2);
      expect(res.results[0].counter).toEqual(2);
      expect(res.results[1].counter).toEqual(1);
      expect(res.hasPrevious).toBe(true);
      expect(res.hasNext).toBe(false);
    });

    it("queries the first few pages with after/before", async () => {
      const collection = db.collection("test_paging_date");
      // First page of 2
      let res = await find(collection, {
        limit: 2,
        paginatedField: "date",
      });

      expect(res.results.length).toEqual(2);
      expect(res.results[0].counter).toEqual(4);
      expect(res.results[1].counter).toEqual(3);
      expect(res.hasPrevious).toBe(false);
      expect(res.hasNext).toBe(true);

      // Go forward 2
      res = await find(collection, {
        limit: 2,
        paginatedField: "date",
        after: res.results[res.results.length - 1]._id,
      });

      expect(res.results.length).toEqual(2);
      expect(res.results[0].counter).toEqual(2);
      expect(res.results[1].counter).toEqual(1);
      expect(res.hasPrevious).toBe(true);
      expect(res.hasNext).toBe(false);
    });
  });

  describe("when the paginated fields is a date and using dot notation", () => {
    it("queries the first few pages with next/previous", async () => {
      const collection = db.collection("test_paging_date_in_object");
      const paginatedField = "start.date"; // Use dot notation in paginated field.
      const limit = 2;

      // First page.
      let res = await find(collection, {
        limit,
        paginatedField,
      });

      expect(res.results.length).toEqual(2);
      expect(res.results[0].counter).toEqual(4);
      expect(res.results[1].counter).toEqual(3);
      expect(res.hasPrevious).toBe(false);
      expect(res.hasNext).toBe(true);

      // Go forward.
      res = await find(collection, {
        limit,
        paginatedField,
        next: res.next,
      });

      expect(res.results.length).toEqual(2);
      expect(res.results[0].counter).toEqual(2);
      expect(res.results[1].counter).toEqual(1);
      expect(res.hasPrevious).toBe(true);
      expect(res.hasNext).toBe(false);

      // Go backward
      res = await find(collection, {
        limit,
        paginatedField,
        previous: res.previous,
      });

      expect(res.results.length).toEqual(2);
      expect(res.results[0].counter).toEqual(4);
      expect(res.results[1].counter).toEqual(3);
      expect(res.hasPrevious).toBe(false);
      expect(res.hasNext).toBe(true);
    });

    it("queries the first few pages with after/before", async () => {
      const collection = db.collection("test_paging_date_in_object");
      const paginatedField = "start.date"; // Use dot notation in paginated field.
      const limit = 2;

      /////////////////// PAGE EXPECTATIONS ///////////////////////
      const expectPageOne = response => {
        const { results, hasPrevious, hasNext } = response;
        expect(results.start).toEqual(undefined); // Verify it is not returned since it is not requested.
        expect(results.length).toEqual(2);
        expect(results[0].counter).toEqual(4);
        expect(results[1].counter).toEqual(3);
        expect(hasPrevious).toBe(false);
        expect(hasNext).toBe(true);
      };

      const expectPageTwo = response => {
        const { results, hasPrevious, hasNext } = response;
        expect(results.start).toEqual(undefined); // Verify it is not returned since it is not requested.
        expect(results.length).toEqual(2);
        expect(results[0].counter).toEqual(2);
        expect(results[1].counter).toEqual(1);
        expect(hasPrevious).toBe(true);
        expect(hasNext).toBe(false);
      };

      /////////////////// QUERY PAGINATION ///////////////////////
      // First page.
      let res = await find(collection, {
        limit,
        paginatedField,
      });
      expectPageOne(res);
      const page1LastResultId =
        res.results[res.results.length - 1]._id.toString();

      // Go forward to page two
      res = await find(collection, {
        limit,
        paginatedField,
        after: page1LastResultId,
      });
      expectPageTwo(res);
      const page2FirstResultId = res.results[0]._id;

      // Go backward to page one again
      res = await find(collection, {
        limit,
        paginatedField,
        before: page2FirstResultId,
      });
      expectPageOne(res);
    });
  });

  describe("when using alphabetical sorting", () => {
    it("queries the first few pages with next/previous", async () => {
      const collection = db.collection("test_sorting");

      const res = await find(collection, {
        paginatedField: "name",
        sortAscending: true,
        limit: 10,
      });

      expect(_.pluck(res.results, "name")).toEqual([
        "Alpha",
        "Beta",
        "Gamma",
        "aleph",
        "bet",
        "gimel",
      ]);

      const res_localized = await find(collection, {
        paginatedField: "name",
        sortAscending: true,
        limit: 10,
        collation: { locale: "en" },
      });

      expect(_.pluck(res_localized.results, "name")).toEqual([
        "aleph",
        "Alpha",
        "bet",
        "Beta",
        "Gamma",
        "gimel",
      ]);

      config.COLLATION = { locale: "en" };

      const res_static_localized = await find(collection, {
        paginatedField: "name",
        sortAscending: true,
        limit: 10,
      });

      expect(_.pluck(res_static_localized.results, "name")).toEqual([
        "aleph",
        "Alpha",
        "bet",
        "Beta",
        "Gamma",
        "gimel",
      ]);

      const res_excluding_collation = await find(collection, {
        paginatedField: "name",
        sortAscending: true,
        limit: 10,
        collation: null,
      });

      expect(_.pluck(res_excluding_collation.results, "name")).toEqual([
        "Alpha",
        "Beta",
        "Gamma",
        "aleph",
        "bet",
        "gimel",
      ]);
    });

    describe("when collection contains null and undefined values", () => {
      it("returns null and undefined as same primary sort value, and returns before alphabetical values", async () => {
        const collection = db.collection("test_null_values");
        // DOCUMENTS in oldest to latest order =>
        // [undefined, null, 'Bravo', null, 'Alice' undefined, null, 'alpha']

        ////////////////////// PAGE EXPECTATIONS /////////////////////////////////
        // expect that the undefined + null values are considered the same for sorting, so
        // the most recently created will be returned first

        // expect PageOne => null, undefined, null
        // expect PageTwo => null, undefined, 'Alice'
        // expect PageThree -> 'Bravo', 'alpha'

        const expectPageOne = response => {
          const { results, hasNext, hasPrevious } = response;

          expect(hasNext).toBe(true);
          expect(hasPrevious).toBe(false);
          expect(results).toHaveLength(3);

          expect(results[0].name).toEqual(null);
          const firstResultDecodedCursor = decode(results[0]._cursor);
          expect(firstResultDecodedCursor).toHaveLength(2);
          expect(firstResultDecodedCursor?.[0]).toEqual(null);
          expect(firstResultDecodedCursor?.[1].toString()).toEqual(
            results[0]._id.toString()
          );

          expect(results[1].name).toBeUndefined();
          const secondResultDecodedCursor = decode(results[1]._cursor);
          expect(secondResultDecodedCursor).toHaveLength(2);
          expect(secondResultDecodedCursor?.[0]).toEqual(undefined);
          expect(secondResultDecodedCursor?.[1].toString()).toEqual(
            results[1]._id.toString()
          );

          expect(results[2].name).toEqual(null);
          const thirdResultDecodedCursor = decode(results[2]._cursor);
          expect(thirdResultDecodedCursor).toHaveLength(2);
          expect(thirdResultDecodedCursor?.[0]).toEqual(null);
          expect(thirdResultDecodedCursor?.[1].toString()).toEqual(
            results[2]._id.toString()
          );
        };

        const expectPageTwo = response => {
          const { results, hasNext, hasPrevious } = response;

          expect(hasNext).toBe(true);
          expect(hasPrevious).toBe(true);
          expect(results).toHaveLength(3);

          expect(results[0].name).toEqual(null);
          const firstResultDecodedCursor = decode(results[0]._cursor);
          expect(firstResultDecodedCursor).toHaveLength(2);
          expect(firstResultDecodedCursor?.[0]).toEqual(null);
          expect(firstResultDecodedCursor?.[1].toString()).toEqual(
            results[0]._id.toString()
          );

          expect(results[1].name).toBeUndefined();
          const secondResultDecodedCursor = decode(results[1]._cursor);
          expect(secondResultDecodedCursor).toHaveLength(2);
          expect(secondResultDecodedCursor?.[0]).toEqual(undefined);
          expect(secondResultDecodedCursor?.[1].toString()).toEqual(
            results[1]._id.toString()
          );

          expect(results[2].name).toEqual("Alice");
          const thirdResultDecodedCursor = decode(results[2]._cursor);
          expect(thirdResultDecodedCursor).toHaveLength(2);
          expect(thirdResultDecodedCursor?.[0]).toEqual("Alice");
          expect(thirdResultDecodedCursor?.[1].toString()).toEqual(
            results[2]._id.toString()
          );
        };

        const expectPageThree = response => {
          const { results, hasNext, hasPrevious } = response;

          expect(hasNext).toBe(false);
          expect(hasPrevious).toBe(true);
          expect(results).toHaveLength(2);

          expect(results[0].name).toEqual("Bravo");
          const firstResultDecodedCursor = decode(results[0]._cursor);
          expect(firstResultDecodedCursor).toHaveLength(2);
          expect(firstResultDecodedCursor?.[0]).toEqual("Bravo");
          expect(firstResultDecodedCursor?.[1].toString()).toEqual(
            results[0]._id.toString()
          );

          expect(results[1].name).toEqual("alpha"); // as case senitivity sorted, expect 'alpha' after 'Bravo'
          const secondResultDecodedCursor = decode(results[1]._cursor);
          expect(secondResultDecodedCursor).toHaveLength(2);
          expect(secondResultDecodedCursor?.[0]).toEqual("alpha");
          expect(secondResultDecodedCursor?.[1].toString()).toEqual(
            results[1]._id.toString()
          );
        };

        ///////////// TEST PAGE EXPECTATIONS /////////////////////

        const options = {
          paginatedField: "name",
          sortAscending: true,
          limit: 3,
        };

        // Initial page
        let response = await find(collection, { ...options });
        expectPageOne(response);
        const page1NextCursor =
          response.results[response.results.length - 1]._cursor;

        // Get second Page via forward pagination
        response = await find(collection, {
          ...options,
          next: page1NextCursor,
        });
        expectPageTwo(response);
        const page2NextCursor =
          response.results[response.results.length - 1]._cursor;

        // Get third Page via forward pagination
        response = await find(collection, {
          ...options,
          next: page2NextCursor,
        });
        expectPageThree(response);
        const page3StartCursor = response.results[0]._cursor;

        // Get second page via backward pagination
        response = await find(collection, {
          ...options,
          previous: page3StartCursor,
        });
        expectPageTwo(response);
        const page2StartCursor = response.results[0]._cursor;

        // Get first page via backward pagination
        response = await find(collection, {
          ...options,
          previous: page2StartCursor,
        });
        expectPageOne(response);
      });
    });
  });

  describe("when default limits are hit", () => {
    const originalDefaultLimit = config.DEFAULT_LIMIT;
    beforeAll(() => (config.DEFAULT_LIMIT = 2));
    afterAll(() => (config.DEFAULT_LIMIT = originalDefaultLimit));

    it("clamps to the lower limit", async () => {
      const collection = db.collection("test_paging_limits");
      const res = await find(collection, {
        limit: -1,
      });

      expect(res.results.length).toEqual(1);
    });

    it("sets a default limit", async () => {
      const collection = db.collection("test_paging_limits");
      const res = await find(collection, {});

      expect(res.results.length).toEqual(2);
    });

    it("allows overriding the limit", async () => {
      const collection = db.collection("test_paging_limits");
      const res = await find(collection, {
        limit: 4,
      });

      expect(res.results.length).toEqual(4);
    });
  });
  describe("when max limits are hit", () => {
    const originalMaxLimit = config.MAX_LIMIT;
    beforeAll(() => (config.MAX_LIMIT = 2));
    afterAll(() => (config.MAX_LIMIT = originalMaxLimit));

    it("clamps to the max limit", async () => {
      const collection = db.collection("test_paging_limits");
      const res = await find(collection, {
        limit: 999,
      });

      expect(res.results.length).toEqual(2);
    });
  });

  describe("sorting without collation", () => {
    let collection: Collection<Document>;
    beforeAll(() => {
      collection = db.collection("test_sorting");
    });

    describe("without the `sortCaseInsensitive` parameter", () => {
      const options = {
        paginatedField: "name",
        sortAscending: true,
        limit: 2,
      };

      it("sorts capital letters first", async () => {
        const { results: results } = await find(collection, options);
        expect(_.pluck(results, "name")).toEqual(["Alpha", "Beta"]);
      });
    });

    describe("with the `sortCaseInsensitive` parameter...", () => {
      const options = {
        paginatedField: "name",
        sortCaseInsensitive: true,
        sortAscending: true,
        limit: 2,
      };

      it("sorts case-insensitively", async () => {
        const r = await find(collection, { ...options });
        expect(_.pluck(r.results, "name")).toEqual(["aleph", "Alpha"]);
        expect(r.hasNext).toBe(true);
        expect(r.hasPrevious).toBe(false);
      });

      it("returns the paginated field but not the temporary __lower_case_value field", async () => {
        const r = await find(collection, { ...options });
        expect("name" in r.results[0]).toBe(true);
        expect("__lower_case_value" in r.results[0]).toBe(false);
      });

      it("pages correctly forward and backward", async () => {
        const { next } = await find(collection, { ...options });
        const pg2 = await find(collection, { ...options, next });
        expect(_.pluck(pg2.results, "name")).toEqual(["bet", "Beta"]);
        expect(pg2.hasPrevious).toBe(true);
        const pg1 = await find(collection, {
          ...options,
          previous: pg2.previous,
        });
        expect(_.pluck(pg1.results, "name")).toEqual(["aleph", "Alpha"]);
        expect(pg1.hasNext).toBe(true);
        expect(pg1.hasPrevious).toBe(false);
        expect(pg1.next).toEqual(next);
      });
    });
  });
});
