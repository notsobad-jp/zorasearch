const functions = require('firebase-functions');
const fetch = require("node-fetch");
const pug = require('pug');
const express = require('express');
const app = express();
const rootUrl = 'https://search.bungomail.com';

/***********************************************
* Routing
***********************************************/
// index
const index = (req, res) => {
  res.set('Cache-Control', 'public, max-age=31536000, s-maxage=31536000');
  const authorId = req.params.authorId || 'all'
  const categoryId = req.params.categoryId || 'all'
  const baseUrl = "https://api.bungomail.com/v0";
  let url = (authorId == 'all') ? `${baseUrl}/books` : `${baseUrl}/persons/${authorId}/books`;
  if(categoryId != 'all') { req.query[encodeURIComponent('カテゴリ')] = categoryId; }
  // req.query["limit"] = 3; //FIXME: テスト用の件数制限
  const queries = Object.keys(req.query).map((m) => `${m}=${req.query[m]}`).join("&");
  if(queries) { url = `${url}?${queries}`; }
  fetch(url)
    .then((response) => {
      if(!response.ok) { return res.status(500).send(response); }
      return response.json();
    })
    .then((json) => {
      const category = categoryMaster[categoryId];
      const author = json.person || { 人物ID: 'all', 作品数: allBooksCount };
      let params = {
        meta: {
          title: title(author, category),
          description: description(author, category),
          canonicalUrl: (authorId=='all' && categoryId=='all') ? rootUrl : `${rootUrl}${req.path}`
        },
        category: category,
        author: author,
        allBooksCount: allBooksCount,
        links: {},
        results: json,
        breadcrumb: breadcrumb({author:author, category: category})
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
app.get('/authors/:authorId/categories/:categoryId/books/:bookId', (req, res) => {
  res.set('Cache-Control', 'public, max-age=31536000, s-maxage=31536000');
  const url = `https://api.bungomail.com/v0/books/${req.params.bookId}`;
  const authorPopularsUrl = `https://api.bungomail.com/v0/books?${encodeURIComponent('人物ID')}=${req.params.authorId}&limit=4`;
  const categoryPopularsUrl = `https://api.bungomail.com/v0/books?${encodeURIComponent('カテゴリ')}=${req.params.categoryId}&limit=4`;
  Promise.all([fetch(url), fetch(authorPopularsUrl), fetch(categoryPopularsUrl)])
    .then((results) => {
      if(!results[0].ok) { return res.status(500).send(results[0]); }
      return Promise.all(results.map((m) => m.json()));
    })
    .then((results) => {
      const book = results[0].book;
      const category = categoryMaster[req.params.categoryId];
      const author = book;
      let params = {
        meta: {
          title: `${book["姓名"]}『${book["作品名"]}』 - ${category.readTime}で読める青空文庫の${category.name}作品`,
          description: `『${book["作品名"]}』は青空文庫で公開されている${book["姓名"]}の${category.name}作品。${book["文字数"].toLocaleString()}文字で、おおよそ${category.readTime}で読むことができます。`,
          canonicalUrl: `${rootUrl}${req.path}`
        },
        category: category,
        author: author,
        allBooksCount: allBooksCount,
        book: book,
        breadcrumb: breadcrumb({book: book}),
        authorBooks: results[1].books,
        categoryBooks: results[2].books,
        categoryMaster: categoryMaster
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
      const category = categoryMaster[req.query.categoryId];
      // ヒットが1件だけなら直接そのページにリダイレクト
      if(json.persons.length==1) {
        res.redirect(`/authors/${json.persons[0]["人物ID"]}/categories/${category.id}/books`);
      }
      // それ以外なら検索結果画面を表示
      let params = {
        meta: {
          title: `「${req.query.keyword}」の検索結果`,
          canonicalUrl: `${rootUrl}${req.originalUrl}`,
          noindex: true
        },
        category: category,
        authors: json.persons,
        allBooksCount: allBooksCount
      }
      const html = pug.renderFile('views/search.pug', params);
      res.status(200).send(html);
    });
});


// about
app.get('/about', (req, res) => {
  res.set('Cache-Control', 'public, max-age=31536000, s-maxage=31536000');
  let params = {
    meta: {
      title: `ゾラサーチとは`,
      canonicalUrl: `${rootUrl}${req.path}`,
    },
    breadcrumb: [
      { name: 'TOP', item: rootUrl },
      { name: 'このサイトについて', item: `${rootUrl}/about` },
    ],
    allBooksCount: allBooksCount
  }
  const html = pug.renderFile('views/about.pug', params);
  res.status(200).send(html);
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

const breadcrumb = ({author, category, book}) => {
  const res = [];
  res.push({ name: 'TOP', item: rootUrl });

  if(book) {
    res.push({ name: book["姓名"], item: `${rootUrl}/authors/${book["人物ID"]}/categories/all/books` });
    const ctg = categoryMaster[book["カテゴリ"]];
    res.push({ name: `${ctg.name}（${ctg.readTime}）`, item: `${rootUrl}/authors/${book["人物ID"]}/categories/${book["カテゴリ"]}/books` });
    res.push({ name: book["作品名"], item: `${rootUrl}/authors/${book["人物ID"]}/categories/${book["カテゴリ"]}/books/${book["作品ID"]}` });
  }else {
    if(author["人物ID"] != 'all') { res.push({ name: author["姓名"], item: `${rootUrl}/authors/${author["人物ID"]}/categories/all/books` }); }
    const categoryName = `${category.name}（${category.readTime}）`;
    if(category.id != 'all') { res.push({ name: categoryName, item: `${rootUrl}/authors/${author["人物ID"]}/categories/${category.id}/books` }); }
  }
  return res;
}


const categoryMaster = {
  'all': {
    id: 'all',
    name: '全',
    readTime: 'すべて',
    charsCount: 'すべて',
    color: '',
  },
  'flash': {
    id: 'flash',
    name: '短編',
    readTime: '5分以内',
    charsCount: '〜2,000文字',
    color: 'orange',
  },
  'shortshort': {
    id: 'shortshort',
    name: '短編',
    readTime: '10分以内',
    charsCount: '2,000〜4,000文字',
    color: 'pink',
  },
  'short': {
    id: 'short',
    name: '短編',
    readTime: '30分以内',
    charsCount: '4,000〜12,000文字',
    color: 'blue',
  },
  'novelette': {
    id: 'novelette',
    name: '中編',
    readTime: '60分以内',
    charsCount: '12,000〜24,000文字',
    color: 'green',
  },
  'novel': {
    id: 'novel',
    name: '長編',
    readTime: '1時間〜',
    charsCount: '24,000文字〜',
    color: '',
  }
}
