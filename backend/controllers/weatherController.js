// backend/controllers/weatherController.js
const axios = require('axios');
// Ensure dotenv is configured in server.js to load .env
const API_KEY = process.env.OPENWEATHERMAP_API_KEY;
const BASE_URL = 'http://api.openweathermap.org/data/2.5';
const GEO_URL = 'http://api.openweathermap.org/geo/1.0';

// Helper function to guess country code (optional, if you want hybrid approach)
// const guessCountryFromPostalCode = (postalCode) => { /* ... */ }

// Helper to get coordinates
const getCoordinates = async (location, countryCode = null) => { // Accept countryCode
    const trimmedLocation = location ? location.trim() : ''; // Handle null/undefined location
    // Ensure countryCode is null if empty string, and uppercase if exists
    const upperCountryCode = countryCode ? countryCode.trim().toUpperCase() : null;

    // Basic validation
    if (!trimmedLocation) {
        console.error('[getCoordinates] Error: Location input is empty.');
        throw new Error('Location input cannot be empty.');
    }
    if (!API_KEY) {
        console.error('[getCoordinates] Error: OPENWEATHERMAP_API_KEY is missing in environment variables.');
        throw new Error('Server configuration error: Missing API Key.'); // Don't expose details
    }


    console.log(`[getCoordinates] Attempting to geocode: "${trimmedLocation}"${upperCountryCode ? ` (User Country: ${upperCountryCode})` : ''}`);
    console.log(`[getCoordinates] Using API Key (first 5 chars): ${API_KEY.substring(0, 5)}`);

    try {
        let resultCoordinates = null;

        // Determine if it looks like a postal code (basic check)
        // Allows letters for formats like Canada/UK, digits, space, hyphen
        const isLikelyPostal = /^[A-Za-z0-9]+([ -]?[A-Za-z0-9]+)*$/.test(trimmedLocation);
        console.log(`[getCoordinates] Input "${trimmedLocation}" determined as likelyPostal: ${isLikelyPostal}`);


        // --- Strategy: ---
        // 1. If it looks like postal AND country code is provided, try /zip with country first.
        // 2. If it looks like postal BUT NO country code, try /zip without country (less reliable).
        // 3. If it doesn't look postal, OR if /zip failed/wasn't tried, try /direct (using user country if provided).

        let triedZip = false; // Flag to track if zip endpoint was attempted

        if (isLikelyPostal) {
            let zipQuery = upperCountryCode ? `${trimmedLocation},${upperCountryCode}` : trimmedLocation;
            console.log(`[getCoordinates] Attempting /zip endpoint with query: ${zipQuery}`);
            triedZip = true;

            try {
                const zipApiResponse = await axios.get(`${GEO_URL}/zip`, {
                    params: { zip: zipQuery, appid: API_KEY }
                });
                console.log(`[getCoordinates] Zip API (${zipQuery}) Response Status:`, zipApiResponse.status);
                 // Check specifically for data presence AND latitude, as OWM might return 200 OK with incomplete data sometimes
                if (zipApiResponse.data && typeof zipApiResponse.data.lat === 'number' && typeof zipApiResponse.data.lon === 'number') {
                     console.log('[getCoordinates] Zip API Response Data:', JSON.stringify(zipApiResponse.data, null, 2));
                     console.log(`[getCoordinates] Zip API Success: lat=${zipApiResponse.data.lat}, lon=${zipApiResponse.data.lon}, name=${zipApiResponse.data.name}, country=${zipApiResponse.data.country}`);
                     resultCoordinates = {
                         lat: zipApiResponse.data.lat,
                         lon: zipApiResponse.data.lon,
                         name: zipApiResponse.data.name || trimmedLocation, // Use name from zip, fallback to input
                         country: zipApiResponse.data.country || upperCountryCode || 'Unknown' // Prioritize OWM country, then user input, then Unknown
                     };
                 } else {
                     console.log(`[getCoordinates] Zip endpoint (${zipQuery}) returned status ${zipApiResponse.status} but data missing or invalid lat/lon.`);
                      console.log('[getCoordinates] Zip API Response Data:', JSON.stringify(zipApiResponse.data, null, 2)); // Log what was received
                 }
            } catch (zipError) {
                 if (zipError.response) {
                     console.warn(`[getCoordinates] Zip endpoint query for '${zipQuery}' failed (Status: ${zipError.response.status}). Response Data:`, JSON.stringify(zipError.response.data, null, 2));
                 } else {
                      console.warn(`[getCoordinates] Zip endpoint query for '${zipQuery}' failed with non-response error:`, zipError.message);
                 }
                 // Will proceed to try /direct if needed
            }
        }

        // Fallback or primary attempt using /direct endpoint
        if (resultCoordinates === null) {
            const directQuery = upperCountryCode ? `${trimmedLocation},${upperCountryCode}` : trimmedLocation;
            console.log(`[getCoordinates] Querying /direct endpoint for: "${directQuery}".`);

            try {
                 const directApiResponse = await axios.get(`${GEO_URL}/direct`, {
                     params: { q: directQuery, limit: 1, appid: API_KEY }
                 });
                 console.log('[getCoordinates] Direct API Response Status:', directApiResponse.status);
                 console.log('[getCoordinates] Direct API Response Data:', JSON.stringify(directApiResponse.data, null, 2));

                 // Check response is valid array and has at least one result with lat/lon
                 if (Array.isArray(directApiResponse.data) && directApiResponse.data.length > 0 && typeof directApiResponse.data[0].lat === 'number' && typeof directApiResponse.data[0].lon === 'number') {
                     const { lat, lon, name, country } = directApiResponse.data[0];
                     console.log(`[getCoordinates] Direct API Success: lat=${lat}, lon=${lon}, name=${name}, country=${country}`);
                     resultCoordinates = { lat, lon, name, country };
                 } else {
                     console.error(`[getCoordinates] No valid data found via /direct search for "${directQuery}". Response:`, JSON.stringify(directApiResponse.data, null, 2));
                      // Throw specific error based on what was tried
                     if (triedZip) {
                         throw new Error(`Location "${trimmedLocation}"${upperCountryCode ? ` in ${upperCountryCode}`:''} not found via Zip or Direct search.`);
                      } else {
                         throw new Error(`Location "${directQuery}" not found via Direct search.`);
                     }
                 }
            } catch(directError) {
                console.error(`[getCoordinates] /direct query for "${directQuery}" failed.`);
                 if (directError.response) {
                     console.error(`  Status: ${directError.response.status}, Data: ${JSON.stringify(directError.response.data, null, 2)}`);
                 } else {
                     console.error(`  Error Message: ${directError.message}`);
                 }
                 // Re-throw or handle direct API errors specifically
                 throw new Error(`Failed to search location "${directQuery}" via Direct endpoint.`);
            }
        }

        if (resultCoordinates) {
            console.log("[getCoordinates] Returning coordinates:", resultCoordinates)
            return resultCoordinates;
        } else {
             // Should not be reached if logic is sound, but acts as safeguard
             console.error('[getCoordinates] Failed to obtain coordinates unexpectedly after trying all methods.');
             throw new Error('Geocoding failed after trying available methods.');
        }

    } catch (error) {
        // --- DETAILED LOGGING IN CATCH ---
        console.error("[getCoordinates] CAUGHT ERROR in getCoordinates function:");
        if (error.response) {
            console.error("  Error Type: API Response Error");
            console.error("  Status:", error.response.status);
            console.error("  Data:", JSON.stringify(error.response.data, null, 2));
        } else if (error.request) {
            console.error("  Error Type: Network Request Error");
            console.error("  Request Details (Partial):", error.request._options?.path); // Log requested path if available
        } else {
            console.error("  Error Type: Setup or Logic Error");
            console.error("  Message:", error.message);
        }
        console.error("  Full Stack Trace:", error.stack); // Log the full stack trace regardless of type
        // --- END DETAILED LOGGING ---

        // --- RE-THROWING LOGIC ---
        // Prioritize specific error messages if available
        if (error.message && error.message.toLowerCase().includes('not found')) {
             throw new Error(error.message); // Propagate specific "not found" messages
        } else if (error.response && error.response.status === 401) {
            throw new Error('Geocoding failed: Invalid API Key.');
        } else if (error.response && error.response.status === 429) {
            throw new Error('Geocoding failed: API rate limit exceeded.');
         } else if (error.response && (error.response.status === 404 || error.response.status === 400)) {
              // OWM 404s / 400s often mean not found or bad format
              throw new Error('Location query failed or was not found by the service.');
         } else if (error.message && error.message.includes('API Key')) {
              throw new Error('Geocoding failed due to API Key issue.'); // Catch internal API key error
         }
        // Default generic error for other issues (network, unexpected errors)
        throw new Error('Failed to geocode location due to an unexpected error.');
    }
};

