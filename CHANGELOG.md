### [9.1.1](https://github.com/mixmaxhq/mongo-cursor-pagination/compare/v9.1.0...v9.1.1) (2025-10-31)


### Bug Fixes

* pagination error when paginatedField is not _id ([b9c6dca](https://github.com/mixmaxhq/mongo-cursor-pagination/commit/b9c6dcac9683f4433ef808d02c01d110737f0349))

## [9.1.0](https://github.com/mixmaxhq/mongo-cursor-pagination/compare/v9.0.1...v9.1.0) (2025-07-04)


### Features

* unit tests ([b2cbc8f](https://github.com/mixmaxhq/mongo-cursor-pagination/commit/b2cbc8fea958a5bcd9ecffba5b4d10cf808bd4c5))


### Bug Fixes

* encodePaginationTokens to encode plain objects ([b6005bb](https://github.com/mixmaxhq/mongo-cursor-pagination/commit/b6005bbe929ce09b0e088839d93b9a4f43fe07a7))

### [9.0.1](https://github.com/mixmaxhq/mongo-cursor-pagination/compare/v9.0.0...v9.0.1) (2025-04-01)


### Bug Fixes

* lib entry point ([274a7c9](https://github.com/mixmaxhq/mongo-cursor-pagination/commit/274a7c98aca8c156f5aa968c733df3fb42bdb4e7))

## [9.0.0](https://github.com/mixmaxhq/mongo-cursor-pagination/compare/v8.1.3...v9.0.0) (2025-04-01)


### ⚠ BREAKING CHANGES

* Updated to MongoDB driver v6 which requires:
- BSON types must be from version 6.x
- Node.js version compatible with MongoDB 6.x
- Updated connection patterns and BSON handling
- Removed support for deprecated methods

Signed-off-by: Alejandro Dominguez <adborroto90@gmail.com>
* 
* support mongo v6 and update mongoist

### Features

* enhance  documentation ([e98640e](https://github.com/mixmaxhq/mongo-cursor-pagination/commit/e98640e60fdb1db693ed3e0a3b483f48ec31ec57))
* migrate to ts ([1f8f10f](https://github.com/mixmaxhq/mongo-cursor-pagination/commit/1f8f10f37a0b9a43504abce33a12861f1a6dafd3))
* support mongo v6 and update mongoist ([5017252](https://github.com/mixmaxhq/mongo-cursor-pagination/commit/501725255b9d557c369b0d7bb1d8c831e6e09b0a))
* typescript convertion ([54a54b7](https://github.com/mixmaxhq/mongo-cursor-pagination/commit/54a54b7e8d6915b5d7dd5251c7bcf5326ce083c9))
* update deps and support mongo v7 ([42aa306](https://github.com/mixmaxhq/mongo-cursor-pagination/commit/42aa30689ac4add3edcf455f84de8da2de2e092c))
* **deps:** bump mongoist & mongo memory server to use version 5.0.18 ([f2b2343](https://github.com/mixmaxhq/mongo-cursor-pagination/commit/f2b23432893e995c8b6f816ad0543aee6f160bf8))
* **mongodb:** add support to native mongodb 3+ ([9c64b88](https://github.com/mixmaxhq/mongo-cursor-pagination/commit/9c64b8849d8b4d8eeb1755abfa06202f892c193f))


### Bug Fixes

* lint fixes ([2110240](https://github.com/mixmaxhq/mongo-cursor-pagination/commit/21102408f5aac1ed91dce405b909f212f43f4515))
* restore express dependency and improve findWithPagination function ([6e7401d](https://github.com/mixmaxhq/mongo-cursor-pagination/commit/6e7401d288519fac61fc9625c163360e7fa17865))
* update collation type and simplify utils function ([4ae455b](https://github.com/mixmaxhq/mongo-cursor-pagination/commit/4ae455b13b26985ab15156f53b4eb038cd173859))
* **deps:** update dependency node to v18 ([94c87f9](https://github.com/mixmaxhq/mongo-cursor-pagination/commit/94c87f90191b30e024f151446f6e4cf840c19405))

### [8.1.3](https://github.com/mixmaxhq/mongo-cursor-pagination/compare/v8.1.2...v8.1.3) (2023-02-14)


### Bug Fixes

* bump mongodb-memory-server dependency ([0bb0e3d](https://github.com/mixmaxhq/mongo-cursor-pagination/commit/0bb0e3d5624cdc2a4420f885a00538a88ca86635))
* regenerate package-lock.json ([659ec34](https://github.com/mixmaxhq/mongo-cursor-pagination/commit/659ec34f4c9f2f58b8024f8507d7cf73f06a8854))

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
