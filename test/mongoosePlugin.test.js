const mongoose = require('mongoose');

const dbUtils = require('./support/db');
const mongooseCursorPaginate = require('../src/mongoose.plugin');

const AuthorSchema = new mongoose.Schema({ name: String });
AuthorSchema.index({ name: 'text' });

AuthorSchema.plugin(mongooseCursorPaginate, { name: 'paginateFN', searchFnName: 'searchFN' });

const Author = mongoose.model('Author', AuthorSchema);

const PostSchema = new mongoose.Schema({
  title: String,
  date: Date,
  body: String,
  author: {
    type: mongoose.Schema.ObjectId,
    ref: 'Author',
  },
});

PostSchema.plugin(mongooseCursorPaginate);
PostSchema.index({ title: 'text' });

const Post = mongoose.model('Post', PostSchema);

let mongod;
describe('mongoose plugin', () => {
  beforeAll(async () => {
    mongod = await dbUtils.start();
    await mongoose.connect(await mongod.getUri());
    await mongoose.connection.db.dropDatabase();
    const author = await Author.create({ name: 'Pawan Pandey' });

    const posts = [],
      date = new Date();

    for (let i = 1; i <= 100; i++) {
      const post = new Post({
        title: 'Post #' + i,
        date: new Date(date.getTime() + i),
        author: author._id,
        body: 'Post Body #' + i,
      });
      posts.push(post);
    }

    await Post.create(posts);
    await Author.createIndexes();
    await Post.createIndexes();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });

  it('initializes the pagination function by the provided name', () => {
    const promise = Author.paginateFN();
    expect(promise.then instanceof Function).toBe(true);
  });

  it('returns a promise', () => {
    const promise = Post.paginate();
    expect(promise.then instanceof Function).toBe(true);
  });

  it('returns data in the expected format', async () => {
    const data = await Post.paginate();
    expect(hasOwnProperty.call(data, 'results')).toBe(true);
    expect(hasOwnProperty.call(data, 'previous')).toBe(true);
    expect(hasOwnProperty.call(data, 'hasPrevious')).toBe(true);
    expect(hasOwnProperty.call(data, 'next')).toBe(true);
    expect(hasOwnProperty.call(data, 'hasNext')).toBe(true);
  });

  //#region search
  it('initializes the search function by the provided name', () => {
    const promise = Author.searchFN('');
    expect(promise.then instanceof Function).toBe(true);
  });

  it('returns a promise for search function', () => {
    const promise = Post.search('');
    expect(promise.then instanceof Function).toBe(true);
  });

  it('returns data in the expected format for search function', async () => {
    const data = await Post.search('Post #1', { limit: 3 });
    expect(hasOwnProperty.call(data, 'results')).toBe(true);
    expect(hasOwnProperty.call(data, 'next')).toBe(true);
  });
  //#endregion
});
