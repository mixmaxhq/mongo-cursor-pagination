interface Config {
  /**
   * The maximum limit (page size).
   */
  MAX_LIMIT: number;

  /**
   * The default limit (page size), if none is specified.
   */
  DEFAULT_LIMIT: number;

  /**
   * The collation to use for sorting and searching.
   */
  COLLATION: Record<string, any> | null;
}

const config: Config = {
  MAX_LIMIT: 300,
  DEFAULT_LIMIT: 50,
  COLLATION: null,
};

export default config;
