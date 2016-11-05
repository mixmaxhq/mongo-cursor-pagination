var paging = require('../');
var getDb = require('./support/db');
var sync = require('synchronize');
require('synchronize-bdd').replace();

describe('findWithReq', () => {
  var db;

  beforeEach(() => {
    db = getDb();
  });

  describe('basic usage', () => {
    beforeEach(() => {
      sync.await(db.collection('test_paging').insertMany([{
        counter: 1,
        myfield1: 'a',
        myfield2: 'b'
      }, {
        counter: 2,
        myfield1: 'a',
        myfield2: 'b'
      }, {
        counter: 3,
        myfield1: 'a',
        myfield2: 'b'
      }, {
        counter: 4,
        myfield1: 'a',
        myfield2: 'b'
      }], sync.defer()));
    });

    afterEach(() => {
      sync.await(db.collection('test_paging').remove({}, sync.defer()));
    });

    it('should query first few pages', () => {
      var fields = {
        counter: 1,
        myfield1: 1,
        myfield2: 1
      };

      // First page of 2
      var res = sync.await(paging.findWithReq({
        query: {
          limit: '2',
          fields: 'counter,myfield1'
        }
      }, db.collection('test_paging'), {
        fields
      }, sync.defer()));

      expect(res.results.length).toBe(2);
      expect(res.results[0]).toEqual({
        counter: 4,
        myfield1: 'a'
      });
      expect(res.results[1]).toEqual({
        counter: 3,
        myfield1: 'a'
      });
      expect(res.previous).toBeFalsy();
      expect(res.next).toEqual(jasmine.any(String));

      // Go forward 1
      res = sync.await(paging.findWithReq({
        query: {
          limit: '1',
          next: res.next,
          fields: 'counter,myfield1'
        }
      }, db.collection('test_paging'), {
        fields
      }, sync.defer()));
      expect(res.results.length).toBe(1);
      expect(res.results[0]).toEqual({
        counter: 2,
        myfield1: 'a'
      });
      expect(res.previous).toEqual(jasmine.any(String));
      expect(res.next).toEqual(jasmine.any(String));

      // Now back up 1
      res = sync.await(paging.findWithReq({
        query: {
          previous: res.previous,
          limit: '1',
          fields: 'counter,myfield1'
        }
      }, db.collection('test_paging'), {
        fields
      }, sync.defer()));

      expect(res.results.length).toBe(1);
      expect(res.results[0]).toEqual({
        counter: 3,
        myfield1: 'a'
      });
      expect(res.previous).toEqual(jasmine.any(String));
      expect(res.next).toEqual(jasmine.any(String));
    });

    it('should not query more fields than allowed', () => {
      var res = sync.await(paging.findWithReq({
        query: {
          limit: '1',
          // myfield1 will be ignored because it doesn't exist in fields below
          fields: 'counter,myfield1'
        }
      }, db.collection('test_paging'), {
        fields: {
          counter: 1
        }
      }, sync.defer()));

      expect(res.results.length).toBe(1);
      expect(res.results[0]).toEqual({
        counter: 4
      });
    });

    it('should allow request to specify fields if not otherwise specified', () => {
      var res = sync.await(paging.findWithReq({
        query: {
          limit: '1',
          fields: 'counter,myfield1'
        }
      }, db.collection('test_paging'), {}, sync.defer()));

      expect(res.results.length).toBe(1);
      expect(res.results[0]).toEqual({
        counter: 4,
        myfield1: 'a'
      });
    });

    it('should not allow a limit to be specified that is higher than params.limit', () => {
      var res = sync.await(paging.findWithReq({
        query: {
          limit: '2',
        }
      }, db.collection('test_paging'), {
        limit: 1
      }, sync.defer()));

      expect(res.results.length).toBe(1);
    });

    it('should handle empty values', () => {
      var res = sync.await(paging.findWithReq({
        query: {
          limit: '',
          next: '',
          previous: '',
          fields: ''
        }
      }, db.collection('test_paging'), {}, sync.defer()));

      expect(res.results.length).toBe(4);
      expect(res.results[0]).toEqual({
        _id: jasmine.anything(),
        counter: 4,
        myfield1: 'a',
        myfield2: 'b'
      });
    });

    it('should handle bad value for limit', () => {
      var res = sync.await(paging.findWithReq({
        query: {
          limit: 'aaa'
        }
      }, db.collection('test_paging'), {
        fields: {
          counter: 1
        }
      }, sync.defer()));

      expect(res.results.length).toBe(4);
      expect(res.results[0]).toEqual({
        counter: 4
      });
    });
  });

  describe('fields', () => {
    beforeEach(() => {
      sync.await(db.collection('test_paging_fields').insert({
        obj: {
          one: 1,
          two: {
            three: 3
          },
          four: {
            five: {
              six: 6
            },
            seven: 7
          }
        },
        obj2: 1
      }, sync.defer()));
    });

    afterEach(() => {
      sync.await(db.collection('test_paging_fields').remove({}, sync.defer()));
    });

    it('should pick fields', function() {
      var res = sync.await(paging.findWithReq({
        query: {
          fields: 'obj.one,obj.four.five'
        }
      }, db.collection('test_paging_fields'), {
        fields: {
          obj: 1,
          obj2: 1
        }
      }, sync.defer()));

      expect(res.results[0]).toEqual({
        obj: {
          one: 1,
          four: {
            five: {
              six: 6
            }
          }
        }
      });
    });

    it('should work without fields', function() {
      var res = sync.await(paging.findWithReq({
        query: {
          fields: 'obj.one,obj.four.five'
        }
      }, db.collection('test_paging_fields'), {}, sync.defer()));

      expect(res.results[0]).toEqual({
        obj: {
          one: 1,
          four: {
            five: {
              six: 6
            }
          }
        }
      });
    });

    it('should pick fields when nested', function() {
      var res = sync.await(paging.findWithReq({
        query: {
          fields: 'obj.four.five'
        }
      }, db.collection('test_paging_fields'), {
        fields: {
          'obj.four': 1,
          obj2: 1
        }
      }, sync.defer()));

      expect(res.results[0]).toEqual({
        obj: {
          four: {
            five: {
              six: 6
            }
          }
        }
      });
    });

    it('should disallow properties that are not defined', function() {
      var res = sync.await(paging.findWithReq({
        query: {
          fields: '_id,obj.four.five,obj2'
        }
      }, db.collection('test_paging_fields'), {
        fields: {
          _id: 1,
          'obj': 1,
        }
      }, sync.defer()));

      expect(res.results[0]).toEqual({
        _id: jasmine.anything(),
        obj: {
          four: {
            five: {
              six: 6
            }
          }
        }
      });
    });

    it('should pick exact field', function() {
      var res = sync.await(paging.findWithReq({
        query: {
          fields: 'obj'
        }
      }, db.collection('test_paging_fields'), {
        fields: {
          obj: 1
        }
      }, sync.defer()));

      expect(res.results[0]).toEqual({
        obj: {
          one: 1,
          two: {
            three: 3
          },
          four: {
            five: {
              six: 6
            },
            seven: 7
          }
        },
      });
    });

    it('should pick exact subfields', function() {
      var res = sync.await(paging.findWithReq({
        query: {
          fields: 'obj.one,obj.four.five'
        }
      }, db.collection('test_paging_fields'), {
        fields: {
          'obj.one': 1,
          'obj.four.five': 1
        }
      }, sync.defer()));

      expect(res.results[0]).toEqual({
        obj: {
          one: 1,
          four: {
            five: {
              six: 6
            }
          }
        }
      });
    });

    it('should not allow a broader scoping of fields', function() {
      var res = sync.await(paging.findWithReq({
        query: {
          fields: 'obj'
        }
      }, db.collection('test_paging_fields'), {
        fields: {
          'obj.one': 1
        }
      }, sync.defer()));

      expect(res.results[0]).toEqual({
        obj: {
          one: 1,
        }
      });
    });

    it('should not allow a broader scoping of subfields', function() {
      var res = sync.await(paging.findWithReq({
        query: {
          fields: 'obj.two,obj.four,obj2'
        }
      }, db.collection('test_paging_fields'), {
        fields: {
          'obj.two.three': 1,
          'obj.four.five': 1,
          'obj2': 1
        }
      }, sync.defer()));

      expect(res.results[0]).toEqual({
        obj: {
          two: {
            three: 3
          },
          four: {
            five: {
              six: 6
            }
          }
        },
        obj2: 1
      });
    });

    it('should pick exact subfields', function() {
      var res = sync.await(paging.findWithReq({
        query: {
          fields: 'obj.one'
        }
      }, db.collection('test_paging_fields'), {
        fields: {
          'obj.one': 1
        }
      }, sync.defer()));

      expect(res.results[0]).toEqual({
        obj: {
          one: 1
        }
      });
    });
  });
});