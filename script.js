// script.js (module)
const API_KEY = '7a4bee2195msh942db397a84fb3ap14f92ajsn0e612748c38b';
const API_HOST = 'open-weather13.p.rapidapi.com';

// DOM Elements
const cityInput = document.getElementById('city');
const searchBtn = document.getElementById('searchBtn');
const statusEl = document.getElementById('status');
const weatherCard = document.getElementById('weather-card');

const locationEl = document.getElementById('location');
const dateTimeEl = document.getElementById('date-time');
const conditionEl = document.getElementById('condition');
const mainIconEl = document.getElementById('main-icon');

const tempEl = document.getElementById('temp');
const feelsEl = document.getElementById('feels');
const humidityEl = document.getElementById('humidity');
const windEl = document.getElementById('wind');

// API Call
async function fetchWeather(city) {
  const url = `https://${API_HOST}/city?city=${encodeURIComponent(city)}&lang=EN&units=metric`;

  const options = {
    method: 'GET',
    headers: {
      'x-rapidapi-key': API_KEY,
      'x-rapidapi-host': API_HOST
    }
  };

  setStatus('Searching galaxy...');
  try {
    const res = await fetch(url, options);
    if (!res.ok) {
      throw new Error('City not found in sector.');
    }
    const data = await res.json();
    setStatus('');
    return data;
  } catch (err) {
    setStatus(err.message);
    throw err;
  }
}

// Render UI
function render(data) {
  if (!data) return;

  weatherCard.classList.remove('hidden');

  // 1. Location & Time
  const name = data.name || data.city || (data.location && data.location.name) || 'Unknown Location';
  // const country = (data.sys && data.sys.country) || data.country || '';
  locationEl.textContent = name;
  dateTimeEl.textContent = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  });

  // 2. Weather Condition & Icon
  const weatherArr = data.weather || (data.current && data.current.weather) || [];
  const weather = weatherArr[0] || {};
  const description = weather.description || 'Clear Sky';
  const mainCondition = (weather.main || '').toLowerCase();
  const descLower = description.toLowerCase();

  const iconCode = weather.icon;

  conditionEl.textContent = description;

  if (iconCode) {
    mainIconEl.src = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
    mainIconEl.classList.remove('hidden');
  } else {
    mainIconEl.classList.add('hidden');
  }

  // 3. Stats
  let temp = fallbackGet(data, ['main.temp', 'temp', 'current.temp']);
  let feels = fallbackGet(data, ['main.feels_like', 'feels_like', 'current.feels_like']);
  const humidity = fallbackGet(data, ['main.humidity', 'humidity']);
  const wind = fallbackGet(data, ['wind.speed', 'wind']);

  // Convert if Kelvin
  const tempC = toCelsius(temp);
  const feelsC = toCelsius(feels);

  tempEl.textContent = (tempC !== null) ? `${Math.round(tempC)}°` : '--';
  feelsEl.textContent = (feelsC !== null) ? `${Math.round(feelsC)}°` : '--';
  humidityEl.textContent = (humidity != null) ? `${humidity}%` : '--';
  windEl.textContent = (wind != null) ? `${wind} m/s` : '--';

  // 4. Update Map View (Sync with Search)
  if (data.coord && data.coord.lat && data.coord.lon) {
    const { lat, lon } = data.coord;
    map.flyTo([lat, lon], 12, {
      duration: 1.5
    }); // Smooth fly to city

    // Update Marker
    if (currentMarker) map.removeLayer(currentMarker);
    currentMarker = L.marker([lat, lon]).addTo(map);

    // Bind popup for consistency
    const temp = Math.round(toCelsius(data.main.temp));
    const weatherDesc = data.weather[0].description;
    currentMarker.bindPopup(`
      <div style="text-align: center; font-family: 'Outfit', sans-serif; color: #1e293b; padding: 5px;">
        <strong style="font-size: 1.1em; display:block; margin-bottom:4px;">${name}</strong>
        <span style="font-size: 1.5em; font-weight: 700; color: #0284c7;">${temp}°C</span><br>
        <span style="text-transform: capitalize; color: #64748b; font-size: 0.9em;">${weatherDesc}</span>
      </div>
    `).openPopup();
  }
}

function toCelsius(val) {
  if (typeof val !== 'number') return null;
  if (val > 200) return val - 273.15; // Kelvin to C
  // Heuristic: If val > 50, assume Fahrenheit (since 50C is ~122F, extremely hot)
  if (val > 50) return (val - 32) * (5 / 9);
  return val;
}

function setStatus(msg) {
  if (statusEl) statusEl.textContent = msg;
}

function fallbackGet(obj, paths) {
  for (const path of paths) {
    const parts = path.split('.');
    let cur = obj;
    let ok = true;
    for (const p of parts) {
      if (cur && (p in cur)) cur = cur[p];
      else { ok = false; break; }
    }
    if (ok && cur !== undefined) return cur;
  }
  return undefined;
}

