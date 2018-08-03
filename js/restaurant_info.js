let restaurant;
var newMap;

/**
 * Initialize map as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {
  initMap();
});

/**
 * Initialize leaflet map
 */
initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.newMap = L.map('map', {
        center: [restaurant.latlng.lat, restaurant.latlng.lng],
        zoom: 16,
        scrollWheelZoom: false
      });
      L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.jpg70?access_token={mapboxToken}', {
        mapboxToken: 'pk.eyJ1Ijoid2Vic3Rlcm1hdGgiLCJhIjoiY2ppcDYwOHdwMDFrcDN2bW8yd2Z4bXByeCJ9.0wNXAuu5gKduD312MFkFDA',
        maxZoom: 18,
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
          '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
          'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        id: 'mapbox.streets'
      }).addTo(newMap);
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.newMap);
    }
  });
}
 

/**
 * Get current restaurant from page URL.
 */
fetchRestaurantFromURL = (callback) => {
  if (self.restaurant) { // restaurant already fetched!
    callback(null, self.restaurant)
    return;
  }
  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    error = 'No restaurant id in URL'
    callback(error, null);
  } else {
    DBHelper.fetchRestaurantById(id, (error, restaurant) => {
      self.restaurant = restaurant;
      if (!restaurant) {
        console.error(error);
        return;
      }
      fillRestaurantHTML();
       // fill reviews
      fetchReviewsFromURL(fillReviewsHTML);
      callback(null, restaurant)
    });
  }
}
/**
 * Get current reviews from page URL.
 */
fetchReviewsFromURL = (callback,force=false) => {
  if (self.restaurant.reviews && !force) { // restaurant already fetched!
    return callback();
  }
  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    error = 'No restaurant id in URL'
    console.error(error);
    //callback(error, null);
  } else {
    DBHelper.fetchReviewsByRestaurantId(id, (error, reviews) => {
      if(error) return;
      self.restaurant.reviews = reviews;
       // fill reviews
      callback(reviews);
    });
  }
}


/**
 * Create restaurant HTML and add it to the webpage
 */
fillRestaurantHTML = (restaurant = self.restaurant) => {
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  const image = document.getElementById('restaurant-img');
  image.className = 'restaurant-img';
  image.alt = `image of ${restaurant.name} restaurant`;
  image.src = DBHelper.imageUrlForRestaurant(restaurant);

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
 
}

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');
  hours.setAttribute('tabindex', 0);
  for (let key in operatingHours) {
    const row = document.createElement('tr');

    const day = document.createElement('td');
    day.innerHTML = key;
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHours[key];
    row.appendChild(time);

    hours.appendChild(row);
  }
}

/**
 * Create all reviews HTML and add them to the webpage.
 */
fillReviewsHTML = (reviews = self.restaurant.reviews,restaurantId = self.restaurant.id) => {
  const container = document.getElementById('reviews-container');
  container.innerHTML='';
  const title = document.createElement('h3');
  title.innerHTML = 'Reviews';
  container.appendChild(title);
  
  container.append(createReviewCreator(restaurantId))
  
  if (!reviews) {
    const noReviews = document.createElement('p');
    noReviews.innerHTML = 'No reviews yet!';
    container.appendChild(noReviews);
    return;
  }
  const ul=document.createElement('ul')
  ul.id='reviews-list'
  
  reviews.forEach(review => {
    ul.appendChild(createReviewHTML(review));
  });
  container.append(ul);
}

/**
 * Create review writer form
 */
createReviewCreator = (id) => {
  
  const container=document.createElement('div');
  container.id='review_creator'
  
  const formButton=document.createElement('button');
  formButton.id='review_button'
  formButton.textContent='Write Review'
  container.append(formButton);
  
  const form = document.createElement('div');
  form.id='review_form'
  form.classList.add('hide_form')
  formButton.addEventListener('click',e => {

    form.classList.toggle('hide_form')
    form.style.display= form.classList.contains('hide_form')? 'none' : 'flex';
    formButton.textContent=formButton.textContent.includes('Write') ? 'Hide Review' : 'Write Review';
  });
  
  
  const nameInput= document.createElement('input');
  form.append(wrapInLabel(nameInput,'Name: '));
  
  const ratingInput= document.createElement('select');
  const ratingOptions=[1,2,3,4,5].map(n =>{
    const ratingOption=document.createElement('option');
    ratingOption.textContent=n;
    return ratingOption;
  });
  ratingInput.append(...ratingOptions)
  form.append(wrapInLabel(ratingInput,'Rating: '));
  
  const reviewInput= document.createElement('textarea');
  reviewInput.rows=8;
  form.append(wrapInLabel(reviewInput,'Review: '));
  
  const reviewSubmit= document.createElement('button');
  reviewSubmit.id='review_submit'
  reviewSubmit.textContent='Submit'
  reviewSubmit.addEventListener('click',e => {
    const result={
      restaurant_id: id,
      name: nameInput.value,
      rating: ratingInput.value,
      comments: reviewInput.value
    }
    if(!result.name){
      alert('The name is missing from the form')
      return;
    }
    DBHelper.addReview(result)
    .then(response =>{
      fetchReviewsFromURL(fillReviewsHTML,true)
      })
    
    
    
    
  })
  form.append(reviewSubmit);
  
  container.append(form);
  
  return container
}
/**
 * Wrap Input in Label
 */
wrapInLabel = (input,text) =>{
  const label=document.createElement('label');
  const span=document.createElement('span');
  span.textContent=text;
  label.append(span);
  label.append(input);
  return label;
}
/**
 * Create review HTML and add it to the webpage.
 */
createReviewHTML = (review) => {
  const li = document.createElement('li');
  li.setAttribute('tabindex', 0);
  const name = document.createElement('p');
  name.innerHTML = review.name;
  li.appendChild(name);

  const date = document.createElement('p');
  date.innerHTML = (new Date(review.createdAt)).toDateString();
  li.appendChild(date);

  const rating = document.createElement('p');
  rating.innerHTML = `Rating: ${review.rating}`;
  li.appendChild(rating);

  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  li.appendChild(comments);

  return li;
}


/**
 * Add restaurant name to the breadcrumb navigation menu
 */
fillBreadcrumb = (restaurant=self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  li.innerHTML = restaurant.name;
  breadcrumb.appendChild(li);
}

/**
 * Get a parameter by name from page URL.
 */
getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}
