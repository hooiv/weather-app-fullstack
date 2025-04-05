// backend/controllers/weatherController.js
const axios = require('axios');
const API_KEY = process.env.OPENWEATHERMAP_API_KEY;
const BASE_URL = 'http://api.openweathermap.org/data/2.5';
const GEO_URL = 'http://api.openweathermap.org/geo/1.0';

// Helper to get coordinates
const getCoordinates = async (location, countryCode = null) => { // Accept countryCode
    const trimmedLocation = location.trim();
    const upperCountryCode = countryCode ? countryCode.trim().toUpperCase() : null; // Use provided country code

    console.log(`[getCoordinates] Attempting to geocode: "${trimmedLocation}"${upperCountryCode ? ` in country ${upperCountryCode}` : ''}`);
    console.log(`[getCoordinates] Using API Key (first 5 chars): ${API_KEY ? API_KEY.substring(0, 5) : 'MISSING!'}`);

    try {
        let resultCoordinates = null;

        // Determine if it looks like a postal code
        const isLikelyPostal = /^\d+([ -]?\d+)*$/.test(trimmedLocation.replace(/[ -]/g, ''));

        // --- Strategy: ---
        // 1. If it looks like postal AND country code is provided, try /zip with country first.
        // 2. If it looks like postal BUT NO country code, try /zip without country (less reliable).
        // 3. If it doesn't look postal, OR if /zip failed, try /direct.

        let zipQuery = trimmedLocation;
        if (isLikelyPostal && upperCountryCode) {
             zipQuery = `${trimmedLocation},${upperCountryCode}`; // Format needed by OWM /zip
             console.log(`[getCoordinates] Detected postal with country code. Querying zip endpoint with: ${zipQuery}`);
        } else if (isLikelyPostal) {
            // Keep zipQuery as just the trimmedLocation if no country code provided
            console.log(`[getCoordinates] Detected postal without country code. Querying zip endpoint with: ${zipQuery}`);
        }

        // Attempt /zip endpoint only if it looks postal
        if (isLikelyPostal) {
             try {
                 const zipApiResponse = await axios.get(`${GEO_URL}/zip`, {
                     params: { zip: zipQuery, appid: API_KEY }
                 });
                 console.log(`[getCoordinates] Zip API (${zipQuery}) Response Status:`, zipApiResponse.status);
                 console.log('[getCoordinates] Zip API Response Data:', JSON.stringify(zipApiResponse.data, null, 2));

                 if (zipApiResponse.data && zipApiResponse.data.lat) {
                     console.log(`[getCoordinates] Zip API Success: lat=${zipApiResponse.data.lat}, lon=${zipApiResponse.data.lon}, name=${zipApiResponse.data.name}, country=${zipApiResponse.data.country}`);
                     resultCoordinates = {
                         lat: zipApiResponse.data.lat,
                         lon: zipApiResponse.data.lon,
                         name: zipApiResponse.data.name || trimmedLocation, // Use name from zip, fallback to input
                         country: zipApiResponse.data.country || upperCountryCode || 'Unknown' // Prioritize OWM country, then user input, then Unknown
                     };
                 } else {
                     console.log(`[getCoordinates] Zip endpoint (${zipQuery}) did not return valid coordinates. Will try /direct if applicable.`);
                 }
             } catch (zipError) {
                 if (zipError.response && zipError.response.status === 404) {
                     console.warn(`[getCoordinates] Zip endpoint query for '${zipQuery}' returned 404. Will try /direct if applicable.`);
                 } else {
                     console.warn(`[getCoordinates] Zip endpoint query for '${zipQuery}' failed (Status: ${zipError.response?.status}). Will try /direct if applicable.`);
                 }
             }
         }

        // Fallback or primary attempt using /direct endpoint
        if (resultCoordinates === null) {
            console.log(`[getCoordinates] Querying /direct endpoint for: "${trimmedLocation}"${upperCountryCode ? ` in country ${upperCountryCode}` : ''}.`);
            // Append country to query for /direct endpoint as well if provided
            const directQuery = upperCountryCode ? `${trimmedLocation},${upperCountryCode}` : trimmedLocation;

            const directApiResponse = await axios.get(`${GEO_URL}/direct`, {
                params: { q: directQuery, limit: 1, appid: API_KEY }
            });
            console.log('[getCoordinates] Direct API Response Status:', directApiResponse.status);
            console.log('[getCoordinates] Direct API Response Data:', JSON.stringify(directApiResponse.data, null, 2));

            if (!directApiResponse.data || directApiResponse.data.length === 0) {
                console.error(`[getCoordinates] No data found via /direct search for "${directQuery}".`);
                // Check if ONLY zip was tried and failed before throwing final error
                if (isLikelyPostal) {
                    throw new Error(`Postal code "${trimmedLocation}"${upperCountryCode ? ` in ${upperCountryCode}` : ''} not found.`);
                } else {
                    throw new Error(`Location "${directQuery}" not found.`);
                }
            }
            const { lat, lon, name, country } = directApiResponse.data[0];
             console.log(`[getCoordinates] Direct API Success: lat=${lat}, lon=${lon}, name=${name}, country=${country}`);
             resultCoordinates = { lat, lon, name, country };
        }

        if (resultCoordinates) {
            return resultCoordinates;
        } else {
             // Should not be reached with the new logic, but acts as safeguard
             console.error('[getCoordinates] Failed to obtain coordinates unexpectedly.');
             throw new Error('Geocoding failed after trying available methods.');
        }

    } catch (error) {
        // ... (Detailed catch block logging remains the same) ...
         console.error("[getCoordinates] CAUGHT ERROR in getCoordinates function:");
        if (error.response) { /* ... */ } else if (error.request) { /* ... */  } else { /* ... */ }
         console.error("  Full Stack Trace:", error.stack);

        // Re-throwing logic (can simplify slightly now)
        if (error.message && error.message.toLowerCase().includes('not found')) {
             throw new Error(error.message); // Propagate specific "not found" messages
        } else if (error.response && error.response.status === 401) {
            throw new Error('Geocoding failed: Invalid API Key.');
        } else if (error.response && error.response.status === 429) {
            throw new Error('Geocoding failed: API rate limit exceeded.');
         } else if (error.response && (error.response.status === 404 || error.response.status === 400)) {
              throw new Error('Location query failed or was not found by the service.'); // Generic OWM fail
         }
        // Default generic error
        throw new Error('Failed to geocode location due to an unexpected error.');
    }
};

