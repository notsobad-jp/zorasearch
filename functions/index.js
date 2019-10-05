const functions = require('firebase-functions');
const fetch = require("node-fetch");
const pug = require('pug');
const express = require('express');

const app = express();
app.get('/', (request, response) => {
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

app.get('/authors/:author_id/categories/:category/books', (req, res) => {
  const baseUrl = "https://api.bungomail.com/v0";
  let url = (req.params.author_id == 'all') ? `${baseUrl}/books` : `${baseUrl}/persons/${req.params.author_id}/books`;
  if(req.params.category != 'all') { req.query[encodeURIComponent('カテゴリ')] = req.params.category; }
  const queries = Object.keys(req.query).map((m) => `${m}=${req.query[m]}`).join("&");
  if(queries) { url = `${url}?${queries}`; }
  fetch(url)
    .then((response) => {
      if(!response.ok) { return res.status(500).send(response); }
      return response.json();
    })
    .then((json) => {
      let params = {
        meta: metaData(json.person, req.params.category),
        category: req.params.category,
        author_id: req.params.author_id,
        links: {},
        results: json
      }

      if(json.links) {
        const afterMatch = (json.links.next || "").match(/[?&]after=([^&]+)/);
        if(afterMatch) { params.links.next = `${req.path}?after=${afterMatch[1]}`; }

        const beforeMatch = (json.links.prev || "").match(/[?&]before=([^&]+)/);
        if(beforeMatch) { params.links.prev = `${req.path}?before=${beforeMatch[1]}`; }
      }

      const html = pug.renderFile('views/index.pug', params);
      res.status(200).send(html);
    });
})

const metaData = (person, category) => {
  const meta = {
    title: title(person, category),
    description: description(person, category)
  };
  return meta;
}

const title = (person, category) => {
  const authorName = (person) ? person["姓名"] : '青空文庫';
  let title = "";
  if(category != 'all') {
    title += `${categoryReadTime(category)}で読める`;
  }
  title += `${authorName}の${categoryName(category)}作品`;
  return title;
}

const description = (person, category) => {
  const authorName = (person) ? person["姓名"] : 'すべて';
  let description = "";
  description += `青空文庫で公開されている${authorName}の作品`;
  if(category != 'all') {
    description += `の中で、おおよその読了目安時間が「${categoryReadTime(category)}」の${categoryName(category)}132作品`;
  }
  description += `を、おすすめ人気順に表示しています。`;
  return description;
}

const categoryName = (id) => {
  switch (id) {
    case 'all': return '全';
    case 'flash': return '短編';
    case 'shortshort': return '短編';
    case 'short': return '短編';
    case 'novelette': return '中編';
    case 'novel': return '長編';
    default: return '';
  }
}

const categoryReadTime = (id) => {
  switch (id) {
    case 'flash': return '5分以内';
    case 'shortshort': return '10分以内';
    case 'short': return '30分以内';
    case 'novelette': return '60分';
    case 'novel': return '1時間〜';
    default: return '';
  }
}



exports.app = functions.https.onRequest(app);
