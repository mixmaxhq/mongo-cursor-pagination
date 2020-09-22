const mongoose = require('mongoose');

const { describe } = require('ava-spec');
const test = require('ava');
const mongooseCursorPaginate = require('../src/mongoose.plugin');

const MONGO_URI = 'mongodb://127.0.0.1/mongoose_paginate';

const AuthorSchema = new mongoose.Schema({ name: String });

AuthorSchema.plugin(mongooseCursorPaginate, { name: 'paginateFN' });

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

const Post = mongoose.model('Post', PostSchema);

test.before('start mongoose connection and add data into collection', async () => {
  await mongoose.connect(MONGO_URI);
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
});

describe('mongoose plugin', (it) => {
  it('paginate function should initialized by provided name', function (t) {
    const promise = Author.paginateFN();
    t.is(promise.then instanceof Function, true);
  });

  it('return promise', function (t) {
    const promise = Post.paginate();
    t.is(promise.then instanceof Function, true);
  });

  it('should return data in expected format', async function (t) {
    const data = await Post.paginate();
    t.is(hasOwnProperty.call(data, 'results'), true);
    t.is(hasOwnProperty.call(data, 'previous'), true);
    t.is(hasOwnProperty.call(data, 'hasPrevious'), true);
    t.is(hasOwnProperty.call(data, 'next'), true);
    t.is(hasOwnProperty.call(data, 'hasNext'), true);
  });

  it('returns data with expected fields', async (t) => {
    const data = await Post.paginate({ fields: { title: 1 }, limit: 1 });
    const [post] = data.results;
    t.is(hasOwnProperty.call(post, 'title'), true);
    t.is(hasOwnProperty.call(post, 'date'), false);
    t.is(hasOwnProperty.call(post, 'author'), false);
    t.is(hasOwnProperty.call(post, 'body'), false);
  });
});
