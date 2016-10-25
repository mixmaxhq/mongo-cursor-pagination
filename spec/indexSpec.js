var MongoClient = require('mongodb').MongoClient;
var paging = require('../src');

const DB_NAME = '__mongo-cursor-pagination-tests__';

describe('tests', () => {
  var db;

  beforeEach((done) => {
    var url = `mongodb://localhost:27017/${DB_NAME}`;
    // Use connect method to connect to the server
    MongoClient.connect(url, function(err, connection) {
      if (err) throw new Error('Unable to connect to mongo. Please make sure you are running it locally.', err);
      db = connection;
      done();
    });
  });

  afterEach((done) => {
    db.dropDatabase(err => {
      if (err) console.error('Warning: Unable to remove temporary test database ${DB_NAME}');
      db.close();
      done();
    });
  });

  describe('test with Mongo object ids', () => {
    beforeEach((done) => {
      db.collection('test_paging').insertMany([{
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
      }], function(err) {
        if (err) throw new Error('Unable to set up test');
        done();
      });
    });

    afterEach((done) => {
      db.collection('test_paging').remove({}, done);
    });

    it('should query first few pages', (done) => {
      // First page of 2
      paging.find(db.collection('test_paging'), {
        limit: 2
      }, function(err, res) {
        expect(res.results.length).toBe(2);
        expect(res.results[0].counter).toBe(8);
        expect(res.results[1].counter).toBe(7);
        expect(res.previous).toBeFalsy();
        expect(res.next).toEqual(jasmine.any(String));

        // Go forward 2
        paging.find(db.collection('test_paging'), {
          limit: 3,
          next: res.next
        }, function(err, res) {
          expect(res.results.length).toBe(3);
          expect(res.results[0].counter).toBe(6);
          expect(res.results[1].counter).toBe(5);
          expect(res.results[2].counter).toBe(4);
          expect(res.previous).toEqual(jasmine.any(String));
          expect(res.next).toEqual(jasmine.any(String));

          // Go forward another 2
          paging.find(db.collection('test_paging'), {
            limit: 2,
            next: res.next
          }, function(err, res) {
            expect(res.results.length).toBe(2);
            expect(res.results[0].counter).toBe(3);
            expect(res.results[1].counter).toBe(2);
            expect(res.previous).toEqual(jasmine.any(String));
            expect(res.next).toEqual(jasmine.any(String));

            // Now back up 2
            paging.find(db.collection('test_paging'), {
              limit: 2,
              previous: res.previous
            }, function(err, res) {
              expect(res.results.length).toBe(2);
              expect(res.results[0].counter).toBe(5);
              expect(res.results[1].counter).toBe(4);
              expect(res.previous).toEqual(jasmine.any(String));
              expect(res.next).toEqual(jasmine.any(String));

              done();
            });
          });
        });
      });
    });

    it('should handle hitting the end', (done) => {
      // First page of 2
      paging.find(db.collection('test_paging'), {
        limit: 4
      }, function(err, res) {
        expect(res.results.length).toBe(4);
        expect(res.results[0].counter).toBe(8);
        expect(res.results[1].counter).toBe(7);
        expect(res.results[2].counter).toBe(6);
        expect(res.results[3].counter).toBe(5);
        expect(res.previous).toBeFalsy();
        expect(res.next).toEqual(jasmine.any(String));

        // Go forward 2
        paging.find(db.collection('test_paging'), {
          limit: 3,
          next: res.next
        }, function(err, res) {
          expect(res.results.length).toBe(3);
          expect(res.results[0].counter).toBe(4);
          expect(res.results[1].counter).toBe(3);
          expect(res.results[2].counter).toBe(2);
          expect(res.previous).toEqual(jasmine.any(String));
          expect(res.next).toEqual(jasmine.any(String));

          // Go forward another 1, results should be empty.
          paging.find(db.collection('test_paging'), {
            limit: 2,
            next: res.next
          }, function(err, res) {
            expect(res.results.length).toBe(1);
            expect(res.results[0].counter).toBe(1);
            expect(res.previous).toEqual(jasmine.any(String));
            expect(res.next).toBeFalsy();

            done();
          });
        });
      });
    });

    it('should handle hitting the beginning', (done) => {
      // First page of 2
      paging.find(db.collection('test_paging'), {
        limit: 4
      }, function(err, res) {
        expect(res.results.length).toBe(4);
        expect(res.results[0].counter).toBe(8);
        expect(res.results[1].counter).toBe(7);
        expect(res.results[2].counter).toBe(6);
        expect(res.results[3].counter).toBe(5);
        expect(res.previous).toBeFalsy();
        expect(res.next).toEqual(jasmine.any(String));

        // Go forward 2
        paging.find(db.collection('test_paging'), {
          limit: 3,
          next: res.next
        }, function(err, res) {
          expect(res.results.length).toBe(3);
          expect(res.results[0].counter).toBe(4);
          expect(res.results[1].counter).toBe(3);
          expect(res.results[2].counter).toBe(2);
          expect(res.previous).toEqual(jasmine.any(String));
          expect(res.next).toEqual(jasmine.any(String));

          // Go back to beginning.
          paging.find(db.collection('test_paging'), {
            limit: 100,
            previous: res.previous
          }, function(err, res) {
            expect(res.results.length).toBe(4);
            expect(res.results[0].counter).toBe(8);
            expect(res.results[1].counter).toBe(7);
            expect(res.results[2].counter).toBe(6);
            expect(res.results[3].counter).toBe(5);
            expect(res.previous).toBeFalsy();
            expect(res.next).toEqual(jasmine.any(String));

            done();
          });
        });
      });
    });

    it('should use passed-in criteria', (done) => {
      // First page.
      paging.find(db.collection('test_paging'), {
        query: {
          color: 'blue'
        }
      }, function(err, res) {
        expect(res.results.length).toBe(5);
        expect(res.results[0].color).toBe('blue');
        expect(res.next).toBeFalsy();
        expect(res.previous).toBeFalsy();

        done();
      });
    });

    it('should use the "fields" parameter', (done) => {
      // First page.
      paging.find(db.collection('test_paging'), {
        query: {
          color: 'blue'
        },
        fields: {
          _id: 1
        }
      }, function(err, res) {
        expect(res.results.length).toBe(5);
        expect(res.results[0].color).toBeFalsy();

        done();
      });

    });

    it('should not return "next" or "previous" if there are no results', (done) => {
      // First page.
      paging.find(db.collection('test_paging'), {
        limit: 3,
        query: {
          nonexistantfield: true
        }
      }, function(err, res) {
        expect(res.results.length).toBe(0);
        expect(res.next).toBeFalsy();
        expect(res.previous).toBeFalsy();

        done();
      });
    });
  });

  describe('test with custom fields', () => {
    beforeEach((done) => {
      db.collection('test_paging_custom_fields').insertMany([{
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
      }], function(err) {
        if (err) throw new Error('Unable to set up test');
        done();
      });
    });

    it('should query first few pages', (done) => {
      // First page of 2
      paging.find(db.collection('test_paging_custom_fields'), {
        limit: 2,
        paginatedField: 'timestamp'
      }, function(err, res) {
        expect(res.results.length).toBe(2);
        expect(res.results[0].counter).toBe(6);
        expect(res.results[1].counter).toBe(5);
        expect(res.previous).toBeFalsy();
        expect(res.next).toEqual(jasmine.any(String));

        // Go forward 2
        paging.find(db.collection('test_paging_custom_fields'), {
          limit: 2,
          paginatedField: 'timestamp',
          next: res.next
        }, function(err, res) {
          expect(res.results.length).toBe(2);
          expect(res.results[0].counter).toBe(4);
          expect(res.results[1].counter).toBe(3);
          expect(res.previous).toEqual(jasmine.any(String));
          expect(res.next).toEqual(jasmine.any(String));

          // Go forward another 2
          paging.find(db.collection('test_paging_custom_fields'), {
            limit: 2,
            paginatedField: 'timestamp',
            next: res.next
          }, function(err, res) {
            expect(res.results.length).toBe(2);
            expect(res.results[0].counter).toBe(2);
            expect(res.results[1].counter).toBe(1);
            expect(res.previous).toEqual(jasmine.any(String));
            expect(res.next).toEqual(jasmine.any(String));

            // Now back up 2
            paging.find(db.collection('test_paging_custom_fields'), {
              limit: 2,
              paginatedField: 'timestamp',
              previous: res.previous
            }, function(err, res) {
              expect(res.results.length).toBe(2);
              expect(res.results[0].counter).toBe(4);
              expect(res.results[1].counter).toBe(3);
              expect(res.previous).toEqual(jasmine.any(String));
              expect(res.next).toEqual(jasmine.any(String));

              done();
            });
          });
        });
      });
    });

    it('should not include the paginatedField in the results if not desired', (done) => {
      paging.find(db.collection('test_paging_custom_fields'), {
        limit: 1,
        fields: {
          counter: 1
        },
        paginatedField: 'timestamp'
      }, function(err, res) {
        expect(res.results[0].timestamp).toBeUndefined();

        done();
      });
    });
  });

  describe('test with dates', () => {
    beforeEach((done) => {
      db.collection('test_paging_date').insertMany([{
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
      }], function(err) {
        if (err) throw new Error('Unable to set up test');
        done();
      });
    });

    it('should query first few pages', (done) => {
      // First page of 2
      paging.find(db.collection('test_paging_date'), {
        limit: 2,
        paginatedField: 'date'
      }, function(err, res) {
        expect(res.results.length).toBe(2);
        expect(res.results[0].counter).toBe(4);
        expect(res.results[1].counter).toBe(3);
        expect(res.previous).toBeFalsy();
        expect(res.next).toEqual(jasmine.any(String));

        // Go forward 2
        paging.find(db.collection('test_paging_date'), {
          limit: 2,
          paginatedField: 'date',
          next: res.next
        }, function(err, res) {
          expect(res.results.length).toBe(2);
          expect(res.results[0].counter).toBe(2);
          expect(res.results[1].counter).toBe(1);
          expect(res.previous).toEqual(jasmine.any(String));
          expect(res.next).toEqual(jasmine.any(String));

          done();
        });
      });
    });
  });
});
