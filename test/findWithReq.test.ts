import * as _ from 'underscore';
import * as paging from '../src/index';
import * as dbUtils from './support/db';
import { Request } from 'express';
const driver = process.env.DRIVER;

describe('findWithReq', () => {
  let mongod;
  let client;
  const t = {
    db: null,
  };
  beforeAll(async () => {
    mongod = await dbUtils.start();
    ({ db: t.db, client } = await dbUtils.db(mongod, driver));

    await Promise.all([
      t.db.collection('test_paging').insertMany([
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
      t.db.collection('test_paging_fields').insertOne({
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

  afterAll(async () => {
    await (client ? client.close() : t.db.close());
    await mongod.stop();
  });

  describe('basic usage', () => {
    it('queries first few pages', async () => {
      const collection = t.db.collection('test_paging');
      const fields = {
        counter: 1,
        myfield1: 1,
        myfield2: 1,
      };

      // First page of 2
      const request = {
        query: {
          limit: '2',
          fields: 'counter,myfield1',
        } as any,
      } as Request;
      let res = await paging.findWithReq(request, collection, {
        fields,
      });

      expect(res.results.length).toEqual(2);
      expect(res.results[0]).toEqual({
        counter: 4,
        myfield1: 'a',
      });
      expect(res.results[1]).toEqual({
        counter: 3,
        myfield1: 'a',
      });
      expect(res.hasPrevious).toEqual(false);
      expect(res.hasNext).toEqual(true);

      // Go forward 1
      const req = {} as Request;
      req.query = {
        limit: '1',
        next: res.next,
        fields: 'counter,myfield1',
      };
      res = await paging.findWithReq(req, collection, {
        fields,
      });
      expect(res.results.length).toEqual(1);
      expect(res.results[0]).toEqual({
        counter: 2,
        myfield1: 'a',
      });
      expect(res.hasPrevious).toEqual(true);
      expect(res.hasNext).toEqual(true);

      // Now back up 1
      res = await paging.findWithReq(
        {
          query: {
            previous: res.previous,
            limit: '1',
            fields: 'counter,myfield1',
          } as any,
        } as Request,
        collection,
        {
          fields,
        }
      );

      expect(res.results.length).toEqual(1);
      expect(res.results[0]).toEqual({
        counter: 3,
        myfield1: 'a',
      });
      expect(res.hasPrevious).toEqual(true);
      expect(res.hasNext).toEqual(true);
    });

    it('does not query more fields than allowed', async () => {
      const collection = t.db.collection('test_paging');
      const res = await paging.findWithReq(
        {
          query: {
            limit: '1',
            // myfield1 will be ignored because it doesn't exist in fields below
            fields: 'counter,myfield1',
          } as any,
        } as Request,
        collection,
        {
          fields: {
            counter: 1,
          },
        }
      );

      expect(res.results.length).toEqual(1);
      expect(res.results[0]).toEqual({
        counter: 4,
      });
    });

    it('allows a request to specify fields if not otherwise specified', async () => {
      const collection = t.db.collection('test_paging');
      const res = await paging.findWithReq(
        {
          query: {
            limit: '1',
            fields: 'counter,myfield1',
          } as any,
        } as Request,
        collection,
        {}
      );

      expect(res.results.length).toEqual(1);
      expect(res.results[0]).toEqual({
        counter: 4,
        myfield1: 'a',
      });
    });

    it('does not allow a limit to be specified that is higher than params.limit', async () => {
      const collection = t.db.collection('test_paging');
      const res = await paging.findWithReq(
        {
          query: {
            limit: '2',
          } as any,
        } as Request,
        collection,
        {
          limit: 1,
        }
      );

      expect(res.results.length).toEqual(1);
    });

    it('handles empty values', async () => {
      const collection = t.db.collection('test_paging');
      const res = await paging.findWithReq(
        {
          query: {
            limit: '',
            next: '',
            previous: '',
            fields: '',
          } as any,
        } as Request,
        collection,
        {}
      );

      expect(res.results.length).toEqual(4);
      expect(res.results[0]._id).toBeTruthy();
      expect(_.omit(res.results[0], '_id')).toEqual({
        counter: 4,
        myfield1: 'a',
        myfield2: 'b',
      });
    });

    it('handles bad value for limit', async () => {
      const collection = t.db.collection('test_paging');
      const res = await paging.findWithReq(
        {
          query: {
            limit: 'aaa',
          } as any,
        } as Request,
        collection,
        {
          fields: {
            counter: 1,
          },
        }
      );

      expect(res.results.length).toEqual(4);
      expect(res.results[0]).toEqual({
        counter: 4,
      });
    });
  });

  describe('fields', () => {
    it('picks fields', async () => {
      const collection = t.db.collection('test_paging_fields');
      const res = await paging.findWithReq(
        {
          query: {
            fields: 'obj.one,obj.four.five',
          } as any,
        } as Request,
        collection,
        {
          fields: {
            obj: 1,
            obj2: 1,
          },
        }
      );

      expect(res.results[0]).toEqual({
        obj: {
          one: 1,
          four: {
            five: {
              six: 6,
            },
          },
        },
      });
    });

    it('works without fields', async () => {
      const collection = t.db.collection('test_paging_fields');
      const res = await paging.findWithReq(
        {
          query: {
            fields: 'obj.one,obj.four.five',
          } as any,
        } as Request,
        collection,
        {}
      );

      expect(res.results[0]).toEqual({
        obj: {
          one: 1,
          four: {
            five: {
              six: 6,
            },
          },
        },
      });
    });

    it('picks fields when nested', async () => {
      const collection = t.db.collection('test_paging_fields');
      const res = await paging.findWithReq(
        {
          query: {
            fields: 'obj.four.five',
          } as any,
        } as Request,
        collection,
        {
          fields: {
            'obj.four': 1,
            obj2: 1,
          },
        }
      );

      expect(res.results[0]).toEqual({
        obj: {
          four: {
            five: {
              six: 6,
            },
          },
        },
      });
    });

    it('disallows properties that are not defined', async () => {
      const collection = t.db.collection('test_paging_fields');
      const res = await paging.findWithReq(
        {
          query: {
            fields: 'obj.four.five,obj2',
          } as any,
        } as Request,
        collection,
        {
          fields: {
            obj: 1,
          },
        }
      );

      expect(res.results[0]).toEqual({
        obj: {
          four: {
            five: {
              six: 6,
            },
          },
        },
      });
    });

    it('picks exact fields', async () => {
      const collection = t.db.collection('test_paging_fields');
      const res = await paging.findWithReq(
        {
          query: {
            fields: 'obj',
          } as any,
        } as Request,
        collection,
        {
          fields: {
            obj: 1,
          },
        }
      );

      expect(res.results[0]).toEqual({
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
      });
    });

    it('picks exact subfields', async () => {
      const collection = t.db.collection('test_paging_fields');
      const res = await paging.findWithReq(
        {
          query: {
            fields: 'obj.one,obj.four.five',
          } as any,
        } as Request,
        collection,
        {
          fields: {
            'obj.one': 1,
            'obj.four.five': 1,
          },
        }
      );

      expect(res.results[0]).toEqual({
        obj: {
          one: 1,
          four: {
            five: {
              six: 6,
            },
          },
        },
      });
    });

    it('does not allow a broader scoping of fields', async () => {
      const collection = t.db.collection('test_paging_fields');
      const res = await paging.findWithReq(
        {
          query: {
            fields: 'obj',
          } as any,
        } as Request,
        collection,
        {
          fields: {
            'obj.one': 1,
          },
        }
      );

      expect(res.results[0]).toEqual({
        obj: {
          one: 1,
        },
      });
    });

    it('does not allow a broader scoping of subfields', async () => {
      const collection = t.db.collection('test_paging_fields');
      const res = await paging.findWithReq(
        {
          query: {
            fields: 'obj.two,obj.four,obj2',
          } as any,
        } as Request,
        collection,
        {
          fields: {
            'obj.two.three': 1,
            'obj.four.five': 1,
            obj2: 1,
          },
        }
      );

      expect(res.results[0]).toEqual({
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
      });
    });

    it('picks exact subfields', async () => {
      const collection = t.db.collection('test_paging_fields');
      const res = await paging.findWithReq(
        {
          query: {
            fields: 'obj.one',
          } as any,
        } as Request,
        collection,
        {
          fields: {
            'obj.one': 1,
          },
        }
      );

      expect(res.results[0]).toEqual({
        obj: {
          one: 1,
        },
      });
    });
  });
});
