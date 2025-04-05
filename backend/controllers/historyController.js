// backend/controllers/historyController.js
const WeatherHistory = require('../models/WeatherHistory');
const axios = require('axios'); // Need axios to re-fetch weather on CREATE

// --- Import getCoordinates from weatherController ---
// Ensure weatherController.js is in the same directory or adjust the path
const { getCoordinates } = require('./weatherController');

// --- Ensure API_KEY and BASE_URL are available (loaded via dotenv in server.js) ---
const API_KEY = process.env.OPENWEATHERMAP_API_KEY;
const BASE_URL = 'http://api.openweathermap.org/data/2.5';

// ============================================
// Helper Function to Fetch Weather for Storage
// ============================================
const fetchWeatherDataForStorage = async (coords) => {
    console.log('[fetchWeatherDataForStorage] Fetching data for coords:', coords);
    // Validate coordinates input
    if (!coords || typeof coords.lat !== 'number' || typeof coords.lon !== 'number') {
        console.error('[fetchWeatherDataForStorage] Invalid coordinates received.');
        throw new Error("Invalid coordinates provided for fetching weather data.");
    }
    // Validate API Key presence
    if (!API_KEY) {
        console.error('[fetchWeatherDataForStorage] Missing API Key.');
        throw new Error("Server configuration error: Missing API Key.");
    }

    try {
        // Fetch current weather and forecast data concurrently
        const [weatherRes, forecastRes] = await Promise.all([
            axios.get(`${BASE_URL}/weather`, { params: { lat: coords.lat, lon: coords.lon, appid: API_KEY, units: 'metric' } }),
            axios.get(`${BASE_URL}/forecast`, { params: { lat: coords.lat, lon: coords.lon, appid: API_KEY, units: 'metric' } })
        ]);
        console.log('[fetchWeatherDataForStorage] OWM Weather & Forecast API calls successful.');

        // --- Process Forecast Data ---
        // Check if forecast data is valid before processing
        if (!forecastRes?.data?.list) {
             console.error('[fetchWeatherDataForStorage] Invalid or missing forecast list in API response.');
             throw new Error("Failed to process forecast data from API.");
        }

        const dailyForecasts = {};
        forecastRes.data.list.forEach(item => {
            // Basic check for item validity
            if (!item?.dt || !item?.main || !item?.weather?.[0]) {
                console.warn('[fetchWeatherDataForStorage] Skipping invalid forecast item:', item);
                return; // Skip this item
            }
            const date = new Date(item.dt * 1000).toISOString().split('T')[0]; // Get YYYY-MM-DD
            if (!dailyForecasts[date]) {
                dailyForecasts[date] = {
                    dt: item.dt,
                    date: date,
                    temps: [],
                    humidities: [], // Example extra data
                    descriptions: new Set(),
                    icons: new Set(),
                };
            }
            dailyForecasts[date].temps.push(item.main.temp);
            dailyForecasts[date].humidities.push(item.main.humidity);
            dailyForecasts[date].descriptions.add(item.weather[0].description);
             // Use day icon consistently, handle potential missing icon
            dailyForecasts[date].icons.add(item.weather[0].icon ? item.weather[0].icon.substring(0, 2) + 'd' : '01d');
        });

        const processedForecast = Object.values(dailyForecasts).map(day => {
             // Ensure temps array is not empty before calculating min/max
             const temp_min = day.temps.length > 0 ? Math.min(...day.temps) : null;
             const temp_max = day.temps.length > 0 ? Math.max(...day.temps) : null;
             const icon = day.icons.values().next().value || '01d'; // Default icon
             const description = Array.from(day.descriptions).join(', ') || 'No description';

             return {
                 dt: day.dt,
                 date: day.date,
                 temp_min,
                 temp_max,
                 description,
                 icon
             };
         }).slice(0, 5); // Ensure only 5 days
         console.log('[fetchWeatherDataForStorage] Forecast processed.');
        // --- End Forecast Processing ---

        // --- Process Current Weather Data ---
         // Check if current weather data is valid
         if (!weatherRes?.data?.main || !weatherRes?.data?.weather?.[0]) {
              console.error('[fetchWeatherDataForStorage] Invalid or missing current weather data in API response.');
              throw new Error("Failed to process current weather data from API.");
         }
         const currentWeatherData = {
             timestamp: weatherRes.data.dt,
             temp: weatherRes.data.main.temp,
             feels_like: weatherRes.data.main.feels_like,
             humidity: weatherRes.data.main.humidity,
             pressure: weatherRes.data.main.pressure,
             wind_speed: weatherRes.data.wind?.speed, // Handle potentially missing wind
             description: weatherRes.data.weather[0].description,
             icon: weatherRes.data.weather[0].icon,
         };
         console.log('[fetchWeatherDataForStorage] Current weather processed.');
        // ---

        // Construct the result object
        const result = {
            currentWeather: currentWeatherData,
            forecast: processedForecast
        };
        console.log('[fetchWeatherDataForStorage] Returning weather data object.');
        // console.log(JSON.stringify(result, null, 2)); // Optional: Log full returned object
        return result; // Return the structured data

    } catch (error) {
        // Log detailed error information from Axios or other issues
        console.error("[fetchWeatherDataForStorage] Error fetching/processing weather/forecast from OWM:");
        if (error.response) {
             // Error response from OWM API
             console.error(`  API Status: ${error.response.status}`);
             console.error(`  API Data: ${JSON.stringify(error.response.data, null, 2)}`);
        } else if (error.request) {
             // Network error, request made but no response
             console.error("  Network Error: No response received from OWM.");
        } else {
             // Setup error or error during processing
             console.error(`  Processing Error: ${error.message}`);
        }
        console.error("  Stack Trace:", error.stack);
        // --- IMPORTANT: Re-throw an error to signal failure to the caller (saveSearch) ---
        throw new Error("Failed to fetch weather data from OpenWeatherMap for storage.");
    }
};


