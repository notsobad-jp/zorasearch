const functions = require('firebase-functions');
const fetch = require("node-fetch");
const pug = require('pug');
const express = require('express');
const app = express();

/***********************************************
* Routing
***********************************************/
// index
const index = (req, res) => {
  const authorId = req.params.authorId || 'all'
  const categoryId = req.params.categoryId || 'all'
  const baseUrl = "https://api.bungomail.com/v0";
  let url = (authorId == 'all') ? `${baseUrl}/books` : `${baseUrl}/persons/${authorId}/books`;
  if(categoryId != 'all') { req.query[encodeURIComponent('カテゴリ')] = categoryId; }
  req.query["limit"] = 3; //FIXME: テスト用の件数制限
  const queries = Object.keys(req.query).map((m) => `${m}=${req.query[m]}`).join("&");
  if(queries) { url = `${url}?${queries}`; }
  fetch(url)
    .then((response) => {
      if(!response.ok) { return res.status(500).send(response); }
      return response.json();
    })
    .then((json) => {
      const category = new Category(categoryId);
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
}
app.get('/', index);
app.get('/authors/:authorId/categories/:categoryId/books', index);



// show
app.get('/authors/:authorId/categories/:categoryId/books/:book_id', (req, res) => {
  const url = `https://api.bungomail.com/v0/books/${req.params.book_id}`;
  fetch(url)
    .then((response) => {
      if(!response.ok) { return res.status(500).send(response); }
      return response.json();
    })
    .then((json) => {
      const book = json.book;
      const category = new Category(req.params.categoryId);
      const author = book;
      let params = {
        meta: {
          title: `${book["姓名"]}『${book["作品名"]}』- ${category.readTime}で読める青空文庫の${category.name}作品 | ゾラサーチ`,
          description: `『${book["作品名"]}』は青空文庫で公開されている${book["姓名"]}の${category.name}作品。${book["文字数"].toLocaleString()}文字で、おおよそ${category.readTime}で読むことができます。`
        },
        category: category,
        author: author,
        allBooksCount: allBooksCount,
        book: book
      }
      const html = pug.renderFile('views/show.pug', params);
      res.status(200).send(html);
    });
});


// search
app.get('/authors', (req, res) => {
  const url = `https://api.bungomail.com/v0/persons?${encodeURIComponent('姓名')}=/${encodeURIComponent(req.query.keyword)}/`;
  fetch(url)
    .then((response) => {
      if(!response.ok) { return res.status(500).send(response); }
      return response.json();
    })
    .then((json) => {
      const category = new Category(req.query.categoryId);
      // ヒットが1件だけなら直接そのページにリダイレクト
      if(json.persons.length==1) {
        res.redirect(`/authors/${json.persons[0]["人物ID"]}/categories/${category.id}/books`);
      }
      // それ以外なら検索結果画面を表示
      let params = {
        meta: {
          title: `「${req.query.keyword}」の検索結果`
        },
        category: category,
        authors: json.persons,
        allBooksCount: allBooksCount
      }
      const html = pug.renderFile('views/search.pug', params);
      res.status(200).send(html);
    });
});



exports.app = functions.https.onRequest(app);


/***********************************************
* Methods
***********************************************/
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
        this.color = '';
        break;
      case 'flash':
        this.name = '短編';
        this.readTime = '5分以内';
        this.charsCount = '〜2,000文字';
        this.color = 'orange';
        break;
      case 'shortshort':
        this.name = '短編';
        this.readTime = '10分以内';
        this.charsCount = '2,000〜4,000文字';
        this.color = 'pink';
        break;
      case 'short':
        this.name = '短編';
        this.readTime = '30分以内';
        this.charsCount = '4,000〜12,000文字';
        this.color = 'blue';
        break;
      case 'novelette':
        this.name = '中編';
        this.readTime = '60分以内';
        this.charsCount = '12,000〜24,000文字';
        this.color = 'green';
        break;
      case 'novel':
        this.name = '長編';
        this.readTime = '1時間〜';
        this.charsCount = '24,000文字〜';
        this.color = '';
        break;
    }
  }
}