// ============================================
// Route Handlers (Current Weather and Forecast)
// ============================================

exports.getCurrentWeather = async (req, res, next) => {
    console.log(`[getCurrentWeather] Request Query: ${JSON.stringify(req.query)}`);
    // --- Read location, country, lat, lon from query ---
    const { location, country, lat, lon } = req.query;
    let coords;

    try {
        // Input Validation
        if (!lat && !lon && !location) {
             console.error('[getCurrentWeather] Bad Request: Location or coordinates are required.');
             // Use return to stop execution
             return res.status(400).json({ message: 'Location or coordinates are required.' });
        }
        if ((lat && !lon) || (!lat && lon)) {
            console.error('[getCurrentWeather] Bad Request: Both latitude and longitude are required if one is provided.');
             return res.status(400).json({ message: 'Both latitude and longitude are required.' });
        }


        if (lat && lon) { // Prioritize coordinates if provided
            console.log(`[getCurrentWeather] Using provided coordinates: lat=${lat}, lon=${lon}`);
            // Validate coordinate format/range
            if (isNaN(parseFloat(lat)) || isNaN(parseFloat(lon)) || parseFloat(lat) < -90 || parseFloat(lat) > 90 || parseFloat(lon) < -180 || parseFloat(lon) > 180) {
                console.error('[getCurrentWeather] Bad Request: Invalid coordinate format or range.');
                 return res.status(400).json({ message: 'Invalid coordinate format or range.' });
            }
            coords = { lat: parseFloat(lat), lon: parseFloat(lon) };

             // Optional: Reverse geocode to get name/country if needed for consistency
             try {
                 const reverseGeo = await axios.get(`${GEO_URL}/reverse`, { params: { lat: coords.lat, lon: coords.lon, limit: 1, appid: API_KEY } });
                 if (reverseGeo.data && reverseGeo.data.length > 0) {
                     coords.name = reverseGeo.data[0].name;
                     coords.country = reverseGeo.data[0].country;
                     console.log(`[getCurrentWeather] Reverse geocode successful: Name=${coords.name}, Country=${coords.country}`);
                 } else {
                     coords.name = "Unknown (via coords)"; // More specific default
                     coords.country = "";
                     console.log(`[getCurrentWeather] Reverse geocode returned no results.`);
                 }
             } catch (reverseError) {
                  console.warn(`[getCurrentWeather] Reverse geocode failed (Status: ${reverseError.response?.status}). Using defaults.`);
                  coords.name = "Unknown (via coords)";
                  coords.country = "";
             }

        } else { // Use location and optional country
             console.log(`[getCurrentWeather] Calling getCoordinates for location: "${location}"${country ? `, country: ${country}`:''}`);
             coords = await getCoordinates(location, country); // Pass both to getCoordinates
             console.log(`[getCurrentWeather] Coordinates received: ${JSON.stringify(coords)}`);
        }

         // --- Fetching weather logic remains the same ---
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
         // ---

    } catch (error) {
         console.error(`[getCurrentWeather] CAUGHT ERROR in route handler: ${error.message}`);
         console.error("Stack:", error.stack);
         // Don't pass the raw error to next() if it's something we already handled (like a 400 status)
         // The global handler will catch unhandled ones.
         if (!res.headersSent) { // Check if response already sent
             next(error); // Pass error to global handler only if needed
         }
    }
};