// ============================================
// CRUD Operations for Weather History
// ============================================

// --- CREATE ---
exports.saveSearch = async (req, res, next) => {
    console.log('[saveSearch] Received request body:', req.body);
    // Expect separate fields based on frontend modification
    const { locationQuery, countryCode, startDate: startDateStr, endDate: endDateStr, notes } = req.body;

    // --- Basic Input Validation ---
    if (!locationQuery) {
         console.error('[saveSearch] Bad Request: locationQuery is required.');
         // Send response directly and return to stop execution
         return res.status(400).json({ message: 'Location query is required.' });
    }

    // --- Validate Date Range --- (Using helper defined below or imported)
    const dateValidation = validateDateRange(startDateStr, endDateStr);
    if (!dateValidation.isValid) {
        console.error(`[saveSearch] Invalid Date Range: ${dateValidation.error}`);
        return res.status(400).json({ message: dateValidation.error });
    }
    const { startDate, endDate } = dateValidation.dates; // Use validated Date objects or null
    console.log('[saveSearch] Date validation passed. Start:', startDate, 'End:', endDate);
    // ---

    try {
        console.log(`[saveSearch] Calling getCoordinates for: "${locationQuery}"${countryCode ? `, country: ${countryCode}` : ''}`);
        // 1. Geocode the user's query using the imported function
        const coords = await getCoordinates(locationQuery, countryCode); // Pass countryCode if available

        console.log('[saveSearch] Coordinates obtained:', coords);
        console.log('[saveSearch] Fetching weather data for storage...');
        // 2. Fetch current weather and forecast for these coordinates using the helper
        const weatherData = await fetchWeatherDataForStorage(coords); // Await the result

        // Check if weatherData was actually returned (it should throw if failed)
        if (!weatherData) {
             console.error('[saveSearch] fetchWeatherDataForStorage did not return data unexpectedly.');
             throw new Error('Internal server error: Failed to prepare weather data.');
        }
        console.log('[saveSearch] Weather data fetched successfully.');

        // 3. Create the new history document
        const newHistory = new WeatherHistory({
            query: locationQuery,
            countryQuery: countryCode || null, // Store user input country code (make sure Schema has this if needed)
            locationName: coords.name,       // Resolved name from geocoding
            country: coords.country,         // Resolved country from geocoding
            lat: coords.lat,
            lon: coords.lon,
            searchTimestamp: new Date(),     // Timestamp of the search action
            startDate: startDate,            // Store validated start date (or null)
            endDate: endDate,                // Store validated end date (or null)
            currentWeather: weatherData.currentWeather, // Weather at time of search
            forecast: weatherData.forecast,             // Forecast at time of search
            notes: notes || ''
        });

        console.log('[saveSearch] Attempting to save document to MongoDB...');
        // 4. Save the document to the database
        const savedHistory = await newHistory.save();
        console.log('[saveSearch] Document saved successfully with ID:', savedHistory._id);

        // 5. Send the created document back in the response
        res.status(201).json(savedHistory);

    } catch (error) { // Catch errors from getCoordinates, fetchWeatherDataForStorage, or save
        console.error('[saveSearch] CAUGHT ERROR during save process:', error.message);
        console.error("Stack:", error.stack);
        // Pass the error to the global error handler
        next(error);
    }
};


