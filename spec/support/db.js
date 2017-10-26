const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoist = require('mongoist');

function start() {
  return new MongoMemoryServer({
    binary: { version: '3.4.6' }
  });
}

async function db(mongod) {
  const uri = await mongod.getConnectionString();
  return mongoist(uri);
}

module.exports = {
  db,
  start
};
