### [8.1.2](https://github.com/mixmaxhq/mongo-cursor-pagination/compare/v8.1.1...v8.1.2) (2022-08-26)


### Bug Fixes

* use the transpiled version in node 12 ([a705377](https://github.com/mixmaxhq/mongo-cursor-pagination/commit/a705377f0a191dd2f27482a8cd09f46ce5825829))

### [8.1.1](https://github.com/mixmaxhq/mongo-cursor-pagination/compare/v8.1.0...v8.1.1) (2022-08-26)


### Bug Fixes

* properly page through undefs and nulls ([0eb28e7](https://github.com/mixmaxhq/mongo-cursor-pagination/commit/0eb28e7f573511ef7fc8790e9c0fc84e5a997cef))

## [8.1.0](https://github.com/mixmaxhq/mongo-cursor-pagination/compare/v8.0.1...v8.1.0) (2022-08-25)


### Features

* update babel to v7 ([6a86084](https://github.com/mixmaxhq/mongo-cursor-pagination/commit/6a86084253a5b950e2549df3cb537e8c5eaef7c5))

### [8.0.1](https://github.com/mixmaxhq/mongo-cursor-pagination/compare/v8.0.0...v8.0.1) (2022-08-24)


### Bug Fixes

* remove uses of the spread operator ([7e8a8c9](https://github.com/mixmaxhq/mongo-cursor-pagination/commit/7e8a8c948a501e4a7aaff0896ac558ffe73971de))

## [8.0.0](https://github.com/mixmaxhq/mongo-cursor-pagination/compare/v7.8.0...v8.0.0) (2022-08-24)


### ⚠ BREAKING CHANGES

* functional fixes and possible performance changes in `aggregate`.

### Features

* force a major release ([9c73e07](https://github.com/mixmaxhq/mongo-cursor-pagination/commit/9c73e07f71176433e0ca3279996b3b9d5e39a175))

## [7.8.0](https://github.com/mixmaxhq/mongo-cursor-pagination/compare/v7.7.0...v7.8.0) (2022-08-23)


### Features

* add a `sortCaseInsensitive` option to `find` and `aggregate` ([#323](https://github.com/mixmaxhq/mongo-cursor-pagination/issues/323)) ([f4543f6](https://github.com/mixmaxhq/mongo-cursor-pagination/commit/f4543f643bac890c627d538e6200c5f5a1d45ebc))


### Bug Fixes

* improve documentation and skip commit ([e33a493](https://github.com/mixmaxhq/mongo-cursor-pagination/commit/e33a493f98712dbbdac2ea3ed6a9a5c731dea448))

## [7.7.0](https://github.com/mixmaxhq/mongo-cursor-pagination/compare/v7.6.1...v7.7.0) (2022-08-16)


### Features

* allow collation as arg on find and aggregate ([cdfcfcb](https://github.com/mixmaxhq/mongo-cursor-pagination/commit/cdfcfcbf355f177d0589341f603b0458e4fc5c64))
* turn global collation off for single query ([c2ff6da](https://github.com/mixmaxhq/mongo-cursor-pagination/commit/c2ff6dae5824820414d5286f91d0cd7eedf0ba90))


### Bug Fixes

* skip commit with wrong scope ([#322](https://github.com/mixmaxhq/mongo-cursor-pagination/issues/322)) ([e2729ac](https://github.com/mixmaxhq/mongo-cursor-pagination/commit/e2729ac584a483f28e1275f70eb7ebd8ec44556b))

### [7.6.1](https://github.com/mixmaxhq/mongo-cursor-pagination/compare/v7.6.0...v7.6.1) (2021-11-18)


### Bug Fixes

* return _id when paginatedField is not set ([1a056d7](https://github.com/mixmaxhq/mongo-cursor-pagination/commit/1a056d7ed291760c0734a22375d8c049b14b4aaf)), closes [#309](https://github.com/mixmaxhq/mongo-cursor-pagination/issues/309)

## [7.6.0](https://github.com/mixmaxhq/mongo-cursor-pagination/compare/v7.5.0...v7.6.0) (2021-08-26)


### Features

* add support for aggregation `hint`s ([b90acd4](https://github.com/mixmaxhq/mongo-cursor-pagination/commit/b90acd46c0d70c664ef5270e64a584f124558264))

## [7.5.0](https://github.com/mixmaxhq/mongo-cursor-pagination/compare/v7.4.0...v7.5.0) (2021-08-26)


### Features

* extract/expose a function to encode pagination tokens ([04dc7fa](https://github.com/mixmaxhq/mongo-cursor-pagination/commit/04dc7fafc0038393302442df8b472b1ad74b5d28))


### Bug Fixes

* only export the function we need ([8f80382](https://github.com/mixmaxhq/mongo-cursor-pagination/commit/8f8038275607f03b67966d0d116dab8b5c6ee9fa))

## [7.4.0](https://github.com/mixmaxhq/mongo-cursor-pagination/compare/v7.3.1...v7.4.0) (2021-03-08)


### Features

* **mongoose-plugin:** add search function ([0efd73c](https://github.com/mixmaxhq/mongo-cursor-pagination/commit/0efd73c9a5e53887226a4a1d2b61605a0e168514))


### Bug Fixes

* skip bad commit message ([4c85357](https://github.com/mixmaxhq/mongo-cursor-pagination/commit/4c85357f1079c6f73877ba6775b2eb6ad962c422))

### [7.3.1](https://github.com/mixmaxhq/mongo-cursor-pagination/compare/v7.3.0...v7.3.1) (2020-08-10)


### Bug Fixes

* **bson:** fixes regression where string _ids were no longer supported ([1487195](https://github.com/mixmaxhq/mongo-cursor-pagination/commit/1487195444fb1b6f151014522e498000d1dd452d))

## [7.3.0](https://github.com/mixmaxhq/mongo-cursor-pagination/compare/v7.2.1...v7.3.0) (2020-05-06)


### Features

* **find:** add optional hint parameter for the cursor ([17616da](https://github.com/mixmaxhq/mongo-cursor-pagination/commit/17616da43641ff2d455e70d96368e839afb216ae))

### [7.2.1](https://github.com/mixmaxhq/mongo-cursor-pagination/compare/v7.2.0...v7.2.1) (2020-05-06)


### Bug Fixes

* apply no-var rule changes ([8cf0620](https://github.com/mixmaxhq/mongo-cursor-pagination/commit/8cf0620b023ac460a62788b9d11763211d5a5f88))
* comply with new eslint rules ([e5851bd](https://github.com/mixmaxhq/mongo-cursor-pagination/commit/e5851bde1a86ab322aa6eac4c56995d98f80e74b))
* eslint cleanup ([3c3c913](https://github.com/mixmaxhq/mongo-cursor-pagination/commit/3c3c91311cab97d51896f16c8463d73bdb7d9225))

## Changelog

* 7.2.0 Add support for `COLLATION` configuration parameter.

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
