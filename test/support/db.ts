import { MongoMemoryServer } from 'mongodb-memory-server';
import { Db, MongoClient as MongoClientType } from 'mongodb';
import * as mongoist from 'mongoist';
import { MongoClient } from 'mongodbv3';
function start(): MongoMemoryServer {
  return new MongoMemoryServer({
    binary: { version: '6.0.8' },
  });
}

interface DbResponse {
  db: Db;
  client?: MongoClientType;
}

async function db(mongod: MongoMemoryServer, driver: string | null = null): Promise<DbResponse> {
  const uri = await mongod.getUri();
  if (driver === 'mongoist') {
    return {
      db: await mongoist(uri),
    };
  }
  const clientToConnect = driver === 'mongodbv3' ? MongoClient : MongoClientType;
  const [client, dbName] = await Promise.all([clientToConnect.connect(uri), mongod.getDbName()]);
  return {
    db: client.db(dbName),
    client,
  };
}

export { db, start };
