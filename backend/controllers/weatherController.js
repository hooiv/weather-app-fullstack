// backend/controllers/weatherController.js
const axios = require('axios');
const API_KEY = process.env.OPENWEATHERMAP_API_KEY;
const BASE_URL = 'http://api.openweathermap.org/data/2.5';
const GEO_URL = 'http://api.openweathermap.org/geo/1.0';

// Helper to get coordinates (handles city name, zip)
const getCoordinates = async (location) => {
    // --- ADD LOGGING ---
    console.log(`[getCoordinates] Attempting to geocode location: ${location}`);
    console.log(`[getCoordinates] Using API Key (first 5 chars): ${API_KEY ? API_KEY.substring(0, 5) : 'MISSING!'}`);
    // --- END LOGGING ---

    try {
        let geoResponse;
        // Basic check if it might be a zip code (US/simple format)
        if (/^\d{5}(-\d{4})?$/.test(location) || /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/.test(location)) { // Simple US/Canada zip/postal
            // --- ADD LOGGING ---
            console.log(`[getCoordinates] Detected as zip/postal. Querying zip endpoint.`);
            // --- END LOGGING ---
            geoResponse = await axios.get(`${GEO_URL}/zip`, {
                params: { zip: location, appid: API_KEY }
            });
            // --- ADD LOGGING ---
            console.log('[getCoordinates] Zip API Response Status:', geoResponse.status);
            console.log('[getCoordinates] Zip API Response Data:', JSON.stringify(geoResponse.data, null, 2)); // Log the actual data
            // --- END LOGGING ---

            // OWM zip often lacks country, add it if needed based on format
            if (!geoResponse.data.country && /^\d{5}/.test(location)) geoResponse.data.country = 'US';
            if (!geoResponse.data.country && /^[A-Za-z]\d[A-Za-z]/.test(location)) geoResponse.data.country = 'CA'; // Assume Canada
        } else {
            // Assume city name
            // --- ADD LOGGING ---
            console.log(`[getCoordinates] Detected as city name. Querying direct endpoint.`);
            // --- END LOGGING ---
            geoResponse = await axios.get(`${GEO_URL}/direct`, {
                params: { q: location, limit: 1, appid: API_KEY }
            });
             // --- ADD LOGGING ---
             console.log('[getCoordinates] Direct API Response Status:', geoResponse.status);
             console.log('[getCoordinates] Direct API Response Data:', JSON.stringify(geoResponse.data, null, 2)); // Log the actual data
             // --- END LOGGING ---

            // Use the first result if available
            if (!geoResponse.data || geoResponse.data.length === 0) {
                 // --- ADD LOGGING ---
                 console.error('[getCoordinates] No data found in direct API response array.');
                 // --- END LOGGING ---
                 throw new Error('Location not found.');
            }
            // Extract data from the first element of the array
            const { lat, lon, name, country } = geoResponse.data[0];
            // --- ADD LOGGING ---
            console.log(`[getCoordinates] Direct API Success: lat=${lat}, lon=${lon}, name=${name}, country=${country}`);
            // --- END LOGGING ---
            return { lat, lon, name, country }; // Return full object
        }

        // For zip code response
        if (!geoResponse.data || !geoResponse.data.lat) {
            // --- ADD LOGGING ---
            console.error('[getCoordinates] Latitude not found in zip API response data.');
            // --- END LOGGING ---
            throw new Error('Location not found from zip/postal code.');
        }
         // Zip response structure is different
         // --- ADD LOGGING ---
         console.log(`[getCoordinates] Zip API Success: lat=${geoResponse.data.lat}, lon=${geoResponse.data.lon}, name=${geoResponse.data.name}, country=${geoResponse.data.country}`);
         // --- END LOGGING ---
         return {
            lat: geoResponse.data.lat,
            lon: geoResponse.data.lon,
            name: geoResponse.data.name, // City name from zip
            country: geoResponse.data.country || 'Unknown' // Country might be missing
         };

    } catch (error) {
        // --- MODIFY LOGGING ---
        console.error("[getCoordinates] CAUGHT ERROR:");
        // Log different parts of the error object if they exist
        if (error.response) {
            // Error from Axios request (e.g., 401, 404, 429 from OWM)
            console.error("  Error Status:", error.response.status);
            console.error("  Error Data:", JSON.stringify(error.response.data, null, 2));
            console.error("  Error Headers:", JSON.stringify(error.response.headers, null, 2));
        } else if (error.request) {
            // Request was made but no response received (network issue)
            console.error("  Error Request:", error.request);
        } else {
            // Error setting up the request or other JS error
            console.error("  Error Message:", error.message);
        }
        console.error("  Full Error Stack:", error.stack); // Log the full stack trace
        // --- END LOGGING ---

        // Re-throw a generic error or a more specific one based on the catch block
        if (error.response && (error.response.status === 404 || error.response.status === 400)) { // 400 can mean invalid zip format
            throw new Error('Location not found.');
        } else if (error.response && error.response.status === 401) {
            throw new Error('Geocoding failed: Invalid API Key.'); // More specific
        } else if (error.response && error.response.status === 429) {
            throw new Error('Geocoding failed: API rate limit exceeded.'); // More specific
        }
        // Default generic error
        throw new Error('Failed to geocode location.');
    }
};


