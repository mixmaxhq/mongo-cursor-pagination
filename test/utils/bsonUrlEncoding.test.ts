import { Db, ObjectId } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { encode, decode } from "../../src/utils/bsonUrlEncoding";

import dbUtils from "../support/db";

describe("bson url encoding", () => {
  let mongod: MongoMemoryServer;
  let db: Db;
  beforeAll(async () => {
    mongod = await dbUtils.start();
    db = await dbUtils.db(mongod);
  });

  afterAll(() => mongod.stop());

  it("encodes and decodes complex objects", async () => {
    const obj = {
      _id: new ObjectId("58164d86f69ab45942c6ff38"),
      date: new Date("Sun Oct 30 2016 12:32:35 GMT-0700 (PDT)"),
      number: 1,
      string: "complex String &$##$-/?",
    };
    await db.collection("test_objects").insertOne(obj);
    const bsonObject = await db.collection("test_objects").findOne({});
    const str = encode(bsonObject);

    expect(str).toEqual(
      "eyJfaWQiOnsiJG9pZCI6IjU4MTY0ZDg2ZjY5YWI0NTk0MmM2ZmYzOCJ9LCJkYXRlIjp7IiRkYXRlIjoiMjAxNi0xMC0zMFQxOTozMjozNVoifSwibnVtYmVyIjoxLCJzdHJpbmciOiJjb21wbGV4IFN0cmluZyAmJCMjJC0vPyJ9"
    );

    const decoded = decode(str);
    // Check types
    expect(decoded).toBeDefined();
    expect(typeof decoded.date).toEqual("object");
    expect(typeof decoded.number).toEqual("number");
    expect(typeof decoded.string).toEqual("string");
  });

  it("encodes and decodes strings", async () => {
    const str = encode("string _id");

    expect(str).toEqual("InN0cmluZyBfaWQi");

    const decoded = decode(str);
    expect(decoded).toEqual("string _id");
    expect(typeof decoded).toEqual("string");
  });
});
