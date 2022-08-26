const semver = require('semver');

let main;
// We use optional chaining (?.), so we need to use the transpiled versions
// in node versions earlier than 14.0.0:
if (semver.lt(process.version, '14.0.0')) {
  main = require('./dist/node/index.js');
} else {
  main = require('./src/index.js');
}
module.exports = main;
