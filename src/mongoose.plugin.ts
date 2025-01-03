import { Schema } from 'mongoose';
import _ from 'underscore';
import find, { FindParams } from './find';
import search, { SearchParams } from './search';

interface PaginatePluginOptions {
  name?: string; // Name of the pagination function
  searchFnName?: string; // Name of the search function
}

/**
 * Mongoose plugin for adding `paginate` and `search` functionality.
 *
 * @param schema - The Mongoose schema to enhance.
 * @param options - Configuration options for the plugin.
 */
export default function paginatePlugin(schema: Schema, options?: PaginatePluginOptions): void {
  /**
   * `paginate` function for querying paginated results.
   *
   * @param params - Query parameters for the pagination.
   * @returns The paginated results.
   */
  const findFn = async function(this: any, params: FindParams): Promise<any> {
    if (!this.collection) {
      throw new Error('collection property not found');
    }

    params = _.extend({}, params);
    return find(this.collection, params);
  };

  /**
   * `search` function for performing a search query.
   *
   * @param searchString - The string to search for.
   * @param params - Additional query parameters.
   * @returns The search results.
   */
  const searchFn = async function(
    this: any,
    searchString: string,
    params: SearchParams
  ): Promise<any> {
    if (!this.collection) {
      throw new Error('collection property not found');
    }

    params = _.extend({}, params);
    return search(this.collection, searchString, params);
  };

  // Attach the `paginate` function to the schema statics
  if (options?.name) {
    schema.statics[options.name] = findFn;
  } else {
    schema.statics.paginate = findFn;
  }

  // Attach the `search` function to the schema statics
  if (options?.searchFnName) {
    schema.statics[options.searchFnName] = searchFn;
  } else {
    schema.statics.search = searchFn;
  }
}
