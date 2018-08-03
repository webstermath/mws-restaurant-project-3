self.addEventListener('install',function(event){
  event.waitUntil(importScripts('js/idb.js'))
  event.waitUntil(
    caches.open('restaurant-v1').then(cache => {
      return cache.addAll([
        '/',
        '/manifest.json',
        '/sw.js',
        'js/idb.js',
        '/restaurant.html',
        'js/main.js',
        'js/dbhelper.js',
        'js/restaurant_info.js',
        'css/styles.css'
        ]);

    }));
});

self.addEventListener('fetch',function(event){
  let url=null
  if(event.request.url.includes('restaurant.html?id')) url=event.request.url.replace(/\?id.*/,'')
  event.respondWith(
    caches.match(url || event.request).then(response => {
      if(response) return response;
      if(event.request.url.includes('.webp') || event.request.url.includes('.ico')){
        fetch(event.request).then(response => {
          caches.open('restaurant-v1')
          .then(cache => {
          cache.put(event.request.url,response.clone());
          return response;
          });
        });
      }
      return fetch(event.request);
    })
    );
});

self.addEventListener('sync', function(event) {
  if (event.tag == 'addReview') {
    event.waitUntil(new Promise((resolve,reject) => {
      idb.open('restaurants',1).then(db => {
        const storeName = 'tempReviews'
        const tx =db.transaction(storeName,'readwrite');
        const store = tx.objectStore(storeName);
        store.get('tempReview').then(review =>{
          fetch('http://localhost:1337/reviews/',{
            method: 'POST',
            body: JSON.stringify(review)
          })
          .then(response =>{
            self.registration.showNotification("Your review has been saved.");
            const tx =db.transaction(storeName,'readwrite');
            const store = tx.objectStore(storeName);
            store.delete('tempReview')
          })
          .then(resolve)
          .catch(err =>{
            self.registration.showNotification("Your review will be sent when a connection is established");
            reject(err);
          });
        })
      })
    }));
  }
});