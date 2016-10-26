# mongo-cursor-pagination

This module aids in implementing "cursor-based" pagination using Mongo range queries.

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

Call `find()` with the following parameters:

```
   @param {MongoCollection} collection A collection object returned from the MongoDB library's
      `db.collection(<collectionName>)` method.
   @param {Object} params
      -query {Object} The mongo query to pass to Mongo.
      -limit {Number} The page size. Must be between 1 and 100 (though can be overridden by
        setting MAX_LIMIT).
      -fields {Object} Fields to query in the Mongo object format, e.g. {_id: 1, timestamp :1}.
        The default is to query all fields.
      -paginatedField {String} The field name to query the range for. The field must be:
          1. Orderable. We must sort by this value.
          2. Indexed. For large collections, this should be indexed for query performance.
          3. Immutable. If the value changes between paged queries, it could appear twice.
        The default is to use the Mongo built-in '_id' field, which satisfies the above criteria.
        The only reason to NOT use the Mongo _id field is if you chose to implement your own ids.
      -next {String} The value to start querying the page. Default to start at the beginning of
        the collection.
      -previous {String} The value to start querying previous page. Default is to not query backwards.
   @param {Function} done Node errback style function.
```

## Example

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

### Using with Express

A popular use of this module is with Express. As a convenience for this use-case, this module returns url-safe strings for `previous` and `next`, so it's safe to return those strings directly.

```js
router.get('/myobjects', (req, res, next) => {
  mongoPaging.find(db.collection('myobjects'), {
    query: {
      userId: req.user._id
    },
    paginatedField: 'created',
    fields: {
      created: 1
    },
    limit: req.query.limit,
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

The prevent a user from querying too many documents at once, you can set property `MAX_LIMIT` on the library (e.g. `MongoPaging.MAX_LIMIT = 50;`).

## Limitiations

The presence of the `previous` and `next` keys on the result doesn't necessarily mean there are results (respectively) before or after the current page. This packages attempts to guess if there might be more results based on if the page is full with results and if `previous` and `next` were passed previously.

## Running tests

To run tests, you first must [start a Mongo server on port 27017](https://mongodb.github.io/node-mongodb-native/2.2/quick-start/) and then run `npm test`.

## Changelog

* 1.1.0 Add `lib.MAX_LIMIT` global setting to clamp

* 1.0.0 Initial release

## Future enhancements

* Have the `paginatedField` take an array of fields, so if the first field has duplicate values for some documents (e.g. multiple docs having the same `timestamp`), then it can use the second field as a secondary sort. Or perhaps it could just always secondarily sort on the _id, since in Mongo it must always be unique.
