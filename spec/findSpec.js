var paging = require('../');
var getDb = require('./support/db');
var sync = require('synchronize');
require('synchronize-bdd').replace();

describe('find', () => {
  var db;

  beforeEach(() => {
    db = getDb();
  });

  describe('basic usage', () => {
    describe('test with Mongo object ids', () => {
      beforeEach(() => {
        sync.await(db.collection('test_paging').insertMany([{
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
        }], sync.defer()));
      });

      afterEach(() => {
        sync.await(db.collection('test_paging').remove({}, sync.defer()));
      });

      it('should query first few pages', () => {
        // First page of 3
        var res = sync.await(paging.find(db.collection('test_paging'), {
          limit: 3
        }, sync.defer()));

        expect(res.results.length).toBe(3);
        expect(res.results[0].counter).toBe(8);
        expect(res.results[1].counter).toBe(7);
        expect(res.results[2].counter).toBe(6);
        expect(res.hasPrevious).toBe(false);
        expect(res.hasNext).toBe(true);

        // Go forward 3
        res = sync.await(paging.find(db.collection('test_paging'), {
          limit: 3,
          next: res.next
        }, sync.defer()));

        expect(res.results.length).toBe(3);
        expect(res.results[0].counter).toBe(5);
        expect(res.results[1].counter).toBe(4);
        expect(res.results[2].counter).toBe(3);
        expect(res.hasPrevious).toBe(true);
        expect(res.hasNext).toBe(true);

        // Go forward another 3
        res = sync.await(paging.find(db.collection('test_paging'), {
          limit: 3,
          next: res.next
        }, sync.defer()));

        expect(res.results.length).toBe(2);
        expect(res.results[0].counter).toBe(2);
        expect(res.results[1].counter).toBe(1);
        expect(res.hasPrevious).toBe(true);
        expect(res.hasNext).toBe(false);

        // Now back up 3
        res = sync.await(paging.find(db.collection('test_paging'), {
          limit: 3,
          previous: res.previous
        }, sync.defer()));

        expect(res.results.length).toBe(3);
        expect(res.results[0].counter).toBe(5);
        expect(res.results[1].counter).toBe(4);
        expect(res.results[2].counter).toBe(3);
        expect(res.hasPrevious).toBe(true);
        expect(res.hasNext).toBe(true);

        // Now back up 3 more
        res = sync.await(paging.find(db.collection('test_paging'), {
          limit: 3,
          previous: res.previous
        }, sync.defer()));

        expect(res.results.length).toBe(3);
        expect(res.results[0].counter).toBe(8);
        expect(res.results[1].counter).toBe(7);
        expect(res.results[2].counter).toBe(6);
        expect(res.hasPrevious).toBe(false);
        expect(res.hasNext).toBe(true);
      });

      it('should handle hitting the end', () => {
        // First page of 2
        var res = sync.await(paging.find(db.collection('test_paging'), {
          limit: 4
        }, sync.defer()));

        expect(res.results.length).toBe(4);
        expect(res.results[0].counter).toBe(8);
        expect(res.results[1].counter).toBe(7);
        expect(res.results[2].counter).toBe(6);
        expect(res.results[3].counter).toBe(5);
        expect(res.hasPrevious).toBe(false);
        expect(res.hasNext).toBe(true);

        // Go forward 2
        res = sync.await(paging.find(db.collection('test_paging'), {
          limit: 3,
          next: res.next
        }, sync.defer()));

        expect(res.results.length).toBe(3);
        expect(res.results[0].counter).toBe(4);
        expect(res.results[1].counter).toBe(3);
        expect(res.results[2].counter).toBe(2);
        expect(res.hasPrevious).toBe(true);
        expect(res.hasNext).toBe(true);

        // Go forward another 1, results should be empty.
        res = sync.await(paging.find(db.collection('test_paging'), {
          limit: 2,
          next: res.next
        }, sync.defer()));

        expect(res.results.length).toBe(1);
        expect(res.results[0].counter).toBe(1);
        expect(res.hasPrevious).toBe(true);
        expect(res.hasNext).toBe(false);
      });

      it('should handle hitting the beginning', () => {
        // First page of 2
        var res = sync.await(paging.find(db.collection('test_paging'), {
          limit: 4
        }, sync.defer()));

        expect(res.results.length).toBe(4);
        expect(res.results[0].counter).toBe(8);
        expect(res.results[1].counter).toBe(7);
        expect(res.results[2].counter).toBe(6);
        expect(res.results[3].counter).toBe(5);
        expect(res.hasPrevious).toBe(false);
        expect(res.hasNext).toBe(true);

        // Go forward 2
        res = sync.await(paging.find(db.collection('test_paging'), {
          limit: 3,
          next: res.next
        }, sync.defer()));

        expect(res.results.length).toBe(3);
        expect(res.results[0].counter).toBe(4);
        expect(res.results[1].counter).toBe(3);
        expect(res.results[2].counter).toBe(2);
        expect(res.hasPrevious).toBe(true);
        expect(res.hasNext).toBe(true);

        // Go back to beginning.
        res = sync.await(paging.find(db.collection('test_paging'), {
          limit: 100,
          previous: res.previous
        }, sync.defer()));

        expect(res.results.length).toBe(4);
        expect(res.results[0].counter).toBe(8);
        expect(res.results[1].counter).toBe(7);
        expect(res.results[2].counter).toBe(6);
        expect(res.results[3].counter).toBe(5);
        expect(res.hasPrevious).toBe(false);
        expect(res.hasNext).toBe(true);
      });

      it('should use passed-in criteria', () => {
        // First page.
        var res = sync.await(paging.find(db.collection('test_paging'), {
          query: {
            color: 'blue'
          }
        }, sync.defer()));

        expect(res.results.length).toBe(5);
        expect(res.results[0].color).toBe('blue');
        expect(res.hasNext).toBe(false);
        expect(res.hasPrevious).toBe(false);
      });

      it('should use the "fields" parameter', () => {
        // First page.
        var res = sync.await(paging.find(db.collection('test_paging'), {
          query: {
            color: 'blue'
          },
          fields: {
            _id: 1
          }
        }, sync.defer()));

        expect(res.results.length).toBe(5);
        expect(res.results[0].color).toBeFalsy();
      });

      it('should not return "next" or "previous" if there are no results', () => {
        // First page.
        var res = sync.await(paging.find(db.collection('test_paging'), {
          limit: 3,
          query: {
            nonexistantfield: true
          }
        }, sync.defer()));

        expect(res.results.length).toBe(0);
        expect(res.hasNext).toBe(false);
        expect(res.hasPrevious).toBe(false);
      });
    });
  });

  describe('test with custom fields', () => {
    beforeEach(() => {
      sync.await(db.collection('test_paging_custom_fields').insertMany([{
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
      }], sync.defer()));
    });

    it('should query first few pages', () => {
      // First page of 2
      var res = sync.await(paging.find(db.collection('test_paging_custom_fields'), {
        limit: 2,
        paginatedField: 'timestamp'
      }, sync.defer()));

      expect(res.results.length).toBe(2);
      expect(res.results[0].counter).toBe(6);
      expect(res.results[1].counter).toBe(5);
      expect(res.hasPrevious).toBe(false);
      expect(res.hasNext).toBe(true);

      // Go forward 2
      res = sync.await(paging.find(db.collection('test_paging_custom_fields'), {
        limit: 2,
        paginatedField: 'timestamp',
        next: res.next
      }, sync.defer()));

      expect(res.results.length).toBe(2);
      expect(res.results[0].counter).toBe(4);
      expect(res.results[1].counter).toBe(3);
      expect(res.hasPrevious).toBe(true);
      expect(res.hasNext).toBe(true);

      // Go forward another 2
      res = sync.await(paging.find(db.collection('test_paging_custom_fields'), {
        limit: 2,
        paginatedField: 'timestamp',
        next: res.next
      }, sync.defer()));

      expect(res.results.length).toBe(2);
      expect(res.results[0].counter).toBe(2);
      expect(res.results[1].counter).toBe(1);
      expect(res.hasPrevious).toBe(true);
      expect(res.hasNext).toBe(false);

      // Now back up 2
      res = sync.await(paging.find(db.collection('test_paging_custom_fields'), {
        limit: 2,
        paginatedField: 'timestamp',
        previous: res.previous
      }, sync.defer()));

      expect(res.results.length).toBe(2);
      expect(res.results[0].counter).toBe(4);
      expect(res.results[1].counter).toBe(3);
      expect(res.hasPrevious).toBe(true);
      expect(res.hasNext).toBe(true);
    });

    it('should not include the paginatedField in the results if not desired', () => {
      var res = sync.await(paging.find(db.collection('test_paging_custom_fields'), {
        limit: 1,
        fields: {
          counter: 1
        },
        paginatedField: 'timestamp'
      }, sync.defer()));
      expect(res.results[0].timestamp).toBeUndefined();
      expect(res.hasNext).toBe(true);
    });
  });

  describe('test with duplicate values for paginated field', () => {
    beforeEach(() => {
      sync.await(db.collection('test_paging_custom_fields').insertMany([{
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
      }], sync.defer()));
    });

    it('should query first few pages', () => {
      // First page of 2
      var res = sync.await(paging.find(db.collection('test_paging_custom_fields'), {
        limit: 2,
        paginatedField: 'timestamp'
      }, sync.defer()));

      expect(res.results.length).toBe(2);
      expect(res.results[0].counter).toBe(6);
      expect(res.results[1].counter).toBe(5);
      expect(res.hasPrevious).toBe(false);
      expect(res.hasNext).toBe(true);

      // Go forward 2
      res = sync.await(paging.find(db.collection('test_paging_custom_fields'), {
        limit: 2,
        paginatedField: 'timestamp',
        next: res.next
      }, sync.defer()));

      expect(res.results.length).toBe(2);
      expect(res.results[0].counter).toBe(4);
      expect(res.results[1].counter).toBe(3);
      expect(res.hasPrevious).toBe(true);
      expect(res.hasNext).toBe(true);

      // Go forward another 2
      res = sync.await(paging.find(db.collection('test_paging_custom_fields'), {
        limit: 2,
        paginatedField: 'timestamp',
        next: res.next
      }, sync.defer()));

      expect(res.results.length).toBe(2);
      expect(res.results[0].counter).toBe(2);
      expect(res.results[1].counter).toBe(1);
      expect(res.hasPrevious).toBe(true);
      expect(res.hasNext).toBe(false);

      // Now back up 2
      res = sync.await(paging.find(db.collection('test_paging_custom_fields'), {
        limit: 2,
        paginatedField: 'timestamp',
        previous: res.previous
      }, sync.defer()));

      expect(res.results.length).toBe(2);
      expect(res.results[0].counter).toBe(4);
      expect(res.results[1].counter).toBe(3);
      expect(res.hasPrevious).toBe(true);
      expect(res.hasNext).toBe(true);
    });

    it('should not include fields not desired', () => {
      var res = sync.await(paging.find(db.collection('test_paging_custom_fields'), {
        limit: 1,
        fields: {
          counter: 1
        },
        paginatedField: 'timestamp'
      }, sync.defer()));
      expect(res.results[0]).toEqual({
        counter: 6
      });
      expect(res.hasNext).toBe(true);
    });
  });

  describe('test with dates', () => {
    beforeEach(() => {
      sync.await(db.collection('test_paging_date').insertMany([{
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
      }], sync.defer()));
    });

    it('should query first few pages', () => {
      // First page of 2
      var res = sync.await(paging.find(db.collection('test_paging_date'), {
        limit: 2,
        paginatedField: 'date'
      }, sync.defer()));

      expect(res.results.length).toBe(2);
      expect(res.results[0].counter).toBe(4);
      expect(res.results[1].counter).toBe(3);
      expect(res.hasPrevious).toBe(false);
      expect(res.hasNext).toBe(true);

      // Go forward 2
      res = sync.await(paging.find(db.collection('test_paging_date'), {
        limit: 2,
        paginatedField: 'date',
        next: res.next
      }, sync.defer()));

      expect(res.results.length).toBe(2);
      expect(res.results[0].counter).toBe(2);
      expect(res.results[1].counter).toBe(1);
      expect(res.hasPrevious).toBe(true);
      expect(res.hasNext).toBe(false);
    });
  });

  describe('limits', () => {
    beforeEach(() => {
      sync.await(db.collection('test_paging_limits').insertMany([{
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
      }], sync.defer()));
    });

    it('should clamp lower limit', () => {
      var res = sync.await(paging.find(db.collection('test_paging_limits'), {
        limit: -1
      }, sync.defer()));

      expect(res.results.length).toBe(1);
    });

    it('should clamp upper limit', () => {
      var originalMaxLimit = paging.config.MAX_LIMIT;
      paging.config.MAX_LIMIT = 2;
      var res = sync.await(paging.find(db.collection('test_paging_limits'), {
        limit: 999
      }, sync.defer()));

      expect(res.results.length).toBe(2);

      paging.config.MAX_LIMIT = originalMaxLimit;
    });
  });
});