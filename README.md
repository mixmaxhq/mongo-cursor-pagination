# mongo-cursor-pagination
[![Build Status](https://travis-ci.org/mixmaxhq/mongo-cursor-pagination.svg?branch=master)](https://travis-ci.org/mixmaxhq/mongo-cursor-pagination)

This module aids in implementing "cursor-based" pagination using Mongo range queries or relevancy-based search results. __This module is currently used in production for the [Mixmax API](https://developer.mixmax.com) to return millions of results a day__.

### New
 * [Now Supports Mongoose](https://github.com/mixmaxhq/mongo-cursor-pagination#with-mongoose)

## Background

See this [blog post](https://mixmax.com/blog/api-paging-built-the-right-way) for background on why this library was built.

API Pagination is typically implemented one of two different ways:

1. Offset-based paging. This is traditional paging where `skip` and `limit` parameters are passed on the url (or some variation such as `page_num` and `count`). The API would return the results and some indication of whether there is a next page, such as `has_more` on the response. An issue with this approach is that it assumes a static data set; if collection changes while querying, then results in pages will shift and the response will be wrong.

2. Cursor-based paging. An improved way of paging where an API passes back a "cursor" (an opaque string) to tell the caller where to query the next or previous pages. The cursor is usually passed using query parameters `next` and `previous`. It's implementation is typically more performant that skip/limit because it can jump to any page without traversing all the records. It also handles records being added or removed because it doesn't use fixed offsets.

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
      or the mongoist package's `db.collection(<collectionName>)` method.
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
          4. Complete. A value must exist for all documents.
        The default is to use the Mongo built-in '_id' field, which satisfies the above criteria.
        The only reason to NOT use the Mongo _id field is if you chose to implement your own ids.
      -sortAscending {Boolean} True to sort using paginatedField ascending (default is false - descending).
      -next {String} The value to start querying the page.
      -previous {String} The value to start querying previous page.
   @param {Function} done Node errback style function.
```

Example:

```js
const mongoist = require('mongoist');
const MongoPaging = require('mongo-cursor-pagination');

const db = mongoist('mongodb://localhost:27017/mydb');

async function findExample() {
  await db.collection('myobjects').insertMany([{
    counter: 1
  }, {
    counter: 2
  }, {
    counter: 3
  }, {
    counter: 4
  }]);

  // Query the first page.
  let result = await MongoPaging.find(db.collection('myobjects'), {
    limit: 2
  });
  console.log(result);

  // Query next page.
  result = MongoPaging.find(db.collection('myobjects'), {
    limit: 2,
    next: result.next // This queries the next page
  });
  console.log(result);
}

findExample().catch(console.log);
```

Output:

```sh
page 1 { results:
   [ { _id: 580fd16aca2a6b271562d8bb, counter: 4 },
     { _id: 580fd16aca2a6b271562d8ba, counter: 3 } ],
  next: 'eyIkb2lkIjoiNTgwZmQxNmFjYTJhNmIyNzE1NjJkOGJhIn0',
  hasNext: true }
page 2 { results:
   [ { _id: 580fd16aca2a6b271562d8b9, counter: 2 },
     { _id: 580fd16aca2a6b271562d8b8, counter: 1 } ],
  previous: 'eyIkb2lkIjoiNTgwZmQxNmFjYTJhNmIyNzE1NjJkOGI5In0',
  next: 'eyIkb2lkIjoiNTgwZmQxNmFjYTJhNmIyNzE1NjJkOGI4In0',
  hasNext: false }
```

## With Mongoose

Initialize Your Schema

```js
const MongoPaging = require('mongo-cursor-pagination');
const mongoose = require('mongoose');
const counterSchema = new mongoose.Schema({ counter: Number });
```

Plug the `mongoosePlugin`.

```js
// this will add paginate function.
counterSchema.plugin(MongoPaging.mongoosePlugin);

const counter = mongoose.model('counter',
counterSchema);

// default function is "paginate"
counter.paginate({ limit : 10 })
.then((result) => {
  console.log(result);
});


```

for paginate params [refer the find section](https://github.com/mixmaxhq/mongo-cursor-pagination#find)

```js
const MongoPaging = require('mongo-cursor-pagination');
const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({ counter: Number });

// give custom function name

counterSchema.plugin(MongoPaging.mongoosePlugin, { name: 'paginateFN' });

const counter = mongoose.model('counter',
counterSchema);

// now you can call the custom named function

counter.paginateFN(params)
.then(....)
.catch(....);

```


### search()

Search uses Mongo's [text search](https://docs.mongodb.com/v3.2/text-search/) feature and will return paged results ordered by search relevancy. As such, and unlike `find()`, it does not take a `paginatedField` parameter.

```
   Performs a search query on a Mongo collection and pages the results. This is different from
   find() in that the results are ordered by their relevancy, and as such, it does not take
   a paginatedField parameter. Note that this is less performant than find() because it must
   perform the full search on each call to this function. Also note that results might change

    @param {MongoCollection} collection A collection object returned from the MongoDB library's
       or the mongoist package's `db.collection(<collectionName>)` method. This MUST have a Mongo
       $text index on it.
      See https://docs.mongodb.com/manual/core/index-text/.
   @param {String} searchString String to search on.
   @param {Object} params
      -query {Object} The find query.
      -limit {Number} The page size. Must be between 1 and `config.MAX_LIMIT`.
      -fields {Object} Fields to query in the Mongo object format, e.g. {title :1}.
        The default is to query ONLY _id (note this is a difference from `find()`).
      -next {String} The value to start querying the page. Defaults to start at the beginning of
        the results.
```

Example:

```js
const mongoist = require('mongoist');
const MongoPaging = require('mongo-cursor-pagination');

const db = mongoist('mongodb://localhost:27017/mydb');

async function searchExample() {
  await db.collection('myobjects').ensureIndex({
    mytext: 'text'
  });

  db.collection('myobjects').insertMany([{
    mytext: 'dogs'
  }, {
    mytext: 'dogs cats'
  }, {
    mytext: 'dogs cats pigs'
  }]);

  // Query the first page.
  let result = await MongoPaging.search(db.collection('myobjects'), 'dogs', {
    fields: {
      mytext: 1
    },
    limit: 2
  });
  console.log(result);

  // Query next page.
  result = await MongoPaging.search(db.collection('myobjects'), 'dogs', {
    limit: 2,
    next: result.next // This queries the next page
  });
  console.log(result);
}

searchExample().catch(console.log);
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
router.get('/myobjects', async (req, res, next) => {
  try {
    const result = await MongoPaging.find(db.collection('myobjects'), {
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
    }
    res.json(result);
  } catch (err) {
    next(err);
  }
});
```

Is more elegant with `findWithReq()`:

```js
router.get('/myobjects', async (req, res, next) => {
  try {
    const result = await MongoPaging.findWithReq(req, db.collection('myobjects'), {
      query: {
        userId: req.user._id
      },
      paginatedField: 'created',
      fields: {
        _id: 1,
        created: 1
      },
      limit: 25 // Upper limit
    }
    res.json(result);
  } catch (err) {
    next(err);
  }
});
```

`findWithReq()` also handles basic security such as making sure the `limit` and `fields` requested on the URL are within the allowed values you specify in `params`.

### Number of results

If the `limit` parameter isn't passed, then this library will default to returning 50 results. This can be overridden by setting `mongoPaging.config.DEFAULT_LIMIT = <new default limit>;`. Regardless of the `limit` passed in, a maximum of 300 documents will be returned. This can be overridden by setting `mongoPaging.config.MAX_LIMIT = <new max limit>;`.

### Indexes for sorting

`mongo-cursor-pagination` uses `_id` as a secondary sorting field when providing a `paginatedField` property. It is recommended that you have an index for optimal performance. Example:

```js
MongoPaging.find(db.people, {
  query: {
    name: 'John'
  },
  paginatedField: 'city'
  limit: 25,
}).then((results) => {
  // handle results.
});
```

For the above query to be optimal, you should have an index like:

```js
db.people.ensureIndex({
  name: 1,
  city: 1,
  _id: 1
});
```

## Running tests

To run tests, you first must [start a Mongo server on port 27017](https://mongodb.github.io/node-mongodb-native/2.2/quick-start/) and then run `npm test`.

## Future ideas

* Add support to `search()` to query previous pages.
