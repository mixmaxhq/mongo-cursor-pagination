const EJSON = require('mongodb-extended-json');

/**
 * These will take a BSON object (an database result returned by the MongoDB library) and
 * encode/decode as a URL-safe string.
 */

function encode(obj) {
  return encodeURIComponent(Buffer.from(EJSON.stringify(obj), 'utf8').toString('base64'));
}

function decode(str) {
  return EJSON.parse(Buffer.from(decodeURIComponent(str), 'base64').toString('utf8'));
}

exports.encode = encode;
exports.decode = decode;
