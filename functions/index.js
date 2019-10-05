const functions = require('firebase-functions');
const fetch = require("node-fetch");
const pug = require('pug');
const express = require('express');

const app = express();
app.get('/timestamp', (request, response) => {
  // response.send(`${Date.now()}`);
  fetch('https://api.bungomail.com/v0/books?limit=10')
    .then((res) => {
      if(!res.ok) { throw new Error(); }
      return res.json();
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

      const html = pug.renderFile('views/index.pug', params);
      response.status(200).send(html);
    });
})

exports.app = functions.https.onRequest(app);
