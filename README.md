# mongo-cursor-pagination

This module aids in implementing "cursor-based" pagination using Mongo range queries. See source for documentation.

## Background

API Pagination is typically implemented one of two different ways:

1. Offset-based paging. This is traditional paging where `skip` and `limit` parameters are passed on the url (or some variation such as `page_num` and `count`). The API would return the results and some indication of whether there is a next page, such as `has_more` on the response. An issue with this approach is that it assumes a static data set; if collection changes while querying, then results in pages will shift and the response will be wrong.

2. Cursor-based paging. An improved way of paging where an API passes back a "cursor" (and opaque string) to tell the call where to query the next or previous pages. The cursor is usually passed using query parameters `next` and `previous`. It's implementation is typically more performant that skip/limit because it can jump to any page without traversing all the records. It also handles records being added or removed because it doesn't use fixed offsets.

This module helps in implementing #2 - cursor based paging - by providing a method that make it easy to query within a Mongo collection. It also helps be returning a url-safe string that you can return with your HTTP response (see example below).

## Using

A contrived example:

```js
var MongoClient = require('mongodb').MongoClient;
var MongoPaging = require('mongo-cursor-pagination');

MongoClient.connect('mongodb://localhost:27017/mydb', (err, db) => {
  db.collection('myobjects').insertMany([{
    counter: 4
  }, {
    counter: 3
  }, {
    counter: 2
  }, {
    counter: 1
  });

  MongoPaging.find(db.collection('myobjects'), {
    limit: 2
  }, function(err, result) {

    // Query next page.
    MongoPaging.find(db.collection('myobjects'), {
      limit: 2,
      next: result.next // This queries the next page
    }, function(err, result) {
      console.log(result);
    });
  });
});

```

### Using with Express

A popular use of this module is with Express. The module already returns url-safe strings for its `previous` and `next` cursors, so it's safe to return directly.

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

## Running tests

To run tests, you first must [start a Mongo server](https://mongodb.github.io/node-mongodb-native/2.2/quick-start/) and then run `npm test`.

## Future enhancements

* Have the `paginatedField` take an array of fields, so if the first field has duplicate values for some documents (e.g. multiple docs having the same `timestamp`), then it can use the second field as a secondary sort. Or perhaps it could just always secondarily sort on the _id, since in Mongo it must always be unique.
