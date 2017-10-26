const { describe } = require('ava-spec');
const test = require('ava');
const paging = require('../');
const dbUtils = require('./support/db');

let mongod;
test.before('start mongo server', async () => {
  mongod = dbUtils.start();
  const db = await dbUtils.db(mongod);

  // Set up collections once for testing later.
  await Promise.all([
    db.collection('test_paging').insert([{
      counter: 1
    }, {
      counter: 2
    }, {
      counter: 3
    }, {
      counter: 4,
      color: 'blue'
    }, {
      counter: 5,
      color: 'blue'
    }, {
      counter: 6,
      color: 'blue'
    }, {
      counter: 7,
      color: 'blue'
    }, {
      counter: 8,
      color: 'blue'
    }]),
    db.collection('test_duplicate_custom_fields').insert([{
      _id: 6,
      counter: 6,
      timestamp: 1477347800603
    }, {
      _id: 5,
      counter: 5,
      timestamp: 1477347800603
    }, {
      _id: 4,
      counter: 4,
      timestamp: 1477347800603
    }, {
      _id: 3,
      counter: 3,
      timestamp: 1477347772077
    }, {
      _id: 2,
      counter: 2,
      timestamp: 1477347772077
    }, {
      _id: 1,
      counter: 1,
      timestamp: 1477347772077
    }]),
    db.collection('test_paging_custom_fields').insert([{
      counter: 6,
      timestamp: 1477347800603
    }, {
      counter: 5,
      timestamp: 1477347792380
    }, {
      counter: 4,
      timestamp: 1477347784766
    }, {
      counter: 3,
      timestamp: 1477347772077
    }, {
      counter: 2,
      timestamp: 1477347763813
    }, {
      counter: 1,
      timestamp: 1477347755654
    }]),
    db.collection('test_paging_date').insert([{
      counter: 2,
      date: new Date(1477347763813)
    }, {
      counter: 3,
      date: new Date(1477347772077)
    }, {
      counter: 4,
      date: new Date(1477347784766)
    }, {
      counter: 1,
      date: new Date(1477347755654)
    }]),
    db.collection('test_paging_limits').insert([{
      counter: 6
    }, {
      counter: 5
    }, {
      counter: 4
    }, {
      counter: 3
    }, {
      counter: 2
    }, {
      counter: 1
    }])
  ]);
});

