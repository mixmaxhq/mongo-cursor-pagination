const bsonUrlEncoding = require('./bsonUrlEncoding');
const objectPath = require('object-path');

module.exports = {
  /**
   * Builds the cursor for a document
   *
   * @param {Object} doc The document
   * @param {String} paginatedField The field name to query the range for.
   *
   * @return {String} The cursor for the document
   */
  buildCursor(doc, paginatedField) {
    const shouldSecondarySortOnId = paginatedField !== '_id';

    const nextPaginatedField = objectPath.get(doc, paginatedField);

    const cursorData = shouldSecondarySortOnId ? [nextPaginatedField, doc._id] : nextPaginatedField;

    return bsonUrlEncoding.encode(cursorData);
  },

  /**
   * Injects a cursor on a document
   *
   * @param {Object} doc The document
   * @param {String} paginatedField The field name to query the range for.
   *
   * @return {Object} The document with the new _cursor property
   */
  injectCursor(doc, paginatedField) {
    doc._cursor = this.buildCursor(doc, paginatedField);

    return doc;
  },
};