// --- READ All ---
exports.getAllHistory = async (req, res, next) => {
    console.log('[getAllHistory] Fetching all history records.');
    try {
        // Find all documents, sort by creation date descending (newest first)
        const history = await WeatherHistory.find().sort({ createdAt: -1 });
        console.log(`[getAllHistory] Found ${history.length} records.`);
        res.json(history);
    } catch (error) {
        console.error('[getAllHistory] Error fetching history:', error.message);
        console.error("Stack:", error.stack);
        next(error); // Pass to global error handler
    }
};

// --- READ One ---
exports.getHistoryById = async (req, res, next) => {
     const id = req.params.id;
     console.log(`[getHistoryById] Fetching record with ID: ${id}`);
    try {
        // Find document by its MongoDB _id
        const history = await WeatherHistory.findById(id);
        // If no document found, send 404
        if (!history) {
             console.warn(`[getHistoryById] Record not found for ID: ${id}`);
            return res.status(404).json({ message: 'History record not found.' });
        }
         console.log(`[getHistoryById] Found record for ID: ${id}`);
        res.json(history);
    } catch (error) {
         console.error(`[getHistoryById] Error fetching record ID ${id}:`, error.message);
         console.error("Stack:", error.stack);
         // Handle specific error for invalid ID format
         if (error.name === 'CastError') {
             console.warn(`[getHistoryById] Invalid ID format: ${id}`);
             return res.status(400).json({ message: 'Invalid history record ID format.' });
         }
        next(error); // Pass other errors to global handler
    }
};

// --- UPDATE (Example: Notes) ---
exports.updateHistoryNotes = async (req, res, next) => {
     const id = req.params.id;
     const { notes } = req.body; // Only expecting 'notes' in the body for this example
     console.log(`[updateHistoryNotes] Updating notes for ID: ${id}`);
     console.log(`[updateHistoryNotes] Request body:`, req.body);

    // --- Basic Validation ---
    // Ensure 'notes' exists and is a string (even if empty)
    if (typeof notes !== 'string') {
         console.warn(`[updateHistoryNotes] Invalid data for ID ${id}: 'notes' must be a string.`);
        return res.status(400).json({ message: 'Invalid data: notes must be a string.' });
    }
    // ---

    try {
        // Find the document by ID and update the 'notes' field
        // { new: true } returns the modified document instead of the original
        // { runValidators: true } ensures schema validation rules are applied during update
        const updatedHistory = await WeatherHistory.findByIdAndUpdate(
            id,
            { $set: { notes: notes } }, // Use $set to update only specified fields
            { new: true, runValidators: true }
        );

        // If document with ID wasn't found
        if (!updatedHistory) {
             console.warn(`[updateHistoryNotes] Record not found for ID: ${id}`);
            return res.status(404).json({ message: 'History record not found.' });
        }
         console.log(`[updateHistoryNotes] Successfully updated record ID ${id}.`);
        res.json(updatedHistory); // Send back the updated document
    } catch (error) {
         console.error(`[updateHistoryNotes] Error updating record ID ${id}:`, error.message);
         console.error("Stack:", error.stack);
         // Handle specific error for invalid ID format
         if (error.name === 'CastError') {
             console.warn(`[updateHistoryNotes] Invalid ID format: ${id}`);
             return res.status(400).json({ message: 'Invalid history record ID format.' });
         }
         // Handle potential validation errors from Mongoose Schema
         if (error.name === 'ValidationError') {
             console.warn(`[updateHistoryNotes] Validation error for ID ${id}:`, error.errors);
             return res.status(400).json({ message: 'Validation failed.', errors: error.errors });
         }
        next(error); // Pass other errors to global handler
    }
};

