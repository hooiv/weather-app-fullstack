// backend/controllers/weatherController.js
const axios = require('axios');
const API_KEY = process.env.OPENWEATHERMAP_API_KEY;
const BASE_URL = 'http://api.openweathermap.org/data/2.5';
const GEO_URL = 'http://api.openweathermap.org/geo/1.0';

// Helper to get coordinates (handles city name, zip)
const getCoordinates = async (location) => {
    const trimmedLocation = location.trim();
    console.log(`[getCoordinates] Attempting to geocode trimmed location: ${trimmedLocation}`);
    console.log(`[getCoordinates] Using API Key (first 5 chars): ${API_KEY ? API_KEY.substring(0, 5) : 'MISSING!'}`);

    try {
        let geoResponse = null;
        let resultCoordinates = null;

        const isLikelyPostal = /^\d+([ -]?\d+)*$/.test(trimmedLocation.replace(/[ -]/g, ''));

        if (isLikelyPostal) {
            console.log(`[getCoordinates] Detected as likely zip/postal (${trimmedLocation}). Querying zip endpoint first.`);

            // --- TRY ADDING COUNTRY CODE for specific formats ---
            let zipQuery = trimmedLocation;
            if (/^\d{6}$/.test(trimmedLocation)) { // Looks like Indian Pincode
                zipQuery = `${trimmedLocation},IN`;
                console.log(`[getCoordinates] Assuming IN country code, modifying query to: ${zipQuery}`);
            } else if (/^\d{5}$/.test(trimmedLocation)) { // Looks like US Zip
                zipQuery = `${trimmedLocation},US`;
                 console.log(`[getCoordinates] Assuming US country code, modifying query to: ${zipQuery}`);
            } // Add more country formats here if needed (e.g., Canada)

            try {
                const zipApiResponse = await axios.get(`${GEO_URL}/zip`, {
                    params: { zip: zipQuery, appid: API_KEY } // Use modified zipQuery
                });
                // ... (rest of the zip success/failure logic as before) ...
                 console.log('[getCoordinates] Zip API Response Status:', zipApiResponse.status);
                 console.log('[getCoordinates] Zip API Response Data:', JSON.stringify(zipApiResponse.data, null, 2));

                 if (zipApiResponse.data && zipApiResponse.data.lat) {
                     console.log(`[getCoordinates] Zip API Success: lat=${zipApiResponse.data.lat}, lon=${zipApiResponse.data.lon}, name=${zipApiResponse.data.name}, country=${zipApiResponse.data.country}`);
                     resultCoordinates = {
                         lat: zipApiResponse.data.lat,
                         lon: zipApiResponse.data.lon,
                         name: zipApiResponse.data.name || 'Unknown',
                         country: zipApiResponse.data.country || 'Unknown' // OWM should provide country now
                     };
                 } else {
                     console.log('[getCoordinates] Zip endpoint did not return valid coordinates. Falling back to direct endpoint.');
                 }
            } catch (zipError) {
                 // Handle 404 specifically for zip query failure
                 if (zipError.response && zipError.response.status === 404) {
                      console.warn(`[getCoordinates] Zip endpoint query for '${zipQuery}' returned 404. Falling back to direct endpoint.`);
                 } else {
                      // Log other zip errors more generally
                      console.warn(`[getCoordinates] Zip endpoint query failed (Status: ${zipError.response?.status}). Falling back to direct endpoint.`);
                 }
            }
        }

        // ... (rest of the fallback to /direct endpoint logic as before) ...
         if (resultCoordinates === null) {
             console.log(`[getCoordinates] Querying direct (city name) endpoint for: ${trimmedLocation}.`);
             // ... (direct API call and processing) ...
             const directApiResponse = await axios.get(`${GEO_URL}/direct`, {
                 params: { q: trimmedLocation, limit: 1, appid: API_KEY }
             });
             console.log('[getCoordinates] Direct API Response Status:', directApiResponse.status);
             console.log('[getCoordinates] Direct API Response Data:', JSON.stringify(directApiResponse.data, null, 2));

             if (!directApiResponse.data || directApiResponse.data.length === 0) {
                 console.error('[getCoordinates] No data found in direct API response array after fallback.');
                 throw new Error('Location not found via Zip or Direct search.'); // Updated error
             }
             const { lat, lon, name, country } = directApiResponse.data[0];
             console.log(`[getCoordinates] Direct API Success: lat=${lat}, lon=${lon}, name=${name}, country=${country}`);
             resultCoordinates = { lat, lon, name, country };
         }


        if (resultCoordinates) {
            return resultCoordinates;
        } else {
             console.error('[getCoordinates] Failed to obtain coordinates from either Zip or Direct endpoint.');
             throw new Error('Geocoding failed after trying both methods.');
        }


    } catch (error) {
        // ... (detailed catch block logging remains the same) ...
         console.error("[getCoordinates] CAUGHT ERROR in getCoordinates function:");
        if (error.response) { /* ... */ } else if (error.request) { /* ... */  } else { /* ... */ }
         console.error("  Full Stack Trace:", error.stack);

        // Re-throwing logic (can simplify slightly now)
        if (error.message && error.message.includes('Location not found')) {
             throw new Error('Location not found.'); // Catch specific internal errors
        } else if (error.response && error.response.status === 401) {
            throw new Error('Geocoding failed: Invalid API Key.');
        } else if (error.response && error.response.status === 429) {
            throw new Error('Geocoding failed: API rate limit exceeded.');
         } else if (error.response && (error.response.status === 404 || error.response.status === 400)) {
              throw new Error('Location not found.'); // Catch OWM 404s / 400s
         }
        // Default generic error
        throw new Error('Failed to geocode location.');
    }
};



