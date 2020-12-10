const bsonUrlEncoding = require('./bsonUrlEncoding');
const objectPath = require('object-path');

module.exports = {
  /**
   * Builds the cursor for a document
   *
   * @param {Object} doc The document
   * @param {String} paginatedField The field name to query the range for.
   * @param {Boolean} shouldSecondarySortOnId Whether paginatedField is not strictly equal to '_id'
   *
   * @return {String} The cursor for the document
   */
  buildCursor(doc, paginatedField, shouldSecondarySortOnId) {
    const nextPaginatedField = objectPath.get(doc, paginatedField);

    const cursorData = shouldSecondarySortOnId ? [nextPaginatedField, doc._id] : nextPaginatedField;

    return bsonUrlEncoding.encode(cursorData);
  },

  /**
   * Injects a cursor on a document
   *
   * @param {Object} doc The document
   * @param {String} paginatedField The field name to query the range for.
   * @param {Boolean} shouldSecondarySortOnId Whether paginatedField is not strictly equal to '_id'
   *
   * @return {Object} The document with the new _cursor property
   */
  injectCursor(doc, paginatedField, shouldSecondarySortOnId) {
    doc._cursor = this.buildCursor(doc, paginatedField, shouldSecondarySortOnId);

    return doc;
  },
};