exports.getCurrentWeather = async (req, res, next) => {
    // --- ADD LOGGING ---
    console.log(`[getCurrentWeather] Request Query: ${JSON.stringify(req.query)}`);
    // --- END LOGGING ---
    const { location, lat, lon } = req.query;
    let coords;

    try {
        if (lat && lon) {
            // --- ADD LOGGING ---
            console.log(`[getCurrentWeather] Using provided coordinates: lat=${lat}, lon=${lon}`);
            // --- END LOGGING ---
            coords = { lat: parseFloat(lat), lon: parseFloat(lon) };
             // Optional: Reverse geocode to get name/country if needed for consistency
             const reverseGeo = await axios.get(`${GEO_URL}/reverse`, { params: { lat, lon, limit: 1, appid: API_KEY } });
             if (reverseGeo.data && reverseGeo.data.length > 0) {
                 coords.name = reverseGeo.data[0].name;
                 coords.country = reverseGeo.data[0].country;
             } else {
                 coords.name = "Unknown Location";
                 coords.country = "";
             }
        } else if (location) {
             // --- ADD LOGGING ---
             console.log(`[getCurrentWeather] Calling getCoordinates for location: ${location}`);
             // --- END LOGGING ---
            coords = await getCoordinates(location); // Gets {lat, lon, name, country}
             // --- ADD LOGGING ---
             console.log(`[getCurrentWeather] Coordinates received: ${JSON.stringify(coords)}`);
             // --- END LOGGING ---
        } else {
             // --- ADD LOGGING ---
             console.error('[getCurrentWeather] Bad Request: Location or coordinates are required.');
             // --- END LOGGING ---
            return res.status(400).json({ message: 'Location or coordinates are required.' });
        }

         // --- ADD LOGGING ---
         console.log(`[getCurrentWeather] Fetching weather for lat=${coords.lat}, lon=${coords.lon}`);
         // --- END LOGGING ---
        const weatherResponse = await axios.get(`${BASE_URL}/weather`, {
            params: {
                lat: coords.lat,
                lon: coords.lon,
                appid: API_KEY,
                units: 'metric' // Or 'imperial'
            }
        });
         // --- ADD LOGGING ---
         console.log('[getCurrentWeather] Weather API Response Status:', weatherResponse.status);
         // --- END LOGGING ---

        // Add resolved location name from geocoding back to the response
        const responseData = {
             ...weatherResponse.data,
             resolvedLocationName: coords.name, // Add resolved name
             resolvedCountry: coords.country    // Add resolved country
         };

        // --- ADD LOGGING ---
        console.log('[getCurrentWeather] Sending successful response.');
        // --- END LOGGING ---
        res.json(responseData);

    } catch (error) {
         // --- ADD LOGGING ---
         console.error(`[getCurrentWeather] CAUGHT ERROR in route handler: ${error.message}`);
         // Add stack trace logging here too if needed
         console.error(error.stack);
         // --- END LOGGING ---
        next(error); // Pass error to global handler
    }
};

