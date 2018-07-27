## Changelog

* 7.1.0 Add support for `aggregate`.
	
* 7.0.1 Update base64-url to fix security issue (https://github.com/mixmaxhq/mongo-cursor-pagination/pull/41 - thanks @pwiebe).

* 7.0.0 Add findWithReq overrideFields support. Breaking: now throws errors on unusable `fields`/`overrideFields`, so check your inputs. Also changes our intersection mechanism, so it _could_ cause backwards-incompatible changes to fields resolution. If causes unexpected backwards-incompatible changes, please file an issue!

* 6.3.0 Can be used as a Mongoose plugin

* 6.2.0 Added support for 'after' and 'before' parameters - thanks @lirbank

* 6.1.0 Added support for native mongodb driver (https://github.com/mixmaxhq/mongo-cursor-pagination/pull/24 - thanks @lirbank)

* 6.0.1 Fix issue where calling `find` with a paginated field that has dot notation e.g. `start.dateTime` produces an invalid `next` token.

* 6.0.0 Breaking API change: `mongo-cursor-pagination` requires a Promise enabled mongodb instance from `mongoist` and returns Promises from `find`, `findWithReq`, and `search` rather than handling callbacks. *Note: Although the library now uses `async/await`, it is still useable in node >= 6.9.0.*

* 5.0.0 Now `50` results are returned by default, and up to `300` results can be returned if the `limit` parameter is used. These can be overridden by setting `mongoPaging.config.DEFAULT_LIMIT` and `mongoPaging.config.MAX_LIMIT` respectively.

* 4.1.1 Fixed bug that would overwrite `$or` in queries passed in.

* 4.1.0 Adds `sortAscending` option to sort by the `paginatedField` ascending. Defaults to false (existing behavior).

* 4.0.0 Breaking API change: `next` and `previous` attributes are now always returned with every response (in case the client wants to poll for new changes). New attributes `hasPrevious` and `hasNext` should now be used know if there are more results in the previous or next page. Before the change, `next` and `previously` could not be replied upon to know if there were more pages.

* 3.1.1 Don't use `let` for backwards compatibility.

* 3.1.0 `findInReq()` now accepts dot notation for fields. So you can pass `?fields=users.userId` to only turn the `userId` property for `users` in the response.

* 3.0.1 Fixed bug where the \_id field was always returned when a paginatedField was used.

* 3.0.0 Breaking API change: `find()` no longer accepts a string for `limit`. Added `findWithReq`.

* 2.0.0 Changed API to so you now set global config on the config object instead of the root export itself (e.g. `require('mongo-cursor-pagination').config.MAX_LIMIT = 100`). The default `MAX_LIMIT` is now a more reasonable 25 instead of 100. Added `search()`. Fixed edge case where pages will be incorrect if paginatedField has duplicate values.

* 1.1.0 Add `MAX_LIMIT` global setting to clamp

* 1.0.0 Initial release