// ============================================
// Route Handlers (Current Weather and Forecast)
// ============================================

exports.getCurrentWeather = async (req, res, next) => {
    console.log(`[getCurrentWeather] Request Query: ${JSON.stringify(req.query)}`);
    const { location, lat, lon } = req.query;
    let coords;

    try {
        if (lat && lon) {
            console.log(`[getCurrentWeather] Using provided coordinates: lat=${lat}, lon=${lon}`);
            coords = { lat: parseFloat(lat), lon: parseFloat(lon) };
            // Optional: Reverse geocode to get name/country if needed for consistency
            try {
                const reverseGeo = await axios.get(`${GEO_URL}/reverse`, { params: { lat, lon, limit: 1, appid: API_KEY } });
                if (reverseGeo.data && reverseGeo.data.length > 0) {
                    coords.name = reverseGeo.data[0].name;
                    coords.country = reverseGeo.data[0].country;
                    console.log(`[getCurrentWeather] Reverse geocode successful: Name=${coords.name}, Country=${coords.country}`);
                } else {
                    coords.name = "Unknown Location";
                    coords.country = "";
                    console.log(`[getCurrentWeather] Reverse geocode returned no results.`);
                }
            } catch (reverseError) {
                 console.warn(`[getCurrentWeather] Reverse geocode failed (Status: ${reverseError.response?.status}). Using defaults.`);
                 coords.name = "Unknown Location";
                 coords.country = "";
            }
        } else if (location) {
             console.log(`[getCurrentWeather] Calling getCoordinates for location: ${location}`);
            coords = await getCoordinates(location); // Gets {lat, lon, name, country}
             console.log(`[getCurrentWeather] Coordinates received: ${JSON.stringify(coords)}`);
        } else {
             console.error('[getCurrentWeather] Bad Request: Location or coordinates are required.');
            return res.status(400).json({ message: 'Location or coordinates are required.' });
        }

         console.log(`[getCurrentWeather] Fetching weather for lat=${coords.lat}, lon=${coords.lon}`);
        const weatherResponse = await axios.get(`${BASE_URL}/weather`, {
            params: {
                lat: coords.lat,
                lon: coords.lon,
                appid: API_KEY,
                units: 'metric' // Or 'imperial'
            }
        });
         console.log('[getCurrentWeather] Weather API Response Status:', weatherResponse.status);

        // Add resolved location name from geocoding/reverse geocoding back to the response
        const responseData = {
             ...weatherResponse.data,
             resolvedLocationName: coords.name, // Add resolved name
             resolvedCountry: coords.country    // Add resolved country
         };

        console.log('[getCurrentWeather] Sending successful response.');
        res.json(responseData);

    } catch (error) {
         console.error(`[getCurrentWeather] CAUGHT ERROR in route handler: ${error.message}`);
         console.error("Stack:", error.stack);
        next(error); // Pass error to global handler
    }
};

