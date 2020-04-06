const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoist = require('mongoist');
const { MongoClient } = require('mongodb');

function start() {
  return new MongoMemoryServer({
    binary: { version: '3.4.6' },
  });
}

async function db(mongod, driver = null, databaseName = 'demo') {
  const uri = await mongod.getConnectionString();
  if (driver === 'mongoist') {
    return mongoist(uri);
  }

  const client = await MongoClient.connect(uri);

  return client.db(databaseName);
}

module.exports = {
  db,
  start,
};
