import { MongoClient, Db } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';

async function start(): Promise<MongoMemoryServer> {
  return MongoMemoryServer.create({
    binary: { version: '5.0.11' },
  });
}

async function db(mongod: { getUri: () => any }): Promise<Db> {
  const uri = mongod.getUri();

  const client = new MongoClient(uri);
  await client.connect();
  const database = client.db('test');
  return database;
}

export default {
  db,
  start,
};