// --- Route Handlers ---

exports.getCurrentWeather = async (req, res, next) => {
    console.log(`[getCurrentWeather] Request Query: ${JSON.stringify(req.query)}`);
    // --- Read location, country, lat, lon from query ---
    const { location, country, lat, lon } = req.query;
    let coords;

    try {
        if (lat && lon) { // Prioritize coordinates if provided
            console.log(`[getCurrentWeather] Using provided coordinates: lat=${lat}, lon=${lon}`);
            coords = { lat: parseFloat(lat), lon: parseFloat(lon) };
             // Optional: Reverse geocode (no changes needed here)
             try { /* ... */ } catch (reverseError) { /* ... */ }
             if (!coords.name) { coords.name = "Unknown Location"; coords.country = ""; }

        } else if (location) { // Use location and optional country
             console.log(`[getCurrentWeather] Calling getCoordinates for location: "${location}"${country ? `, country: ${country}`:''}`);
            coords = await getCoordinates(location, country); // Pass both to getCoordinates
             console.log(`[getCurrentWeather] Coordinates received: ${JSON.stringify(coords)}`);
        } else {
             console.error('[getCurrentWeather] Bad Request: Location or coordinates are required.');
            return res.status(400).json({ message: 'Location or coordinates are required.' });
        }

         // --- Fetching weather logic remains the same ---
         console.log(`[getCurrentWeather] Fetching weather for lat=${coords.lat}, lon=${coords.lon}`);
        const weatherResponse = await axios.get(/* ... */);
         // ... process weatherResponse ...
          const responseData = {
             ...weatherResponse.data,
             resolvedLocationName: coords.name,
             resolvedCountry: coords.country
         };
         res.json(responseData);
        // ---

    } catch (error) {
         console.error(`[getCurrentWeather] CAUGHT ERROR in route handler: ${error.message}`);
         console.error("Stack:", error.stack);
        next(error); // Pass error to global handler
    }
};

exports.getForecast = async (req, res, next) => {
     console.log(`[getForecast] Request Query: ${JSON.stringify(req.query)}`);
    // --- Read location, country, lat, lon from query ---
    const { location, country, lat, lon } = req.query;
     let coords;

     try {
        if (lat && lon) { // Prioritize coordinates
             console.log(`[getForecast] Using provided coordinates: lat=${lat}, lon=${lon}`);
             coords = { lat: parseFloat(lat), lon: parseFloat(lon) };
              // Optional: Reverse geocode (no changes needed here)
              try { /* ... */ } catch (reverseError) { /* ... */ }
              if (!coords.name) { coords.name = "Unknown Location"; coords.country = ""; }

        } else if (location) { // Use location and optional country
             console.log(`[getForecast] Calling getCoordinates for location: "${location}"${country ? `, country: ${country}`:''}`);
             coords = await getCoordinates(location, country); // Pass both
            console.log(`[getForecast] Coordinates received: ${JSON.stringify(coords)}`);
        } else {
             console.error('[getForecast] Bad Request: Location or coordinates are required.');
             return res.status(400).json({ message: 'Location or coordinates are required.' });
        }

         // --- Fetching forecast logic remains the same ---
         console.log(`[getForecast] Fetching forecast for lat=${coords.lat}, lon=${coords.lon}`);
         const forecastResponse = await axios.get(/* ... */);
         // ... process forecastResponse ...
         const responseData = { /* ... */ };
         res.json(responseData);
         // ---

     } catch (error) {
         console.error(`[getForecast] CAUGHT ERROR in route handler: ${error.message}`);
         console.error("Stack:", error.stack);
         next(error);
     }
};