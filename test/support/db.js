const { MongoClient } = require('mongodb');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoist = require('mongoist');

async function start() {
  return MongoMemoryServer.create({
    binary: { version: '5.0.11' },
  });
}

async function db(mongod, driver = null) {
  const uri = mongod.getUri();
  if (driver === 'mongoist') {
    return mongoist(uri);
  }
  const client = new MongoClient(uri);
  await client.connect();
  const database = client.db('test');
  return database;
}

module.exports = {
  db,
  start,
};
