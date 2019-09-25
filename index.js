const pug = require('pug');
const fs = require("fs");

let json = fs.readFileSync('books.json');
let results = JSON.parse(json);

let params = {
  meta: {
    title: "hogehoge"
  },
  links: {},
  results: results
}

const currentUrl = "http://127.0.0.1:8887/output.html";
if(results.links) {
  const afterMatch = (results.links.next || "").match(/[?&]after=([^&]+)/);
  if(afterMatch) { params.links.next = `${currentUrl}?after=${afterMatch[1]}`; }

  const beforeMatch = (results.links.prev || "").match(/[?&]before=([^&]+)/);
  if(beforeMatch) { params.links.prev = `${currentUrl}?before=${beforeMatch[1]}`; }
}

const html = pug.renderFile('index.pug', params);
fs.writeFileSync("output.html", html);
