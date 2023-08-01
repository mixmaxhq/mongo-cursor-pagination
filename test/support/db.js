const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoist = require('mongoist');
const MongoClient = require('mongodb');

function start() {
  return new MongoMemoryServer({
    binary: { version: '5.0.18' },
  });
}

async function db(mongod, driver = null) {
  const uri = await mongod.getUri();
  if (driver === 'mongoist') {
    return mongoist(uri);
  }
  return MongoClient.connect(uri);
}

module.exports = {
  db,
  start,
};