exports.getForecast = async (req, res, next) => {
     console.log(`[getForecast] Request Query: ${JSON.stringify(req.query)}`);
     // --- Read location, country, lat, lon from query ---
     const { location, country, lat, lon } = req.query;
     let coords;

     try {
          // Input Validation
          if (!lat && !lon && !location) {
               console.error('[getForecast] Bad Request: Location or coordinates are required.');
               return res.status(400).json({ message: 'Location or coordinates are required.' });
          }
          if ((lat && !lon) || (!lat && lon)) {
              console.error('[getForecast] Bad Request: Both latitude and longitude are required if one is provided.');
               return res.status(400).json({ message: 'Both latitude and longitude are required.' });
          }

          if (lat && lon) { // Prioritize coordinates
               console.log(`[getForecast] Using provided coordinates: lat=${lat}, lon=${lon}`);
                if (isNaN(parseFloat(lat)) || isNaN(parseFloat(lon)) || parseFloat(lat) < -90 || parseFloat(lat) > 90 || parseFloat(lon) < -180 || parseFloat(lon) > 180) {
                   console.error('[getForecast] Bad Request: Invalid coordinate format or range.');
                    return res.status(400).json({ message: 'Invalid coordinate format or range.' });
                }
               coords = { lat: parseFloat(lat), lon: parseFloat(lon) };
                // Optional: Reverse geocode (no changes needed here)
                try {
                     const reverseGeo = await axios.get(`${GEO_URL}/reverse`, { params: { lat: coords.lat, lon: coords.lon, limit: 1, appid: API_KEY } });
                     if (reverseGeo.data && reverseGeo.data.length > 0) {
                         coords.name = reverseGeo.data[0].name;
                         coords.country = reverseGeo.data[0].country;
                         console.log(`[getForecast] Reverse geocode successful: Name=${coords.name}, Country=${coords.country}`);
                     } else {
                         coords.name = "Unknown (via coords)";
                         coords.country = "";
                          console.log(`[getForecast] Reverse geocode returned no results.`);
                     }
                 } catch (reverseError) {
                      console.warn(`[getForecast] Reverse geocode failed (Status: ${reverseError.response?.status}). Using defaults.`);
                      coords.name = "Unknown (via coords)";
                      coords.country = "";
                 }

          } else { // Use location and optional country
               console.log(`[getForecast] Calling getCoordinates for location: "${location}"${country ? `, country: ${country}`:''}`);
               coords = await getCoordinates(location, country); // Pass both
              console.log(`[getForecast] Coordinates received: ${JSON.stringify(coords)}`);
          }


         // --- Fetching forecast logic remains the same ---
         console.log(`[getForecast] Fetching forecast for lat=${coords.lat}, lon=${coords.lon}`);
         const forecastResponse = await axios.get(`${BASE_URL}/forecast`, {
             params: {
                 lat: coords.lat,
                 lon: coords.lon,
                 appid: API_KEY,
                 units: 'metric' // Or 'imperial'
             }
          });
         console.log('[getForecast] Forecast API Response Status:', forecastResponse.status);

         // --- Process forecast data (no changes needed here) ---
         const dailyForecasts = {};
         // ... (loop through forecastResponse.data.list) ...
         forecastResponse.data.list.forEach(item => {
             const date = new Date(item.dt * 1000).toISOString().split('T')[0];
             if (!dailyForecasts[date]) {
                 dailyForecasts[date] = { dt: item.dt, date: date, temps: [], descriptions: new Set(), icons: new Set() };
             }
             dailyForecasts[date].temps.push(item.main.temp);
             dailyForecasts[date].descriptions.add(item.weather[0].description);
             dailyForecasts[date].icons.add(item.weather[0].icon.substring(0, 2) + 'd');
         });
         const processedForecast = Object.values(dailyForecasts).map(day => ({
             dt: day.dt,
             date: day.date,
             temp_min: Math.min(...day.temps),
             temp_max: Math.max(...day.temps),
             description: Array.from(day.descriptions).join(', '),
             icon: day.icons.values().next().value || '01d'
         })).slice(0, 5);
         // ---

         // Add resolved location name back to the response
         const responseData = {
              forecast: processedForecast,
              location: { // Include location details
                  name: coords.name,
                  country: coords.country,
                  lat: coords.lat,
                  lon: coords.lon
              },
              city: forecastResponse.data.city // Original city info from API if needed
          };

         console.log('[getForecast] Sending successful response.');
         res.json(responseData);
         // ---

     } catch (error) {
         console.error(`[getForecast] CAUGHT ERROR in route handler: ${error.message}`);
         console.error("Stack:", error.stack);
         if (!res.headersSent) {
             next(error);
         }
     }
};
module.exports.getCoordinates = getCoordinates;