exports.getForecast = async (req, res, next) => {
     console.log(`[getForecast] Request Query: ${JSON.stringify(req.query)}`);
     const { location, lat, lon } = req.query;
     let coords;

     try {
        if (lat && lon) {
             console.log(`[getForecast] Using provided coordinates: lat=${lat}, lon=${lon}`);
            coords = { lat: parseFloat(lat), lon: parseFloat(lon) };
             // Optional: Reverse geocode for name/country
             try {
                 const reverseGeo = await axios.get(`${GEO_URL}/reverse`, { params: { lat, lon, limit: 1, appid: API_KEY } });
                 if (reverseGeo.data && reverseGeo.data.length > 0) {
                     coords.name = reverseGeo.data[0].name;
                     coords.country = reverseGeo.data[0].country;
                     console.log(`[getForecast] Reverse geocode successful: Name=${coords.name}, Country=${coords.country}`);
                 } else {
                     coords.name = "Unknown Location";
                     coords.country = "";
                      console.log(`[getForecast] Reverse geocode returned no results.`);
                 }
            } catch (reverseError) {
                  console.warn(`[getForecast] Reverse geocode failed (Status: ${reverseError.response?.status}). Using defaults.`);
                  coords.name = "Unknown Location";
                  coords.country = "";
            }
        } else if (location) {
             console.log(`[getForecast] Calling getCoordinates for location: ${location}`);
            coords = await getCoordinates(location);
            console.log(`[getForecast] Coordinates received: ${JSON.stringify(coords)}`);
        } else {
             console.error('[getForecast] Bad Request: Location or coordinates are required.');
             return res.status(400).json({ message: 'Location or coordinates are required.' });
        }

        console.log(`[getForecast] Fetching forecast for lat=${coords.lat}, lon=${coords.lon}`);
        // Use 5 day / 3 hour forecast endpoint
         const forecastResponse = await axios.get(`${BASE_URL}/forecast`, {
            params: {
                lat: coords.lat,
                lon: coords.lon,
                appid: API_KEY,
                units: 'metric' // Or 'imperial'
            }
         });
        console.log('[getForecast] Forecast API Response Status:', forecastResponse.status);

        // Process the forecast data to get daily summaries
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
            dailyForecasts[date].humidities.push(item.main.humidity);
            dailyForecasts[date].descriptions.add(item.weather[0].description);
            dailyForecasts[date].icons.add(item.weather[0].icon.substring(0, 2) + 'd'); // Use day icon consistently
        });

        const processedForecast = Object.values(dailyForecasts).map(day => {
            const temp_min = Math.min(...day.temps);
            const temp_max = Math.max(...day.temps);
            const icon = day.icons.values().next().value || '01d'; // Default icon
            const description = Array.from(day.descriptions).join(', ');

            return {
                dt: day.dt,
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
             location: { // Include location details from geocoding/reverse geocoding
                 name: coords.name,
                 country: coords.country,
                 lat: coords.lat,
                 lon: coords.lon
             },
             city: forecastResponse.data.city // Original city info from API if needed
         };

        console.log('[getForecast] Sending successful response.');
        res.json(responseData);

     } catch (error) {
         console.error(`[getForecast] CAUGHT ERROR in route handler: ${error.message}`);
         console.error("Stack:", error.stack);
         next(error);
     }
};