import _ from 'underscore';
import { Db } from 'mongodb';
import { findWithReq } from '../src';
import dbUtils from './support/db';
import { MongoMemoryServer } from 'mongodb-memory-server';

describe('findWithReq', () => {
  let mongod: MongoMemoryServer;
  let db: Db;
  beforeAll(async () => {
    mongod = await dbUtils.start();
    db = await dbUtils.db(mongod);

    await Promise.all([
      db.collection('test_paging').insertMany([
        {
          counter: 1,
          myfield1: 'a',
          myfield2: 'b',
        },
        {
          counter: 2,
          myfield1: 'a',
          myfield2: 'b',
        },
        {
          counter: 3,
          myfield1: 'a',
          myfield2: 'b',
        },
        {
          counter: 4,
          myfield1: 'a',
          myfield2: 'b',
        },
      ]),
      db.collection('test_paging_fields').insertOne({
        obj: {
          one: 1,
          two: {
            three: 3,
          },
          four: {
            five: {
              six: 6,
            },
            seven: 7,
          },
        },
        obj2: 1,
      }),
    ]);
  });
  afterAll(() => mongod.stop());

  describe('basic usage', () => {
    it('queries first few pages', async () => {
      const collection = db.collection('test_paging');
      const fields = {
        counter: 1,
        myfield1: 1,
        myfield2: 1,
      };

      // First page of 2
      let res = await findWithReq(
        {
          query: {
            limit: '2',
            fields: 'counter,myfield1',
          },
        },
        collection,
        {
          fields,
        }
      );

      expect(res.results.length).toEqual(2);
      expect(res.results[0]).toEqual(
        expect.objectContaining({
          counter: 4,
          myfield1: 'a',
        })
      );
      expect(res.results[1]).toEqual(
        expect.objectContaining({
          counter: 3,
          myfield1: 'a',
        })
      );
      expect(res.hasPrevious).toEqual(false);
      expect(res.hasNext).toEqual(true);

      // Go forward 1
      res = await findWithReq(
        {
          query: {
            limit: '1',
            next: res.next,
            fields: 'counter,myfield1',
          },
        },
        collection,
        {
          fields,
        }
      );
      expect(res.results.length).toEqual(1);
      expect(res.results[0]).toEqual(
        expect.objectContaining({
          counter: 2,
          myfield1: 'a',
        })
      );
      expect(res.hasPrevious).toEqual(true);
      expect(res.hasNext).toEqual(true);

      // Now back up 1
      res = await findWithReq(
        {
          query: {
            previous: res.previous,
            limit: '1',
            fields: 'counter,myfield1',
          },
        },
        collection,
        {
          fields,
        }
      );

      expect(res.results.length).toEqual(1);
      expect(res.results[0]).toEqual(
        expect.objectContaining({
          counter: 3,
          myfield1: 'a',
        })
      );
      expect(res.hasPrevious).toEqual(true);
      expect(res.hasNext).toEqual(true);
    });

    it('does not query more fields than allowed', async () => {
      const collection = db.collection('test_paging');
      const res = await findWithReq(
        {
          query: {
            limit: '1',
            // myfield1 will be ignored because it doesn't exist in fields below
            fields: 'counter,myfield1',
          },
        },
        collection,
        {
          fields: {
            counter: 1,
          },
        }
      );

      expect(res.results.length).toEqual(1);
      expect(res.results[0]).toEqual(
        expect.objectContaining({
          counter: 4,
        })
      );
    });

    it('allows a request to specify fields if not otherwise specified', async () => {
      const collection = db.collection('test_paging');
      const res = await findWithReq(
        {
          query: {
            limit: '1',
            fields: 'counter,myfield1',
          },
        },
        collection,
        {}
      );

      expect(res.results.length).toEqual(1);
      expect(res.results[0]).toEqual(
        expect.objectContaining({
          counter: 4,
          myfield1: 'a',
        })
      );
    });

    it('does not allow a limit to be specified that is higher than params.limit', async () => {
      const collection = db.collection('test_paging');
      const res = await findWithReq(
        {
          query: {
            limit: '2',
          },
        },
        collection,
        {
          limit: 1,
        }
      );

      expect(res.results.length).toEqual(1);
    });

    it('handles empty values', async () => {
      const collection = db.collection('test_paging');
      const res = await findWithReq(
        {
          query: {
            limit: '',
            next: '',
            previous: '',
            fields: '',
          },
        },
        collection,
        {}
      );

      expect(res.results.length).toEqual(4);
      expect(res.results[0]._id).toBeTruthy();
      expect(_.omit(res.results[0], '_id')).toEqual(
        expect.objectContaining({
          counter: 4,
          myfield1: 'a',
          myfield2: 'b',
        })
      );
    });

    it('handles bad value for limit', async () => {
      const collection = db.collection('test_paging');
      const res = await findWithReq(
        {
          query: {
            limit: 'aaa',
          },
        },
        collection,
        {
          fields: {
            counter: 1,
          },
        }
      );

      expect(res.results.length).toEqual(4);
      expect(res.results[0]).toEqual(
        expect.objectContaining({
          counter: 4,
        })
      );
    });
  });

  describe('fields', () => {
    it('picks fields', async () => {
      const collection = db.collection('test_paging_fields');
      const res = await findWithReq(
        {
          query: {
            fields: 'obj.one,obj.four.five',
          },
        },
        collection,
        {
          fields: {
            obj: 1,
            obj2: 1,
          },
        }
      );

      expect(res.results[0]).toEqual(
        expect.objectContaining({
          obj: {
            one: 1,
            four: {
              five: {
                six: 6,
              },
            },
          },
        })
      );
    });

    it('works without fields', async () => {
      const collection = db.collection('test_paging_fields');
      const res = await findWithReq(
        {
          query: {
            fields: 'obj.one,obj.four.five',
          },
        },
        collection,
        {}
      );

      expect(res.results[0]).toEqual(
        expect.objectContaining({
          obj: {
            one: 1,
            four: {
              five: {
                six: 6,
              },
            },
          },
        })
      );
    });

    it('picks fields when nested', async () => {
      const collection = db.collection('test_paging_fields');
      const res = await findWithReq(
        {
          query: {
            fields: 'obj.four.five',
          },
        },
        collection,
        {
          fields: {
            'obj.four': 1,
            obj2: 1,
          },
        }
      );

      expect(res.results[0]).toEqual(
        expect.objectContaining({
          obj: {
            four: {
              five: {
                six: 6,
              },
            },
          },
        })
      );
    });

    it('disallows properties that are not defined', async () => {
      const collection = db.collection('test_paging_fields');
      const res = await findWithReq(
        {
          query: {
            fields: 'obj.four.five,obj2',
          },
        },
        collection,
        {
          fields: {
            obj: 1,
          },
        }
      );

      expect(res.results[0]).toEqual(
        expect.objectContaining({
          obj: {
            four: {
              five: {
                six: 6,
              },
            },
          },
        })
      );
    });

    it('picks exact fields', async () => {
      const collection = db.collection('test_paging_fields');
      const res = await findWithReq(
        {
          query: {
            fields: 'obj',
          },
        },
        collection,
        {
          fields: {
            obj: 1,
          },
        }
      );

      expect(res.results[0]).toEqual(
        expect.objectContaining({
          obj: {
            one: 1,
            two: {
              three: 3,
            },
            four: {
              five: {
                six: 6,
              },
              seven: 7,
            },
          },
        })
      );
    });

    it('picks exact subfields', async () => {
      const collection = db.collection('test_paging_fields');
      const res = await findWithReq(
        {
          query: {
            fields: 'obj.one,obj.four.five',
          },
        },
        collection,
        {
          fields: {
            'obj.one': 1,
            'obj.four.five': 1,
          },
        }
      );

      expect(res.results[0]).toEqual(
        expect.objectContaining({
          obj: {
            one: 1,
            four: {
              five: {
                six: 6,
              },
            },
          },
        })
      );
    });

    it('does not allow a broader scoping of fields', async () => {
      const collection = db.collection('test_paging_fields');
      const res = await findWithReq(
        {
          query: {
            fields: 'obj',
          },
        },
        collection,
        {
          fields: {
            'obj.one': 1,
          },
        }
      );

      expect(res.results[0]).toEqual(
        expect.objectContaining({
          obj: {
            one: 1,
          },
        })
      );
    });

    it('does not allow a broader scoping of subfields', async () => {
      const collection = db.collection('test_paging_fields');
      const res = await findWithReq(
        {
          query: {
            fields: 'obj.two,obj.four,obj2',
          },
        },
        collection,
        {
          fields: {
            'obj.two.three': 1,
            'obj.four.five': 1,
            obj2: 1,
          },
        }
      );

      expect(res.results[0]).toEqual(
        expect.objectContaining({
          obj: {
            two: {
              three: 3,
            },
            four: {
              five: {
                six: 6,
              },
            },
          },
          obj2: 1,
        })
      );
    });

    it('picks exact subfields', async () => {
      const collection = db.collection('test_paging_fields');
      const res = await findWithReq(
        {
          query: {
            fields: 'obj.one',
          },
        },
        collection,
        {
          fields: {
            'obj.one': 1,
          },
        }
      );

      expect(res.results[0]).toEqual(
        expect.objectContaining({
          obj: {
            one: 1,
          },
        })
      );
    });
  });
});
