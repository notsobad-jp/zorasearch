const functions = require('firebase-functions');
const fetch = require("node-fetch");
const pug = require('pug');
const express = require('express');

const app = express();

// index
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
      const category = new Category(req.params.category);
      const author = json.person || { 人物ID: 'all', 作品数: allBooksCount };
      let params = {
        meta: {
          title: title(author, category),
          description: description(author, category)
        },
        category: category,
        author: author,
        allBooksCount: allBooksCount,
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


// show
app.get('/authors/:author_id/categories/:category/books/:book_id', (req, res) => {
  const url = `https://api.bungomail.com/v0/books/${req.params.book_id}`;
  fetch(url)
    .then((response) => {
      if(!response.ok) { return res.status(500).send(response); }
      return response.json();
    })
    .then((json) => {
      const book = json.book;
      const category = new Category(req.params.category);
      const author = book;
      let params = {
        meta: {
          title: `${book["姓名"]}『${book["作品名"]}』- ${category.readTime}で読める青空文庫の${category.name}作品 | ゾラサーチ`,
          description: `『${book["作品名"]}』は青空文庫で公開されている${book["姓名"]}の${category.name}作品。${book["文字数"].toLocaleString()}文字で、おおよそ${category.readTime}で読むことができます。`
        },
        category: category,
        author: author,
        allBooksCount: allBooksCount,
        links: {},
        book: book
      }
      const html = pug.renderFile('views/show.pug', params);
      res.status(200).send(html);
    });
});



const title = (author, category) => {
  const authorName = author["姓名"] || '青空文庫';
  let title = "";
  if(category.id != 'all') {
    title += `${category.readTime}で読める`;
  }
  title += `${authorName}の${category.name}作品`;
  return title;
}

const description = (author, category) => {
  const authorName = author["姓名"] || 'すべての著者';
  let description = "";
  description += `青空文庫で公開されている${authorName}の作品`;
  if(category.id != 'all') {
    description += `の中で、おおよその読了目安時間が「${category.readTime}」の${category.name}作品`;
  }
  const booksCount = (author['作品数'][category.id] || 0).toLocaleString();
  description += `${booksCount}篇を、おすすめ人気順に表示しています。`;
  return description;
}

const allBooksCount = {
 "all": 16353, "flash": 4633, "shortshort": 2581, "short": 4619, "novelette": 2488, "novel": 2032
}


class Category {
  constructor (categoryId) {
    this.id = categoryId;
    switch(categoryId) {
      case 'all':
        this.name = '全';
        this.readTime = 'すべて';
        this.charsCount = 'すべて';
        break;
      case 'flash':
        this.name = '短編';
        this.readTime = '5分以内';
        this.charsCount = '〜2,000文字';
        break;
      case 'shortshort':
        this.name = '短編';
        this.readTime = '10分以内';
        this.charsCount = '2,000〜4,000文字';
        break;
      case 'short':
        this.name = '短編';
        this.readTime = '30分以内';
        this.charsCount = '4,000〜12,000文字';
        break;
      case 'novelette':
        this.name = '中編';
        this.readTime = '60分以内';
        this.charsCount = '12,000〜24,000文字';
        break;
      case 'novel':
        this.name = '長編';
        this.readTime = '1時間〜';
        this.charsCount = '24,000文字〜';
        break;
    }
  }
}


exports.app = functions.https.onRequest(app);