// Logic
async function doSearch() {
  const city = cityInput.value.trim();
  if (!city) return;
  weatherCard.classList.add('hidden'); // Hide old result during search for effect
  try {
    const data = await fetchWeather(city);
    // Tiny delay for animation effect
    setTimeout(() => render(data), 300);
  } catch (err) {
    console.error(err);
  }
}

searchBtn.addEventListener('click', doSearch);
cityInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') doSearch();
});

// --- Leaflet Map Integration ---
const map = L.map('map', {
  zoomControl: false,
  attributionControl: false,
  minZoom: 4, // Prevents map from becoming too small
  maxBounds: [[-90, -180], [90, 180]], // Restricts panning to the world
  maxBoundsViscosity: 1.0 // Sticky bounds
}).setView([20.5937, 78.9629], 5); // Center on India

// Satellite Style Tile Layer (Esri World Imagery)
L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
  attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
  maxZoom: 19,
  noWrap: true // Prevents world from repeating
}).addTo(map);

// Add Labels Overlay (World Boundaries and Places)
L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
  maxZoom: 19,
  noWrap: true
}).addTo(map);

let currentMarker = null;

map.on('click', function (e) {
  const { lat, lng } = e.latlng;

  // Remove old marker
  if (currentMarker) {
    map.removeLayer(currentMarker);
  }

  // Add new marker
  currentMarker = L.marker([lat, lng]).addTo(map);

  // Show "Loading" Popup immediately
  currentMarker.bindPopup(`
      <div style="text-align: center; color: #333; font-family: 'Outfit', sans-serif;">
        <i class="fas fa-spinner fa-spin" style="color: #0284c7; font-size: 1.2em;"></i><br>
        <span style="font-size: 0.9em; color: #64748b;">Identifying location...</span>
      </div>
  `).openPopup();

  // Fetch weather for these coords
  fetchWeatherByCoords(lat, lng, currentMarker);
});

async function fetchWeatherByCoords(lat, lon, marker) {
  // Use fivedaysforcast endpoint for lat/lon support as it is more reliable for coords in this API
  const url = `https://${API_HOST}/fivedaysforcast?latitude=${lat}&longitude=${lon}&lang=EN&units=metric`;

  const options = {
    method: 'GET',
    headers: {
      'x-rapidapi-key': API_KEY,
      'x-rapidapi-host': API_HOST
    }
  };

  try {
    const res = await fetch(url, options);

    // Handle status codes
    if (res.status === 429) {
      throw new Error('API Limit Reached');
    }
    if (!res.ok) {
      throw new Error('Location not found');
    }

    const data = await res.json();

    // Validate data exists
    if (data.list && data.list.length > 0 && data.city) {
      const current = data.list[0];

      // Construct compatible weather object
      const weatherObj = {
        name: data.city.name || "Unknown Location",
        main: current.main,
        weather: current.weather,
        wind: current.wind,
        sys: { country: data.city.country || '' },
        dt: current.dt
      };

      // Update Dashboard
      render(weatherObj);

      // Update Popup with Success Data
      if (marker) {
        // Fix: Use toCelsius to handle potential Kelvin response from API
        const tempVal = toCelsius(current.main.temp);
        const temp = tempVal !== null ? Math.round(tempVal) : '--';

        const name = weatherObj.name;
        const desc = current.weather[0].description;
        const content = `
            <div style="text-align: center; font-family: 'Outfit', sans-serif; color: #1e293b; padding: 5px;">
                <strong style="font-size: 1.1em; display:block; margin-bottom:4px;">${name}</strong>
                <span style="font-size: 1.5em; font-weight: 700; color: #0284c7;">${temp}°C</span><br>
                <span style="text-transform: capitalize; color: #64748b; font-size: 0.9em;">${desc}</span>
            </div>
            `;
        marker.setPopupContent(content);
      }
    } else {
      throw new Error('No city data found');
    }

  } catch (error) {
    console.warn("Map Click Error:", error);

    // Differentiate between API Limit and Geolocation issues
    let title = "Location Not Found";
    let sub = "(Ocean or uninhabited)";

    if (error.message.includes('API Limit')) {
      title = "API Limit Reached";
      sub = "Please wait a moment...";
    }

    // Update Popup
    if (marker) {
      marker.setPopupContent(`
          <div style="text-align: center; font-family: 'Outfit', sans-serif; color: #ef4444; padding: 5px;">
            <i class="fas fa-exclamation-circle" style="font-size: 1.2em; margin-bottom: 5px;"></i><br>
            <strong>${title}</strong><br>
            <span style="font-size: 0.85em; color: #64748b;">${sub}</span>
          </div>
        `);
    }
  }
}

