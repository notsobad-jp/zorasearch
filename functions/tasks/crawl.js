const fetch = require("node-fetch");

const categories = ['all', 'flash', 'shortshort', 'short', 'novelette', 'novel'];
let nextUrl = "https://api.bungomail.com/v0/persons?after=1258";

const fetchAll = (url) => {
  fetch(url)
    .then((response) => {
      return response.json();
    })
    .then((json) => {
      nextUrl = json["links"]["next"];
      const promises = [];
      for(const author of json.persons) {
        if(author["作品数"]['all']==0) { continue; }
        for(const category of categories) {
          promises.push(fetch(`https://search.bungomail.com/authors/${author["人物ID"]}/categories/${category}/books`));
        }
      }
      Promise.all(promises).then((results)=>{
        console.log(`finished ${url}`);
        if(nextUrl) {
          setTimeout(function(){ fetchAll(nextUrl) }, 10000);
        }else {
          console.log("おしまい");
        }
      }).catch((err)=> {
        console.log(err);
        if(nextUrl) {
          setTimeout(function(){ fetchAll(nextUrl) }, 10000);
        }else {
          console.log("おしまい");
        }
      })
    })
    .catch((error) => {
      console.log(error);
      if(nextUrl) {
        setTimeout(function(){ fetchAll(nextUrl) }, 10000);
      }else {
        console.log("おしまい");
      }
    });
}

fetchAll(nextUrl);
