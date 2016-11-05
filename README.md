# mongo-cursor-pagination

This module aids in implementing "cursor-based" pagination using Mongo range queries or relevancy-based search results.

## Background

API Pagination is typically implemented one of two different ways:

1. Offset-based paging. This is traditional paging where `skip` and `limit` parameters are passed on the url (or some variation such as `page_num` and `count`). The API would return the results and some indication of whether there is a next page, such as `has_more` on the response. An issue with this approach is that it assumes a static data set; if collection changes while querying, then results in pages will shift and the response will be wrong.

2. Cursor-based paging. An improved way of paging where an API passes back a "cursor" (an opaque string) to tell the call where to query the next or previous pages. The cursor is usually passed using query parameters `next` and `previous`. It's implementation is typically more performant that skip/limit because it can jump to any page without traversing all the records. It also handles records being added or removed because it doesn't use fixed offsets.

This module helps in implementing #2 - cursor based paging - by providing a method that make it easy to query within a Mongo collection. It also helps by returning a url-safe string that you can return with your HTTP response (see example below).

Here are some examples of cursor-based APIs:

* [Twitter](https://dev.twitter.com/overview/api/cursoring)
* [Stripe](https://stripe.com/docs/api#pagination-starting_after)
* [Facebook](https://developers.facebook.com/docs/graph-api/using-graph-api/#cursors)

## Install

`npm install mongo-cursor-pagination --save`

## Usage

### find()

Find will return ordered and paged results based on a field (`paginatedField`) that you pass in.

Call `find()` with the following parameters:

```
   Performs a find() query on a passed-in Mongo collection, using criteria you specify. The results
   are ordered by the paginatedField.

   @param {MongoCollection} collection A collection object returned from the MongoDB library's
      `db.collection(<collectionName>)` method.
   @param {Object} params
      -query {Object} The find query.
      -limit {Number} The page size. Must be between 1 and `config.MAX_LIMIT`.
      -fields {Object} Fields to query in the Mongo object format, e.g. {_id: 1, timestamp :1}.
        The default is to query all fields.
      -paginatedField {String} The field name to query the range for. The field must be:
          1. Orderable. We must sort by this value. If duplicate values for paginatedField field
            exist, the results will be secondarily ordered by the _id.
          2. Indexed. For large collections, this should be indexed for query performance.
          3. Immutable. If the value changes between paged queries, it could appear twice.
        The default is to use the Mongo built-in '_id' field, which satisfies the above criteria.
        The only reason to NOT use the Mongo _id field is if you chose to implement your own ids.
      -next {String} The value to start querying the page.
      -previous {String} The value to start querying previous page.
   @param {Function} done Node errback style function.
```

Example:

```js
var MongoClient = require('mongodb').MongoClient;
var MongoPaging = require('mongo-cursor-pagination');

MongoClient.connect('mongodb://localhost:27017/mydb', (err, db) => {
  db.collection('myobjects').insertMany([{
    counter: 1
  }, {
    counter: 2
  }, {
    counter: 3
  }, {
    counter: 4
  }], (err) => {

    // Query the first page.
    MongoPaging.find(db.collection('myobjects'), {
      limit: 2
    }, (err, result) => {
      console.log(result);

      // Query next page.
      MongoPaging.find(db.collection('myobjects'), {
        limit: 2,
        next: result.next // This queries the next page
      }, (err, result) => {
        console.log(result);
      });

    });
  });
});
```

Output:

```sh
page 1 { results:
   [ { _id: 580fd16aca2a6b271562d8bb, counter: 4 },
     { _id: 580fd16aca2a6b271562d8ba, counter: 3 } ],
  next: 'eyIkb2lkIjoiNTgwZmQxNmFjYTJhNmIyNzE1NjJkOGJhIn0' }
page 2 { results:
   [ { _id: 580fd16aca2a6b271562d8b9, counter: 2 },
     { _id: 580fd16aca2a6b271562d8b8, counter: 1 } ],
  previous: 'eyIkb2lkIjoiNTgwZmQxNmFjYTJhNmIyNzE1NjJkOGI5In0',
  next: 'eyIkb2lkIjoiNTgwZmQxNmFjYTJhNmIyNzE1NjJkOGI4In0' }
```

### search()

Search uses Mongo's [text search](https://docs.mongodb.com/v3.2/text-search/) feature and will return paged results ordered by search relevancy. As such, and unlike `find()`, it does not take a `paginatedField` parameter.

```
   Performs a search query on a Mongo collection and pages the results. This is different from
   find() in that the results are ordered by their relevancy, and as such, it does not take
   a paginatedField parameter. Note that this is less performant than find() because it must
   perform the full search on each call to this function. Also note that results might change

   @param {MongoCollection} collection A collection object returned from the MongoDB library's
      `db.collection(<collectionName>)` method. This MUST have a Mongo $text index on it.
      See https://docs.mongodb.com/manual/core/index-text/.
   @param {String} searchString String to search on.
   @param {Object} params
      -query {Object} The find query.
      -limit {Number} The page size. Must be between 1 and `config.MAX_LIMIT`.
      -fields {Object} Fields to query in the Mongo object format, e.g. {title :1}.
        The default is to query ONLY _id (note this is a difference from `find()`).
      -next {String} The value to start querying the page. Defaults to start at the beginning of
        the results.
   @param {Function} done Node errback style function.
```

Example:

```js
var MongoClient = require('mongodb').MongoClient;
var MongoPaging = require('mongo-cursor-pagination');

MongoClient.connect('mongodb://localhost:27017/mydb', (err, db) => {
  db.collection('myobjects').ensureIndex({
    mytext: 'text'
  }, (err) => {

    db.collection('myobjects').insertMany([{
      mytext: 'dogs'
    }, {
      mytext: 'dogs cats'
    }, {
      mytext: 'dogs cats pigs'
    }], (err) => {

      // Query the first page.
      MongoPaging.search(db.collection('myobjects'), 'dogs', {
        fields: {
          mytext: 1
        },
        limit: 2
      }, (err, result) => {
        console.log(result);

        // Query next page.
        MongoPaging.search(db.collection('myobjects'), 'dogs', {
          limit: 2,
          next: result.next // This queries the next page
        }, (err, result) => {
          console.log(result);
        });

      });
    });
  });
});
```

Output:

```sh
page 1  { results:
   [ { _id: 581668318c11596af22a62de, mytext: 'dogs', score: 1 },
     { _id: 581668318c11596af22a62df, mytext: 'dogs cats', score: 0.75 } ],
  next: 'WzAuNzUseyIkb2lkIjoiNTgxNjY4MzE4YzExNTk2YWYyMmE2MmRmIn1d' }
page 2 { results:
   [ { _id: 581668318c11596af22a62e0, score: 0.6666666666666666 } ] }
```

### Use with ExpressJS

A popular use of this module is with Express to implement a basic API. As a convenience for this use-case, this library exposes a `findWithReq` function that takes the request object from your Express middleware and returns results:

So this code using `find()`:

```js
router.get('/myobjects', (req, res, next) => {
  MongoPaging.find(db.collection('myobjects'), {
    query: {
      userId: req.user._id
    },
    paginatedField: 'created',
    fields: { // Also need to read req.query.fields to use to filter these fields
      _id: 1,
      created: 1
    },
    limit: req.query.limit, // Also need to cap this to 25
    next: req.query.next,
    previous: req.query.previous,
  }, function(err, result) {
    if (err) {
      next(err);
    } else {
      res.json(result);
    }
  });
});
```

Is more elegant with `findWithReq()`:

```js
router.get('/myobjects', (req, res, next) => {
  MongoPaging.findWithReq(req, db.collection('myobjects'), {
    query: {
      userId: req.user._id
    },
    paginatedField: 'created',
    fields: {
      _id: 1,
      created: 1
    },
    limit: 25 // Upper limit
  }, function(err, result) {
    if (err) {
      next(err);
    } else {
      res.json(result);
    }
  });
});
```

`findWithReq()` also handles basic security such as making sure the `limit` and `fields` requested on the URL are within the allowed values you specify in `params`.

### Capping the number of results

The prevent a user from querying too many documents at once, you can set property `MAX_LIMIT` on the library (e.g. `mongoPaging.config.MAX_LIMIT = 50;`).

## Limitiations

The presence of the `previous` and `next` keys on the result doesn't necessarily mean there are results before or after the current page. This packages attempts to guess if there might be more results based on if the page is full with results and if `previous` and `next` were passed previously.

## Running tests

To run tests, you first must [start a Mongo server on port 27017](https://mongodb.github.io/node-mongodb-native/2.2/quick-start/) and then run `npm test`.

## Changelog

* 3.1.0 `findInReq()` now accepts dot notation for fields. So you can pass `?fields=users.userId` to only turn the `userId` property for `users` in the response.

* 3.0.1 Fixed bug where the _id field was always returned when a paginatedField was used.

* 3.0.0 Breaking API change: `find()` no longer accepts a string for `limit`. Added `findWithReq`.

* 2.0.0 Changed API to so you now set global config on the config object instead of the root export itself (e.g. `require('mongo-cursor-pagination').config.MAX_LIMIT = 100`). The default `MAX_LIMIT` is now a more reasonable 25 instead of 100. Added `search()`. Fixed edge case where pages will be incorrect if paginatedField has duplicate values.

* 1.1.0 Add `MAX_LIMIT` global setting to clamp

* 1.0.0 Initial release

## Future ideas

* Add support to `search()` to query previous pages.
