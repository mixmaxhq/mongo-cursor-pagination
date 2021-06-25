const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoist = require('mongoist');
const MongoClient = require('mongodb');

function start() {
  return new MongoMemoryServer({
    binary: { version: '4.0.12' },
  });
}

async function db(mongod, driver = null) {
  const uri = await mongod.getConnectionString();
  if (driver === 'mongoist') {
    return mongoist(uri);
  }
  return MongoClient.connect(uri);
}

module.exports = {
  db,
  start,
};
