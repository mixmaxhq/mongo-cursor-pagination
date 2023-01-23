import { CollationOptions } from 'mongodb';

export default {
  /**
   * {Number} The maximum limit (page size).
   */
  MAX_LIMIT: 300,

  /**
   * {Number} The default limit (page size), if none is specified.
   */
  DEFAULT_LIMIT: 50,

  COLLATION: { locale: 'en' } as CollationOptions | undefined,
};
