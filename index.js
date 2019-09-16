const pug = require('pug');
const fs = require("fs");

let json = fs.readFileSync('books.json');
let books = JSON.parse(json);

let params = {
  meta: {
    title: "hogehoge"
  },
  results: books
}

const html = pug.renderFile('index.pug', params);
fs.writeFileSync("output.html", html);
