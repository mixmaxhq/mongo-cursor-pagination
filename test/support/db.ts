import { MongoMemoryServer } from 'mongodb-memory-server';
import { Db, MongoClient } from 'mongodb';
import mongoist from 'mongoist';
import { MongoClient as MongoClientV3 } from 'mongodbv3';
function start(): MongoMemoryServer {
  return new MongoMemoryServer({
    binary: { version: '6.0.8' },
  });
}

const driver_version = process.env.DRIVER_VERSION;

interface DbResponse {
  db: Db;
  client?: MongoClient | MongoClientV3;
}

async function db(mongod: MongoMemoryServer, driver: string | null = null): Promise<DbResponse> {
  const uri = await mongod.getUri();
  if (driver === 'mongoist') {
    return {
      db: await mongoist(uri),
    };
  }
  const clientToConnect = driver_version === 'v3' ? MongoClientV3 : MongoClient;
  const [client, dbName] = await Promise.all([clientToConnect.connect(uri), mongod.getDbName()]);
  return {
    db: client.db(dbName),
    client,
  };
}

export { db, start };
