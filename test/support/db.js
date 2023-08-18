const { MongoMemoryServer } = require('mongodb-memory-server');
/** See {@link exports.moduleNameMapper.^mongodbMapped$} */
const MongoClient = require('mongodbMapped').MongoClient;
const mongoist = require('mongoist');

function start() {
  return new MongoMemoryServer({
    binary: { version: '5.0.18' },
  });
}

async function db(mongod, driver = null) {
  const uri = await mongod.getUri();
  if (driver === 'mongoist') {
    return {
      db: await mongoist(uri),
    };
  }
  const [client, dbName] = await Promise.all([
    MongoClient.connect(uri, {
      useUnifiedTopology: true,
    }),
    mongod.getDbName(),
  ]);
  return {
    db: client.db(dbName),
    client,
  };
}

module.exports = {
  db,
  start,
};
