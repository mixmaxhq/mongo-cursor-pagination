import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { Model, Types, Schema } from 'mongoose';

import mongooseCursorPaginate from '../src/mongoose.plugin';
import dbUtils from './support/db';

const AuthorSchema = new Schema({ name: String });
AuthorSchema.index({ name: 'text' });

AuthorSchema.plugin(mongooseCursorPaginate, { name: 'paginateFN', searchFnName: 'searchFN' });

type ModelSchemaType = typeof Model;
interface AuthorSchemaWithPlugin extends ModelSchemaType {
  paginateFN: () => Promise<boolean>;
  searchFN: (param: String) => Promise<boolean>;
}

const Author = mongoose.model('Author', AuthorSchema);

const PostSchema = new Schema({
  title: String,
  date: Date,
  body: String,
  author: {
    type: Types.ObjectId,
    ref: 'Author',
  },
});

PostSchema.plugin(mongooseCursorPaginate);
PostSchema.index({ title: 'text' });

const Post = mongoose.model('Post', PostSchema);

let mongod: MongoMemoryServer;

describe('mongoose plugin', () => {
  const { hasOwnProperty } = Object.prototype;

  beforeAll(async () => {
    mongod = await dbUtils.start();
    await mongoose.connect(mongod.getUri());
    await mongoose.connection.db.dropDatabase();
    const author = await Author.create({ name: 'Pawan Pandey' });

    const date = new Date();

    const posts = [...Array(100).keys()].map((_, index) => {
      index++;
      return new Post({
        title: 'Post #' + index,
        date: new Date(new Date().setHours(date.getHours() - index)),
        author: author._id,
        body: 'Post Body #' + index,
      });
    });

    await Post.create(posts);
    await Author.createIndexes();
    await Post.createIndexes();
  });

  afterAll(async () => {
    await mongod.stop();
  });

  it('initializes the pagination function by the provided name', () => {
    const promise = (Author as AuthorSchemaWithPlugin).paginateFN();
    expect(promise.then instanceof Function).toBe(true);
  });

  it('returns a promise', () => {
    const promise = Post.paginate({});
    expect(promise.then instanceof Function).toBe(true);
  });

  it('returns data in the expected format', async () => {
    const data = await Post.paginate({});

    expect(hasOwnProperty.call(data, 'results')).toBe(true);
    expect(hasOwnProperty.call(data, 'previous')).toBe(true);
    expect(hasOwnProperty.call(data, 'hasPrevious')).toBe(true);
    expect(hasOwnProperty.call(data, 'next')).toBe(true);
    expect(hasOwnProperty.call(data, 'hasNext')).toBe(true);
  });

  it('filters data according to the query (and casts it)', async () => {
    const authorId = (await Author.findOne({ name: 'Pawan Pandey' }))?._id.toString();

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const data = await Post.paginate({
      query: {
        author: authorId,
        date: { $gt: yesterday },
      },
    });

    expect(Object.prototype.hasOwnProperty.call(data, 'results')).toBe(true);
    expect(hasOwnProperty.call(data, 'previous')).toBe(true);
    expect(hasOwnProperty.call(data, 'hasPrevious')).toBe(true);
    expect(hasOwnProperty.call(data, 'next')).toBe(true);
    expect(hasOwnProperty.call(data, 'hasNext')).toBe(true);
    expect(data.results).toHaveLength(23);
  });

  //#region search
  it('initializes the search function by the provided name', () => {
    const promise = (Author as AuthorSchemaWithPlugin).searchFN('');
    expect(promise.then instanceof Function).toBe(true);
  });

  it('returns a promise for search function', () => {
    const promise = Post.search('', {});
    expect(promise.then instanceof Function).toBe(true);
  });

  it('returns data in the expected format for search function', async () => {
    const data = await Post.search('Post #1', { limit: 3 });
    expect(hasOwnProperty.call(data, 'results')).toBe(true);
    expect(hasOwnProperty.call(data, 'next')).toBe(true);
  });
  //#endregion
});
