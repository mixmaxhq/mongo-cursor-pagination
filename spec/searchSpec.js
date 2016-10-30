var paging = require('../');
var getDb = require('./support/db');
var sync = require('synchronize');
require('synchronize-bdd').replace();

describe('search', () => {
  var db;

  beforeEach(() => {
    db = getDb();
  });

  describe('basic usage', () => {
    beforeEach(() => {
      sync.await(db.collection('test_paging_search').ensureIndex({
        mytext: 'text'
      }, {
        name: 'test_index'
      }, sync.defer()));

      sync.await(db.collection('test_paging_search').insertMany([{
        mytext: 'one',
      }, {
        mytext: 'one two'
      }, {
        mytext: 'one two three'
      }, {
        mytext: 'one two three four'
      }, {
        mytext: 'one two three four five',
        group: 'one'
      }, {
        mytext: 'one two three four five six',
        group: 'one'
      }, {
        mytext: 'one two three four five six seven',
        group: 'one'
      }, {
        mytext: 'one two three four five six seven eight',
        group: 'one'
      }], sync.defer()));
    });

    it('should query first few pages', () => {
      // First page of 2
      var res = sync.await(paging.search(db.collection('test_paging_search'), 'one', {
        fields: {
          mytext: 1
        },
        limit: 2
      }, sync.defer()));

      expect(res.results.length).toBe(2);
      expect(res.results[0].mytext).toBe('one');
      expect(res.results[0].score).toBe(1.1);
      expect(res.results[1].mytext).toBe('one two');
      expect(res.results[1].score).toBe(0.75);
      expect(res.previous).toBeFalsy();
      expect(res.next).toEqual(jasmine.any(String));

      // Go forward 2
      res = sync.await(paging.search(db.collection('test_paging_search'), 'one', {
        fields: {
          mytext: 1
        },
        limit: 3,
        next: res.next
      }, sync.defer()));

      expect(res.results.length).toBe(3);
      expect(res.results[0].mytext).toBe('one two three');
      expect(res.results[0].score).toBe(0.6666666666666666);
      expect(res.results[1].mytext).toBe('one two three four');
      expect(res.results[1].score).toBe(0.625);
      expect(res.results[2].mytext).toBe('one two three four five');
      expect(res.results[2].score).toBe(0.6);
      expect(res.next).toEqual(jasmine.any(String));

      // Go forward another 2
      res = sync.await(paging.search(db.collection('test_paging_search'), 'one', {
        fields: {
          mytext: 1
        },
        limit: 4,
        next: res.next
      }, sync.defer()));

      expect(res.results.length).toBe(3);
      expect(res.results[0].mytext).toBe('one two three four five six');
      expect(res.results[0].score).toBe(0.5833333333333334);
      expect(res.results[1].mytext).toBe('one two three four five six seven');
      expect(res.results[1].score).toBe(0.5714285714285714);
      expect(res.results[2].mytext).toBe('one two three four five six seven eight');
      expect(res.results[2].score).toBe(0.5625);
      expect(res.next).toBeUndefined();
    });
  });

  describe('duplicate scores', () => {
    beforeEach(() => {
      sync.await(db.collection('test_paging_search').ensureIndex({
        mytext: 'text'
      }, {
        name: 'test_index'
      }, sync.defer()));

      sync.await(db.collection('test_paging_search').insertMany([{
        _id: 6,
        mytext: 'one',
        counter: 1
      }, {
        _id: 5,
        mytext: 'one',
        counter: 2
      }, {
        _id: 4,
        mytext: 'one',
        counter: 3
      }, {
        _id: 3,
        mytext: 'one two',
        counter: 4
      }, {
        _id: 2,
        mytext: 'one two',
        counter: 5
      }, {
        _id: 1,
        mytext: 'one two',
        counter: 6
      }], sync.defer()));
    });

    it('should query first few pages', () => {
      // First page of 2.
      var res = sync.await(paging.search(db.collection('test_paging_search'), 'one', {
        fields: {
          mytext: 1,
          counter: 1
        },
        limit: 2
      }, sync.defer()));

      expect(res.results.length).toBe(2);
      expect(res.results[0].counter).toBe(1);
      expect(res.results[1].counter).toBe(2);
      expect(res.previous).toBeFalsy();
      expect(res.next).toEqual(jasmine.any(String));

      // Go forward 2
      res = sync.await(paging.search(db.collection('test_paging_search'), 'one', {
        fields: {
          mytext: 1,
          counter: 1
        },
        limit: 2,
        next: res.next
      }, sync.defer()));

      expect(res.results.length).toBe(2);
      expect(res.results[0].counter).toBe(3);
      expect(res.results[1].counter).toBe(4);
      expect(res.next).toEqual(jasmine.any(String));

      // Go forward another 2
      res = sync.await(paging.search(db.collection('test_paging_search'), 'one', {
        fields: {
          mytext: 1,
          counter: 1
        },
        limit: 4,
        next: res.next
      }, sync.defer()));

      expect(res.results.length).toBe(2);
      expect(res.results[0].counter).toBe(5);
      expect(res.results[1].counter).toBe(6);
      expect(res.next).toBeUndefined();
    });
  });
});