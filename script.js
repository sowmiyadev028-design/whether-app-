// Weather App JavaScript

const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const loading = document.getElementById('loading');
const error = document.getElementById('error');
const weatherContent = document.getElementById('weatherContent');

// Event listeners
searchBtn.addEventListener('click', searchWeather);
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchWeather();
});

// Initialize app with current location
window.addEventListener('load', () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                fetchWeatherByCoords(latitude, longitude);
            },
            () => {
                // Default to London if geolocation fails
                searchInput.value = 'London';
                searchWeather();
            }
        );
    }
});

async function searchWeather() {
    const city = searchInput.value.trim();
    if (!city) return;

    showLoading();
    try {
        // First, get coordinates for the city
        const geoRes = await fetch(
            `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`
        );
        const geoData = await geoRes.json();

        if (!geoData.results || geoData.results.length === 0) {
            showError('City not found. Please try another search.');
            return;
        }

        const { latitude, longitude, name, country } = geoData.results[0];
        await fetchWeatherByCoords(latitude, longitude, name, country);
    } catch (err) {
        showError('Failed to fetch weather data. Please try again.');
        console.error(err);
    }
}

async function fetchWeatherByCoords(latitude, longitude, cityName = null, country = null) {
    showLoading();
    try {
        const weatherRes = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,pressure_msl,uv_index&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`
        );
        const weatherData = await weatherRes.json();

        if (!cityName) {
            // Get city name from reverse geocoding
            const locRes = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
            );
            const locData = await locRes.json();
            cityName = locData.address?.city || locData.address?.town || 'Unknown Location';
            country = locData.address?.country || '';
        }

        displayWeather(weatherData, cityName, country);
    } catch (err) {
        showError('Failed to fetch weather data. Please try again.');
        console.error(err);
    }
}

function displayWeather(data, cityName, country) {
    const current = data.current;
    const daily = data.daily;
    const timezone = data.timezone;

    // Update city info
    document.getElementById('cityName').textContent = `${cityName}${country ? ', ' + country : ''}`;
    document.getElementById('date').textContent = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    // Update current weather
    const temp = Math.round(current.temperature_2m);
    const feelsLike = Math.round(current.apparent_temperature);
    const description = getWeatherDescription(current.weather_code);
    const weatherIcon = getWeatherIcon(current.weather_code);

    document.getElementById('temp').textContent = temp;
    document.getElementById('description').textContent = description;
    document.getElementById('feelsLike').textContent = `Feels like ${feelsLike}°C`;
    document.getElementById('weatherIcon').src = weatherIcon;

    // Update details
    document.getElementById('humidity').textContent = `${current.relative_humidity_2m}%`;
    document.getElementById('windSpeed').textContent = `${Math.round(current.wind_speed_10m)} km/h`;
    document.getElementById('pressure').textContent = `${Math.round(current.pressure_msl)} hPa`;
    document.getElementById('uvIndex').textContent = current.uv_index.toFixed(1);

    // Update forecast
    displayForecast(daily);

    hideLoading();
    showContent();
}

function displayForecast(daily) {
    const forecastContainer = document.getElementById('forecastContainer');
    forecastContainer.innerHTML = '';

    // Show next 5 days forecast
    for (let i = 1; i < 6; i++) {
        const date = new Date(daily.time[i]);
        const day = date.toLocaleDateString('en-US', { weekday: 'short' });
        const maxTemp = Math.round(daily.temperature_2m_max[i]);
        const minTemp = Math.round(daily.temperature_2m_min[i]);
        const code = daily.weather_code[i];
        const icon = getWeatherIcon(code);

        const forecastCard = document.createElement('div');
        forecastCard.className = 'forecast-card';
        forecastCard.innerHTML = `
            <div class="forecast-day">${day}</div>
            <div class="forecast-icon">
                <img src="${icon}" alt="weather icon">
            </div>
            <div class="forecast-temp">${maxTemp}°</div>
            <div class="forecast-temp-min">${minTemp}°</div>
        `;
        forecastContainer.appendChild(forecastCard);
    }
}

function getWeatherDescription(code) {
    // WMO Weather interpretation codes
    const descriptions = {
        0: 'Clear sky',
        1: 'Mainly clear',
        2: 'Partly cloudy',
        3: 'Overcast',
        45: 'Foggy',
        48: 'Depositing rime fog',
        51: 'Light drizzle',
        53: 'Moderate drizzle',
        55: 'Dense drizzle',
        61: 'Slight rain',
        63: 'Moderate rain',
        65: 'Heavy rain',
        71: 'Slight snow',
        73: 'Moderate snow',
        75: 'Heavy snow',
        80: 'Slight rain showers',
        81: 'Moderate rain showers',
        82: 'Violent rain showers',
        85: 'Slight snow showers',
        86: 'Heavy snow showers',
        95: 'Thunderstorm',
        96: 'Thunderstorm with slight hail',
        99: 'Thunderstorm with heavy hail'
    };
    return descriptions[code] || 'Unknown';
}

function getWeatherIcon(code) {
    // Return emoji URLs for weather codes
    // Using OpenWeatherMap style icons for better visuals
    let iconCode;
    if (code === 0) iconCode = '☀️';
    else if (code === 1 || code === 2) iconCode = '🌤️';
    else if (code === 3) iconCode = '☁️';
    else if (code === 45 || code === 48) iconCode = '🌫️';
    else if (code >= 51 && code <= 55) iconCode = '🌧️';
    else if (code >= 61 && code <= 65) iconCode = '🌧️';
    else if (code >= 71 && code <= 77) iconCode = '❄️';
    else if (code >= 80 && code <= 82) iconCode = '🌦️';
    else if (code >= 85 && code <= 86) iconCode = '🌨️';
    else if (code >= 95 && code <= 99) iconCode = '⛈️';
    else iconCode = '🌤️';

    // Convert emoji to image URL (using Unicode emoji as SVG)
    const encoded = encodeURIComponent(iconCode);
    return `https://cdn.jsdelivr.net/npm/emoji-datasource-apple/img/apple/64/${iconCode.codePointAt(0).toString(16)}.png`;

    // Fallback: Return emoji directly
    return `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y="75" font-size="75">${iconCode}</text></svg>`;
}

function showLoading() {
    loading.classList.remove('hidden');
    error.classList.add('hidden');
    weatherContent.classList.add('hidden');
}

function hideLoading() {
    loading.classList.add('hidden');
}

function showContent() {
    weatherContent.classList.remove('hidden');
}

function showError(message) {
    error.textContent = message;
    error.classList.remove('hidden');
    weatherContent.classList.add('hidden');
    loading.classList.add('hidden');
}