describe('find', (it) => {
  it.beforeEach(async (t) => {
    t.context.db = await dbUtils.db(mongod);
  });

  it.describe('basic usage', (it) => {
    it.describe('test with Mongo object ids', (it) => {
      it('should query first few pages', async (t) => {
        const collection = t.context.db.test_paging;
        // First page of 3
        let res = await paging.find(collection, {
          limit: 3
        });

        t.is(res.results.length, 3);
        t.is(res.results[0].counter, 8);
        t.is(res.results[1].counter, 7);
        t.is(res.results[2].counter, 6);
        t.false(res.hasPrevious);
        t.true(res.hasNext);

        // Go forward 3
        res = await paging.find(collection, {
          limit: 3,
          next: res.next
        });

        t.is(res.results.length, 3);
        t.is(res.results[0].counter, 5);
        t.is(res.results[1].counter, 4);
        t.is(res.results[2].counter, 3);
        t.true(res.hasPrevious);
        t.true(res.hasNext);

        // Go forward another 3
        res = await paging.find(collection, {
          limit: 3,
          next: res.next
        });

        t.is(res.results.length, 2);
        t.is(res.results[0].counter, 2);
        t.is(res.results[1].counter, 1);
        t.true(res.hasPrevious);
        t.false(res.hasNext);

        // Now back up 3
        res = await paging.find(collection, {
          limit: 3,
          previous: res.previous
        });

        t.is(res.results.length, 3);
        t.is(res.results[0].counter, 5);
        t.is(res.results[1].counter, 4);
        t.is(res.results[2].counter, 3);
        t.true(res.hasPrevious);
        t.true(res.hasNext);

        // Now back up 3 more
        res = await paging.find(collection, {
          limit: 3,
          previous: res.previous
        });

        t.is(res.results.length, 3);
        t.is(res.results[0].counter, 8);
        t.is(res.results[1].counter, 7);
        t.is(res.results[2].counter, 6);
        t.false(res.hasPrevious);
        t.true(res.hasNext);
      });

      it('should handle hitting the end', async (t) => {
        const collection = t.context.db.test_paging;
        // First page of 2
        var res = await paging.find(collection, {
          limit: 4
        });

        t.is(res.results.length, 4);
        t.is(res.results[0].counter, 8);
        t.is(res.results[1].counter, 7);
        t.is(res.results[2].counter, 6);
        t.is(res.results[3].counter, 5);
        t.false(res.hasPrevious);
        t.true(res.hasNext);

        // Go forward 2
        res = await paging.find(collection, {
          limit: 3,
          next: res.next
        });

        t.is(res.results.length, 3);
        t.is(res.results[0].counter, 4);
        t.is(res.results[1].counter, 3);
        t.is(res.results[2].counter, 2);
        t.true(res.hasPrevious);
        t.true(res.hasNext);

        // Go forward another 1, results should be empty.
        res = await paging.find(collection, {
          limit: 2,
          next: res.next
        });

        t.is(res.results.length, 1);
        t.is(res.results[0].counter, 1);
        t.true(res.hasPrevious);
        t.false(res.hasNext);
      });

      it('should handle hitting the beginning', async (t) => {
        const collection = t.context.db.test_paging;
        // First page of 2
        var res = await paging.find(collection, {
          limit: 4
        });

        t.is(res.results.length, 4);
        t.is(res.results[0].counter, 8);
        t.is(res.results[1].counter, 7);
        t.is(res.results[2].counter, 6);
        t.is(res.results[3].counter, 5);
        t.false(res.hasPrevious);
        t.true(res.hasNext);

        // Go forward 2
        res = await paging.find(collection, {
          limit: 3,
          next: res.next
        });

        t.is(res.results.length, 3);
        t.is(res.results[0].counter, 4);
        t.is(res.results[1].counter, 3);
        t.is(res.results[2].counter, 2);
        t.true(res.hasPrevious);
        t.true(res.hasNext);

        // Go back to beginning.
        res = await paging.find(collection, {
          limit: 100,
          previous: res.previous
        });

        t.is(res.results.length, 4);
        t.is(res.results[0].counter, 8);
        t.is(res.results[1].counter, 7);
        t.is(res.results[2].counter, 6);
        t.is(res.results[3].counter, 5);
        t.false(res.hasPrevious);
        t.true(res.hasNext);
      });

      it('should use passed-in criteria', async (t) => {
        const collection = t.context.db.test_paging;
        // First page.
        var res = await paging.find(collection, {
          query: {
            color: 'blue'
          }
        });

        t.is(res.results.length, 5);
        t.is(res.results[0].color, 'blue');
        t.false(res.hasNext);
        t.false(res.hasPrevious);
      });

      it('should use the "fields" parameter', async (t) => {
        const collection = t.context.db.test_paging;
        // First page.
        var res = await paging.find(collection, {
          query: {
            color: 'blue'
          },
          fields: {
            _id: 1
          }
        });

        t.is(res.results.length, 5);
        t.falsy(res.results[0].color);
      });

      it('should not return "next" or "previous" if there are no results', async (t) => {
        const collection = t.context.db.test_paging;
        // First page.
        var res = await paging.find(collection, {
          limit: 3,
          query: {
            nonexistantfield: true
          }
        });

        t.is(res.results.length, 0);
        t.false(res.hasNext);
        t.false(res.hasPrevious);
      });

      it('should respect sortAscending option', async (t) => {
        const collection = t.context.db.test_paging;
        // First page of 3
        var res = await paging.find(collection, {
          limit: 3,
          sortAscending: true
        });

        t.is(res.results.length, 3);
        t.is(res.results[0].counter, 1);
        t.is(res.results[1].counter, 2);
        t.is(res.results[2].counter, 3);
        t.false(res.hasPrevious);
        t.true(res.hasNext);

        // Go forward 3
        res = await paging.find(collection, {
          limit: 3,
          next: res.next,
          sortAscending: true
        });

        t.is(res.results.length, 3);
        t.is(res.results[0].counter, 4);
        t.is(res.results[1].counter, 5);
        t.is(res.results[2].counter, 6);
        t.true(res.hasPrevious);
        t.true(res.hasNext);

        // Go forward another 3
        res = await paging.find(collection, {
          limit: 3,
          next: res.next,
          sortAscending: true
        });

        t.is(res.results.length, 2);
        t.is(res.results[0].counter, 7);
        t.is(res.results[1].counter, 8);
        t.true(res.hasPrevious);
        t.false(res.hasNext);

        // // Now back up 3
        res = await paging.find(collection, {
          limit: 3,
          previous: res.previous,
          sortAscending: true
        });

        t.is(res.results.length, 3);
        t.is(res.results[0].counter, 4);
        t.is(res.results[1].counter, 5);
        t.is(res.results[2].counter, 6);
        t.true(res.hasPrevious);
        t.true(res.hasNext);

        // Now back up 3 more
        res = await paging.find(collection, {
          limit: 3,
          previous: res.previous,
          sortAscending: true
        });

        t.is(res.results.length, 3);
        t.is(res.results[0].counter, 1);
        t.is(res.results[1].counter, 2);
        t.is(res.results[2].counter, 3);
        t.false(res.hasPrevious);
        t.true(res.hasNext);
      });

    });
  });

  it.describe('test with custom fields', (it) => {
    it('should query first few pages', async (t) => {
      const collection = t.context.db.test_paging_custom_fields;
      // First page of 2
      var res = await paging.find(collection, {
        limit: 2,
        paginatedField: 'timestamp'
      });

      t.is(res.results.length, 2);
      t.is(res.results[0].counter, 6);
      t.is(res.results[1].counter, 5);
      t.false(res.hasPrevious);
      t.true(res.hasNext);

      // Go forward 2
      res = await paging.find(collection, {
        limit: 2,
        paginatedField: 'timestamp',
        next: res.next
      });

      t.is(res.results.length, 2);
      t.is(res.results[0].counter, 4);
      t.is(res.results[1].counter, 3);
      t.true(res.hasPrevious);
      t.true(res.hasNext);

      // Go forward another 2
      res = await paging.find(collection, {
        limit: 2,
        paginatedField: 'timestamp',
        next: res.next
      });

      t.is(res.results.length, 2);
      t.is(res.results[0].counter, 2);
      t.is(res.results[1].counter, 1);
      t.true(res.hasPrevious);
      t.false(res.hasNext);

      // Now back up 2
      res = await paging.find(collection, {
        limit: 2,
        paginatedField: 'timestamp',
        previous: res.previous
      });

      t.is(res.results.length, 2);
      t.is(res.results[0].counter, 4);
      t.is(res.results[1].counter, 3);
      t.true(res.hasPrevious);
      t.true(res.hasNext);
    });

    it('should not include the paginatedField in the results if not desired', async (t) => {
      const collection = t.context.db.test_paging_custom_fields;
      var res = await paging.find(collection, {
        limit: 1,
        fields: {
          counter: 1
        },
        paginatedField: 'timestamp'
      });
      t.is(res.results[0].timestamp, undefined);
      t.true(res.hasNext);
    });

    it('should not overwrite $or used in a query', async (t) => {
      const collection = t.context.db.test_paging_custom_fields;
      // First page of 2
      var res = await paging.find(collection, {
        query: { $or: [{ counter: { $gt: 3 } }] },
        limit: 2,
        paginatedField: 'timestamp'
      });

      t.is(res.results.length, 2);
      t.is(res.results[0].counter, 6);
      t.is(res.results[1].counter, 5);
      t.false(res.hasPrevious);
      t.true(res.hasNext);

      // Go forward 2
      res = await paging.find(collection, {
        query: { $or: [{ counter: { $gt: 3 } }] },
        limit: 2,
        paginatedField: 'timestamp',
        next: res.next
      });

      t.is(res.results.length, 1);
      t.is(res.results[0].counter, 4);
      t.true(res.hasPrevious);
      t.false(res.hasNext);
    });
  });

  it.describe('test with duplicate values for paginated field', (it) => {
    it('should query first few pages', async (t) => {
      const collection = t.context.db.test_duplicate_custom_fields;
      // First page of 2
      var res = await paging.find(collection, {
        limit: 2,
        paginatedField: 'timestamp'
      });

      t.is(res.results.length, 2);
      t.is(res.results[0].counter, 6);
      t.is(res.results[1].counter, 5);
      t.false(res.hasPrevious);
      t.true(res.hasNext);

      // Go forward 2
      res = await paging.find(collection, {
        limit: 2,
        paginatedField: 'timestamp',
        next: res.next
      });

      t.is(res.results.length, 2);
      t.is(res.results[0].counter, 4);
      t.is(res.results[1].counter, 3);
      t.true(res.hasPrevious);
      t.true(res.hasNext);

      // Go forward another 2
      res = await paging.find(collection, {
        limit: 2,
        paginatedField: 'timestamp',
        next: res.next
      });

      t.is(res.results.length, 2);
      t.is(res.results[0].counter, 2);
      t.is(res.results[1].counter, 1);
      t.true(res.hasPrevious);
      t.false(res.hasNext);

      // Now back up 2
      res = await paging.find(collection, {
        limit: 2,
        paginatedField: 'timestamp',
        previous: res.previous
      });

      t.is(res.results.length, 2);
      t.is(res.results[0].counter, 4);
      t.is(res.results[1].counter, 3);
      t.true(res.hasPrevious);
      t.true(res.hasNext);
    });

    it('should not include fields not desired', async (t) => {
      const collection = t.context.db.test_duplicate_custom_fields;
      var res = await paging.find(collection, {
        limit: 1,
        fields: {
          counter: 1
        },
        paginatedField: 'timestamp'

      });

      t.deepEqual(res.results[0], {
        counter: 6
      });
      t.true(res.hasNext);
    });

    it('should respect sortAscending', async (t) => {
      const collection = t.context.db.test_duplicate_custom_fields;
      // First page of 2
      var res = await paging.find(collection, {
        limit: 2,
        paginatedField: 'timestamp',
        sortAscending: true
      });

      t.is(res.results.length, 2);
      t.is(res.results[0].counter, 1);
      t.is(res.results[1].counter, 2);
      t.false(res.hasPrevious);
      t.true(res.hasNext);

      // Go forward 2
      res = await paging.find(collection, {
        limit: 2,
        paginatedField: 'timestamp',
        next: res.next,
        sortAscending: true
      });

      t.is(res.results.length, 2);
      t.is(res.results[0].counter, 3);
      t.is(res.results[1].counter, 4);
      t.true(res.hasPrevious);
      t.true(res.hasNext);

      // Go forward another 2
      res = await paging.find(collection, {
        limit: 2,
        paginatedField: 'timestamp',
        next: res.next,
        sortAscending: true
      });

      t.is(res.results.length, 2);
      t.is(res.results[0].counter, 5);
      t.is(res.results[1].counter, 6);
      t.true(res.hasPrevious);
      t.false(res.hasNext);

      // Now back up 2
      res = await paging.find(collection, {
        limit: 2,
        paginatedField: 'timestamp',
        previous: res.previous,
        sortAscending: true
      });

      t.is(res.results.length, 2);
      t.is(res.results[0].counter, 3);
      t.is(res.results[1].counter, 4);
      t.true(res.hasPrevious);
      t.true(res.hasNext);
    });
  });

  it.describe('test with dates', (it) => {
    it('should query first few pages', async (t) => {
      const collection = t.context.db.test_paging_date;
      // First page of 2
      var res = await paging.find(collection, {
        limit: 2,
        paginatedField: 'date'
      });

      t.is(res.results.length, 2);
      t.is(res.results[0].counter, 4);
      t.is(res.results[1].counter, 3);
      t.false(res.hasPrevious);
      t.true(res.hasNext);

      // Go forward 2
      res = await paging.find(collection, {
        limit: 2,
        paginatedField: 'date',
        next: res.next
      });

      t.is(res.results.length, 2);
      t.is(res.results[0].counter, 2);
      t.is(res.results[1].counter, 1);
      t.true(res.hasPrevious);
      t.false(res.hasNext);
    });
  });
});