exports.getForecast = async (req, res, next) => {
     // --- ADD LOGGING ---
     console.log(`[getForecast] Request Query: ${JSON.stringify(req.query)}`);
     // --- END LOGGING ---
     const { location, lat, lon } = req.query;
     let coords;

     try {
        if (lat && lon) {
             // --- ADD LOGGING ---
             console.log(`[getForecast] Using provided coordinates: lat=${lat}, lon=${lon}`);
             // --- END LOGGING ---
            coords = { lat: parseFloat(lat), lon: parseFloat(lon) };
             // Optional: Reverse geocode for name/country
             const reverseGeo = await axios.get(`${GEO_URL}/reverse`, { params: { lat, lon, limit: 1, appid: API_KEY } });
             if (reverseGeo.data && reverseGeo.data.length > 0) {
                 coords.name = reverseGeo.data[0].name;
                 coords.country = reverseGeo.data[0].country;
             } else {
                 coords.name = "Unknown Location";
                 coords.country = "";
             }
        } else if (location) {
             // --- ADD LOGGING ---
             console.log(`[getForecast] Calling getCoordinates for location: ${location}`);
             // --- END LOGGING ---
            coords = await getCoordinates(location);
            // --- ADD LOGGING ---
            console.log(`[getForecast] Coordinates received: ${JSON.stringify(coords)}`);
            // --- END LOGGING ---
        } else {
             // --- ADD LOGGING ---
             console.error('[getForecast] Bad Request: Location or coordinates are required.');
             // --- END LOGGING ---
             return res.status(400).json({ message: 'Location or coordinates are required.' });
        }

        // --- ADD LOGGING ---
        console.log(`[getForecast] Fetching forecast for lat=${coords.lat}, lon=${coords.lon}`);
        // --- END LOGGING ---
        // Use 5 day / 3 hour forecast endpoint
         const forecastResponse = await axios.get(`${BASE_URL}/forecast`, {
            params: {
                lat: coords.lat,
                lon: coords.lon,
                appid: API_KEY,
                units: 'metric' // Or 'imperial'
            }
         });
        // --- ADD LOGGING ---
        console.log('[getForecast] Forecast API Response Status:', forecastResponse.status);
        // --- END LOGGING ---

        // Process the forecast data to get daily summaries
        // ... (processing logic remains the same) ...
        const dailyForecasts = {};
        forecastResponse.data.list.forEach(item => {
            const date = new Date(item.dt * 1000).toISOString().split('T')[0]; // Get YYYY-MM-DD
            if (!dailyForecasts[date]) {
                dailyForecasts[date] = {
                    date: date,
                    temps: [],
                    humidities: [],
                    descriptions: new Set(),
                    icons: new Set(),
                    dt: item.dt // Store first timestamp for the day
                };
            }
            dailyForecasts[date].temps.push(item.main.temp);
            dailyForecasts[date].humidities.push(item.main.humidity); // Example: Store humidity too
            dailyForecasts[date].descriptions.add(item.weather[0].description);
            dailyForecasts[date].icons.add(item.weather[0].icon.substring(0, 2) + 'd'); // Use day icon consistently
        });

        const processedForecast = Object.values(dailyForecasts).map(day => {
            // Find min/max temp for the day
            const temp_min = Math.min(...day.temps);
            const temp_max = Math.max(...day.temps);
            // Choose the most frequent or representative icon/description (simple: first icon)
            const icon = day.icons.values().next().value || '01d'; // Default icon
             // Aggregate descriptions (simple: join unique ones)
            const description = Array.from(day.descriptions).join(', ');

            return {
                dt: day.dt, // Timestamp for sorting/reference
                date: day.date,
                temp_min,
                temp_max,
                description,
                icon
            };
        }).slice(0, 5); // Ensure only 5 days


         // Add resolved location name back to the response
         const responseData = {
             forecast: processedForecast,
             location: { // Include location details from geocoding
                 name: coords.name,
                 country: coords.country,
                 lat: coords.lat,
                 lon: coords.lon
             },
             city: forecastResponse.data.city // Original city info from API if needed
         };

        // --- ADD LOGGING ---
        console.log('[getForecast] Sending successful response.');
        // --- END LOGGING ---
        res.json(responseData);

     } catch (error) {
         // --- ADD LOGGING ---
         console.error(`[getForecast] CAUGHT ERROR in route handler: ${error.message}`);
         // Add stack trace logging here too if needed
         console.error(error.stack);
         // --- END LOGGING ---
         next(error);
     }
};