// --- DELETE ---
exports.deleteHistory = async (req, res, next) => {
     const id = req.params.id;
     console.log(`[deleteHistory] Attempting to delete record ID: ${id}`);
    try {
        // Find the document by ID and remove it
        const deletedHistory = await WeatherHistory.findByIdAndDelete(id);

        // If document with ID wasn't found
        if (!deletedHistory) {
             console.warn(`[deleteHistory] Record not found for ID: ${id}`);
            return res.status(404).json({ message: 'History record not found.' });
        }
        console.log(`[deleteHistory] Successfully deleted record ID: ${id}`);
        // Send success message, optionally include the ID of the deleted item
        res.json({ message: 'History record deleted successfully.', id: deletedHistory._id });
        // Alternative: Send 204 No Content on successful deletion
        // res.status(204).send();
    } catch (error) {
         console.error(`[deleteHistory] Error deleting record ID ${id}:`, error.message);
         console.error("Stack:", error.stack);
         // Handle specific error for invalid ID format
         if (error.name === 'CastError') {
             console.warn(`[deleteHistory] Invalid ID format: ${id}`);
             return res.status(400).json({ message: 'Invalid history record ID format.' });
         }
        next(error); // Pass other errors to global handler
    }
};

// ============================================
// Utility Function for Date Validation
// (Keep it here or move to a separate utils file and import)
// ============================================
const validateDateRange = (startDateStr, endDateStr) => {
     console.log(`[validateDateRange] Validating Start: "${startDateStr}", End: "${endDateStr}"`);
     // Treat empty strings as null (no date provided)
     const cleanStartDateStr = startDateStr?.trim() || null;
     const cleanEndDateStr = endDateStr?.trim() || null;

     // Case 1: No dates provided - Valid (means no range specified)
     if (!cleanStartDateStr && !cleanEndDateStr) {
          console.log('[validateDateRange] No dates provided.');
         return { isValid: true, error: null, dates: { startDate: null, endDate: null } };
     }

     // Case 2: Only one date provided - Allow this, treat as single date range point
     if (cleanStartDateStr && !cleanEndDateStr) {
          const startDate = new Date(cleanStartDateStr + 'T00:00:00.000Z'); // Assume UTC or user's start of day
          if (isNaN(startDate.getTime())) {
              console.warn('[validateDateRange] Invalid start date format.');
              return { isValid: false, error: "Invalid start date format. Please use YYYY-MM-DD.", dates: {} };
          }
          console.log('[validateDateRange] Only start date provided.');
          return { isValid: true, error: null, dates: { startDate, endDate: null } };
     }
     if (!cleanStartDateStr && cleanEndDateStr) {
           const endDate = new Date(cleanEndDateStr + 'T23:59:59.999Z'); // Assume UTC or user's end of day
          if (isNaN(endDate.getTime())) {
               console.warn('[validateDateRange] Invalid end date format.');
              return { isValid: false, error: "Invalid end date format. Please use YYYY-MM-DD.", dates: {} };
          }
          console.log('[validateDateRange] Only end date provided.');
          return { isValid: true, error: null, dates: { startDate: null, endDate } };
     }


     // Case 3: Both dates provided
     // Parse dates - Appending time/zone helps avoid timezone shifts converting just date strings
     const startDate = new Date(cleanStartDateStr + 'T00:00:00.000Z');
     const endDate = new Date(cleanEndDateStr + 'T23:59:59.999Z'); // Use end of day for comparison

     // Check if parsing was successful
     if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
         console.warn('[validateDateRange] Invalid date format for start or end date.');
        return { isValid: false, error: "Invalid date format. Please use YYYY-MM-DD.", dates: {} };
     }

     // Check if start date is after end date
     if (startDate > endDate) {
          console.warn('[validateDateRange] Start date is after end date.');
        return { isValid: false, error: "Start date cannot be after end date.", dates: {} };
     }

     // Optional: Check against today's date (uncomment if needed)
     // const today = new Date();
     // today.setUTCHours(0, 0, 0, 0); // Compare with start of today UTC
     // if (startDate < today) {
     //     console.warn('[validateDateRange] Start date is in the past.');
     //     return { isValid: false, error: "Start date cannot be in the past." };
     // }

    console.log('[validateDateRange] Dates are valid.');
    return { isValid: true, error: null, dates: { startDate, endDate } }; // Return validated Date objects
};
// ============================================