var EJSON = require('mongodb-extended-json');
var base64url = require('base64-url');

/**
 * These will take a BSON object (an database result returned by the MongoDB library) and
 * encode/decode as a URL-safe string.
 */

module.exports.encode = function(obj) {
  return base64url.encode(EJSON.stringify(obj));
};

module.exports.decode = function(str) {
  return EJSON.parse(base64url.decode(str));
};
