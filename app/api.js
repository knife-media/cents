const restify = require('restify');
const sqlite3 = require('sqlite3');

const storage = require('../database.json');

// Create express instance
const api = restify.createServer();

// Create database instance
const database = new sqlite3.Database(storage.local.filename, (err) => {
  if (err) {
    return console.error(err.message);
  }
});

// Handle root route
api.get('/', (req, res, next) =>  {
  let sql = `SELECT title, content, source, link FROM messages ORDER BY created DESC LIMIT 250`;

  database.all(sql, (err, posts) => {
    if (err) {
      console.error(err.message);
    }

    res.send(posts);
  });
});

module.exports = api;