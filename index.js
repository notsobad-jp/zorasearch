const pug = require('pug');
const fs = require("fs");
const fetch = require("node-fetch");

fetch('https://api.bungomail.com/v0/books?limit=10')
  .then((response) => {
    if(!response.ok) { throw new Error(); }
    return response.json();
  })
  .then((json) => {
    let params = {
      meta: {
        title: "hogehoge"
      },
      links: {},
      results: json
    }

    const currentUrl = "http://127.0.0.1:8887/output.html";
    if(json.links) {
      const afterMatch = (json.links.next || "").match(/[?&]after=([^&]+)/);
      if(afterMatch) { params.links.next = `${currentUrl}?after=${afterMatch[1]}`; }

      const beforeMatch = (json.links.prev || "").match(/[?&]before=([^&]+)/);
      if(beforeMatch) { params.links.prev = `${currentUrl}?before=${beforeMatch[1]}`; }
    }

    const html = pug.renderFile('index.pug', params);
    fs.writeFileSync("output.html", html);
  });