/**
 * Run tests that modify configuration constants serially before others since the limit constants
 * affect the results of other tests when run concurrently.
 */
test.serial('find limits should clamp lower limit', async (t) => {
  const collection = t.context.db.test_paging_limits;
  var res = await paging.find(collection, {
    limit: -1
  });

  t.is(res.results.length, 1);
});

test.serial('find limits should set a default limit', async (t) => {
  const collection = t.context.db.test_paging_limits;
  var originalDefaultLimit = paging.config.DEFAULT_LIMIT;
  paging.config.DEFAULT_LIMIT = 2;
  var res = await paging.find(collection, {});

  t.is(res.results.length, 2);

  paging.config.DEFAULT_LIMIT = originalDefaultLimit;
});

test.serial('find limits should allow overriding the limit', async (t) => {
  const collection = t.context.db.test_paging_limits;
  var originalDefaultLimit = paging.config.DEFAULT_LIMIT;
  paging.config.DEFAULT_LIMIT = 2;
  var res = await paging.find(collection, {
    limit: 4
  });

  t.is(res.results.length, 4);

  paging.config.DEFAULT_LIMIT = originalDefaultLimit;
});

test.serial('find limits should clamp to max limit', async (t) => {
  const collection = t.context.db.test_paging_limits;
  var originalMaxLimit = paging.config.MAX_LIMIT;
  paging.config.MAX_LIMIT = 2;
  var res = await paging.find(collection, {
    limit: 999
  });

  t.is(res.results.length, 2);

  paging.config.MAX_LIMIT = originalMaxLimit;
});
