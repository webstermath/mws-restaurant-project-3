 /**
 * Common database helper functions.
 */
 const localDb=idb.open('restaurants',1,function(upgradeDb){
   const restaurantStore=upgradeDb.createObjectStore('restaurants',{
      keyPath: 'id'
    });
    const reviewStore=upgradeDb.createObjectStore('reviews');
    const tempReviewStore=upgradeDb.createObjectStore('tempReviews');
  })

class DBHelper {
  
  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
 
   
  static get DATABASE_URL() {
    const baseUrl='http://localhost:1337/';
    return baseUrl;
 }


  /**
   * Fetch all restaurants.
   */
   static fetchRestaurants(callback,id) {
    localDb.then( db => {
    const storeName = 'restaurants'
    const tx =db.transaction(storeName,'readwrite');
    const store = tx.objectStore(storeName);
    const storeResponse= (typeof id!='undefined') ? store.get(Number(id)) : store.getAll();
    storeResponse.then(response =>{
     
     if(response && (!Array.isArray(response) || response.length)) return callback(null,response);
     let url=DBHelper.DATABASE_URL+'restaurants';
     //if(typeof id!='undefined') url+='/'+id;
     fetch(url)
     .then(response => response.json())
     .then(response => {
        const restaurantStore=db.transaction(storeName,'readwrite')
        .objectStore(storeName);
        response.forEach(item => restaurantStore.put(item));
      if(typeof id!='undefined') return response.find(restaurant => restaurant.id==id)
      return response;
    })
    .then(response => callback(null,response))
    .catch(callback)
      
    })

    })
  }

   /**
   * Fetch reviews by restaurant id.
   */
    static fetchReviewsByRestaurantId(id, callback) {
    localDb.then( db => {
      const storeName = 'reviews'
      let url=DBHelper.DATABASE_URL+`reviews/?restaurant_id=${id}`;
       fetch(url)
       .then(response => response.json())
       .then(response => {
          db.transaction(storeName,'readwrite')
          .objectStore(storeName)
          .put(response,Number(id))
        return response;
      })
      .then(response => callback(null,response))
      .catch(error =>{
        console.warn(error)
        
        const tx =db.transaction(storeName,'readwrite');
        const store = tx.objectStore(storeName);
        store.get(Number(id)).then(response =>{
          if(response) return callback(null,response);
        })
        .catch(callback)
      })
    })

  }
  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id, callback) {
    // fetch all restaurants with proper error handling.
    DBHelper.fetchRestaurants((error, restaurant) => {
      if (error) {
        callback(error, null);
      } else {
        if (restaurant) { // Got the restaurant
          callback(null, restaurant);
        } else { // Restaurant does not exist in the database
          callback('Restaurant does not exist', null);
        }
      }
    },id);
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(r => r.neighborhood == neighborhood);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        let results = restaurants
        if (cuisine != 'all') { // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != 'all') { // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }
        callback(null, results);
      }
    });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i)
        callback(null, uniqueNeighborhoods);
      }
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i)
        callback(null, uniqueCuisines);
      }
    });
  }
  /**
   * Update favorite status for restaurant.
   */
  static updateFavorite(id,status){
    DBHelper.fetchRestaurantById(id, (error,restaurant) =>{
      if(error) return;
      restaurant.is_favorite=status;
      localDb.then( db => {
        const storeName = 'restaurants'
        const tx =db.transaction(storeName,'readwrite');
        const store = tx.objectStore(storeName);
        store.put(restaurant).then(id => {
          fetch(DBHelper.DATABASE_URL+`restaurants/1/?is_favorite=${status}`,{method: 'PUT'});
        });
        return restaurant;
      });
    });
  }
  /**
   * Add Review.
   */
  static addReview(review){
    return fetch(DBHelper.DATABASE_URL+'reviews/',{
        method: 'POST',
        body: JSON.stringify(review)
      })
      .catch(error =>{
        //alert('The Review Failed to send. It will be sent again when there is a connection.')
        localDb.then(db =>{
          const storeName = 'tempReviews'
          const tx =db.transaction(storeName,'readwrite');
          const store = tx.objectStore(storeName);
          store.put(review,'tempReview').then(response =>{
            navigator.serviceWorker.ready.then(function(reg) {
              return reg.sync.register('addReview');
            });
          })
        });
      });
  }
  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant) {
    return (`/img/${restaurant.photograph || 'alt'}.webp`);
  }

  /**
   * Map marker for a restaurant.
   */
   static mapMarkerForRestaurant(restaurant, map) {
    // https://leafletjs.com/reference-1.3.0.html#marker
    const marker = new L.marker([restaurant.latlng.lat, restaurant.latlng.lng],
      {title: restaurant.name,
      alt: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant)
      })
      marker.addTo(newMap);
    return marker;
  }

}

