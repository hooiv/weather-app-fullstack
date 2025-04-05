// backend/controllers/weatherController.js
const axios = require('axios');
const API_KEY = process.env.OPENWEATHERMAP_API_KEY;
const BASE_URL = 'http://api.openweathermap.org/data/2.5';
const GEO_URL = 'http://api.openweathermap.org/geo/1.0';

// Helper to get coordinates (handles city name, zip)
const getCoordinates = async (location) => {
    const trimmedLocation = location.trim(); // Trim whitespace once

    // --- ADD LOGGING ---
    console.log(`[getCoordinates] Attempting to geocode trimmed location: ${trimmedLocation}`);
    console.log(`[getCoordinates] Using API Key (first 5 chars): ${API_KEY ? API_KEY.substring(0, 5) : 'MISSING!'}`);
    // --- END LOGGING ---

    try {
        let geoResponse = null; // Initialize geoResponse
        let resultCoordinates = null; // Store the final coords here

        // --- MODIFIED CONDITION ---
        // Check if it's likely a postal code: mostly digits, maybe hyphen/space
        const isLikelyPostal = /^\d+([ -]?\d+)*$/.test(trimmedLocation.replace(/[ -]/g, '')); // Checks if it contains only digits after removing space/hyphen

        // --- NEW LOGIC: Try ZIP first if it looks like a postal code ---
        if (isLikelyPostal) {
            console.log(`[getCoordinates] Detected as likely zip/postal (${trimmedLocation}). Querying zip endpoint first.`);
            try {
                const zipApiResponse = await axios.get(`${GEO_URL}/zip`, {
                    params: { zip: trimmedLocation, appid: API_KEY }
                });
                console.log('[getCoordinates] Zip API Response Status:', zipApiResponse.status);
                console.log('[getCoordinates] Zip API Response Data:', JSON.stringify(zipApiResponse.data, null, 2));

                // Check if zip search actually found something useful
                if (zipApiResponse.data && zipApiResponse.data.lat) {
                    console.log(`[getCoordinates] Zip API Success: lat=${zipApiResponse.data.lat}, lon=${zipApiResponse.data.lon}, name=${zipApiResponse.data.name}, country=${zipApiResponse.data.country}`);
                    // Add country if missing based on format (optional enhancement)
                    let countryCode = zipApiResponse.data.country;
                    if (!countryCode && /^\d{5}$/.test(trimmedLocation)) countryCode = 'US'; // Assume US for 5 digits
                    if (!countryCode && /^\d{6}$/.test(trimmedLocation)) countryCode = 'IN'; // Assume India for 6 digits
                    // Add more country assumptions based on format if needed

                    // Store the result from ZIP and exit the try block for this function
                    resultCoordinates = {
                        lat: zipApiResponse.data.lat,
                        lon: zipApiResponse.data.lon,
                        name: zipApiResponse.data.name || 'Unknown', // Use name from zip result
                        country: countryCode || 'Unknown'
                    };
                } else {
                    console.log('[getCoordinates] Zip endpoint did not return valid coordinates. Falling back to direct endpoint.');
                    // If zip fails, 'resultCoordinates' remains null, and we'll try the direct endpoint below
                }
            } catch (zipError) {
                console.warn(`[getCoordinates] Zip endpoint query failed (Status: ${zipError.response?.status}). Falling back to direct endpoint.`);
                // Log the zip error but continue to try direct endpoint
                // Avoid throwing the main error yet
            }
        }

        // --- Fallback or primary attempt for non-postal input ---
        // This part runs if it wasn't likely postal OR if the zip attempt failed to find coordinates
        if (resultCoordinates === null) {
            console.log(`[getCoordinates] Querying direct (city name) endpoint for: ${trimmedLocation}.`);
            const directApiResponse = await axios.get(`${GEO_URL}/direct`, {
                params: { q: trimmedLocation, limit: 1, appid: API_KEY }
            });
            console.log('[getCoordinates] Direct API Response Status:', directApiResponse.status);
            console.log('[getCoordinates] Direct API Response Data:', JSON.stringify(directApiResponse.data, null, 2));

            if (!directApiResponse.data || directApiResponse.data.length === 0) {
                console.error('[getCoordinates] No data found in direct API response array.');
                throw new Error('Location not found via direct search.'); // More specific error
            }
            const { lat, lon, name, country } = directApiResponse.data[0];
            console.log(`[getCoordinates] Direct API Success: lat=${lat}, lon=${lon}, name=${name}, country=${country}`);

            // Store the result from Direct API
            resultCoordinates = { lat, lon, name, country };
        }

        // If we successfully got coordinates from either zip or direct, return them
        if (resultCoordinates) {
            return resultCoordinates;
        } else {
            // This should theoretically not be reached if logic is sound, but acts as a safety net
             console.error('[getCoordinates] Failed to obtain coordinates from either Zip or Direct endpoint.');
             throw new Error('Geocoding failed after trying both methods.');
        }


    } catch (error) {
        // --- DETAILED LOGGING IN CATCH ---
        console.error("[getCoordinates] CAUGHT ERROR in getCoordinates function:");
        if (error.response) {
            // Error from Axios request (e.g., 401, 404, 429 from OWM)
            console.error("  Error Type: API Response Error");
            console.error("  Status:", error.response.status);
            console.error("  Data:", JSON.stringify(error.response.data, null, 2));
        } else if (error.request) {
            // Request was made but no response received (network issue)
            console.error("  Error Type: Network Request Error");
            console.error("  Request Details:", error.request); // Might be complex object
        } else {
            // Error setting up the request or other JS error within the try block
            console.error("  Error Type: Setup or Logic Error");
            console.error("  Message:", error.message);
        }
        console.error("  Full Stack Trace:", error.stack); // Log the full stack trace regardless of type
        // --- END DETAILED LOGGING ---

        // --- RE-THROWING LOGIC ---
        // Prioritize specific error messages if available
        if (error.message && error.message.includes('Location not found')) {
             throw new Error('Location not found.'); // Keep specific message
        } else if (error.response && error.response.status === 401) {
            throw new Error('Geocoding failed: Invalid API Key.');
        } else if (error.response && error.response.status === 429) {
            throw new Error('Geocoding failed: API rate limit exceeded.');
        } else if (error.response && (error.response.status === 404 || error.response.status === 400)) {
             throw new Error('Location not found.'); // OWM 404 or bad format
        }
        // Default generic error for other issues (network, unexpected errors)
        throw new Error('Failed to geocode location.'); // Generic fallback
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