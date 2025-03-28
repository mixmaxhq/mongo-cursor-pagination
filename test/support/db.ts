import { MongoMemoryServer } from 'mongodb-memory-server';
import { Db, MongoClient } from 'mongodb';
import mongoist from 'mongoist';

async function start(): Promise<MongoMemoryServer> {
  return await MongoMemoryServer.create();
}
interface DbResponse {
  db: Db;
  client?: MongoClient;
}

async function db(mongod: MongoMemoryServer, driver: string | null = null): Promise<DbResponse> {
  const uri = await mongod.getUri();
  if (driver === 'mongoist') {
    return {
      db: await mongoist(uri),
    };
  }
  const [client, dbName] = await Promise.all([
    MongoClient.connect(uri),
    mongod.instanceInfo?.dbName,
  ]);
  return {
    db: client.db(dbName),
    client,
  };
}

export { db, start };
