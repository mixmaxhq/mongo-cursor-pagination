const EJSON = require('mongodb-extended-json');

/**
 * These will take a BSON object (an database result returned by the MongoDB library) and
 * encode/decode as a URL-safe string.
 */

exports.encode = obj => encodeURIComponent(Buffer.from(EJSON.stringify(obj), 'utf8').toString('base64'));
exports.decode = str => EJSON.parse(Buffer.from(decodeURIComponent(str), 'base64').toString('utf8'));
