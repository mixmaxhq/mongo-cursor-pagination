const mongoose = require('mongoose');
 
const { describe } = require('ava-spec');
const test = require('ava');
const mongooseCursorPaginate = require('../src/mongoose.plugin');

let MONGO_URI = 'mongodb://127.0.0.1/mongoose_paginate';

let AuthorSchema = new mongoose.Schema({ name: String });

AuthorSchema.plugin(mongooseCursorPaginate, { name: 'paginateFN' });

let Author =  mongoose.model('Author', AuthorSchema);

let PostSchema = new mongoose.Schema({
  title: String,
  date: Date,
  body : String,
  author: {
    type: mongoose.Schema.ObjectId,
    ref: 'Author'
  }
});

PostSchema.plugin(mongooseCursorPaginate);

let Post = mongoose.model('Post', PostSchema);

test.before('start mongoose connection and add data into collection', async () => {
  await mongoose.connect(MONGO_URI);
  await  mongoose.connection.db.dropDatabase();
  const author = await Author.create({ name: 'Pawan Pandey' });

  let post, posts = [];
  let date = new Date();

  for (let i = 1; i <= 100; i++) {
    post = new Post({
      title: 'Post #' + i,
      date: new Date(date.getTime() + i),
      author: author._id,
      body : 'Post Body #' + i,
    });
    posts.push(post);
  }

  await Post.create(posts);
});

describe('mongoose plugin', (it) => {

  it('paginate function should initialized by provided name', function(t){
    let promise = Author.paginateFN();
    t.is(promise.then instanceof Function, true);
  });

  it('return promise', function(t) {
    let promise = Post.paginate();
    t.is(promise.then instanceof Function, true);
  });

  it('should return data in expected format', async function(t) {
    let data = await Post.paginate();
    t.is(data.hasOwnProperty('results'), true);
    t.is(data.hasOwnProperty('previous'), true);
    t.is(data.hasOwnProperty('hasPrevious'), true);
    t.is(data.hasOwnProperty('next'), true);
    t.is(data.hasOwnProperty('hasNext'), true);
  });

  it('should return Mongoose documents', async function(t) {
    let data = await Post.paginate();
    t.is(data.results[0].schema, Post.schema);
  });
});
