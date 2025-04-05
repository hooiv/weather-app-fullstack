// backend/controllers/historyController.js
const WeatherHistory = require('../models/WeatherHistory');
const axios = require('axios');

// --- THIS LINE IS CRUCIAL ---
const { getCoordinates } = require('./weatherController');
// --- ENSURE THIS LINE EXISTS AND IS SPELLED CORRECTLY ---

const API_KEY = process.env.OPENWEATHERMAP_API_KEY;
const BASE_URL = 'http://api.openweathermap.org/data/2.5';


// Helper function to fetch weather and forecast for storage (Keep this function)
const fetchWeatherDataForStorage = async (coords) => {
    console.log('[fetchWeatherDataForStorage] Fetching data for coords:', coords);
    if (!coords || typeof coords.lat !== 'number' || typeof coords.lon !== 'number') {
        console.error('[fetchWeatherDataForStorage] Invalid coordinates received.');
        throw new Error("Invalid coordinates for fetching weather data.");
    }
    if (!API_KEY) {
        console.error('[fetchWeatherDataForStorage] Missing API Key.');
         throw new Error("Server configuration error: Missing API Key.");
    }
    try {
        const [weatherRes, forecastRes] = await Promise.all([
            axios.get(`${BASE_URL}/weather`, { params: { lat: coords.lat, lon: coords.lon, appid: API_KEY, units: 'metric' } }),
            axios.get(`${BASE_URL}/forecast`, { params: { lat: coords.lat, lon: coords.lon, appid: API_KEY, units: 'metric' } })
        ]);
        console.log('[fetchWeatherDataForStorage] OWM Weather/Forecast API calls successful.');

        // Process forecast (same logic as in weatherController.getForecast)
        // ... (forecast processing logic - MAKE SURE THIS IS PRESENT AND CORRECT) ...
         const dailyForecasts = {};
         forecastRes.data.list.forEach(item => { /* ... */ }); // Ensure loop body is correct
         const processedForecast = Object.values(dailyForecasts).map(day => { /* ... */ }).slice(0, 5); // Ensure map body is correct


        return {
            currentWeather: {
                timestamp: weatherRes.data.dt,
                temp: weatherRes.data.main.temp,
                feels_like: weatherRes.data.main.feels_like,
                humidity: weatherRes.data.main.humidity,
                pressure: weatherRes.data.main.pressure,
                wind_speed: weatherRes.data.wind.speed,
                description: weatherRes.data.weather[0].description,
                icon: weatherRes.data.weather[0].icon,
            },
            forecast: processedForecast
        };
    } catch (error) {
        console.error("[fetchWeatherDataForStorage] Error fetching weather/forecast from OWM:");
        if (error.response) {
             console.error(`  Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data, null, 2)}`);
        } else {
             console.error(`  Error Message: ${error.message}`);
        }
        console.error(error.stack);
        throw new Error("Failed to fetch weather data from OpenWeatherMap for storage."); // More specific
    }
};


// CREATE
exports.saveSearch = async (req, res, next) => {
    console.log('[saveSearch] Received request body:', req.body);
    // Expect separate fields based on frontend modification
    const { locationQuery, countryCode, notes } = req.body;

    if (!locationQuery) {
         console.error('[saveSearch] Bad Request: locationQuery is required.');
         return res.status(400).json({ message: 'Location query is required.' });
    }

    try {
        console.log(`[saveSearch] Calling getCoordinates for: "${locationQuery}"${countryCode ? `, country: ${countryCode}` : ''}`);
        // 1. Geocode the user's query - Uses the imported function now
        const coords = await getCoordinates(locationQuery, countryCode); // Pass countryCode if available

        console.log('[saveSearch] Coordinates obtained:', coords);
        console.log('[saveSearch] Fetching weather data for storage...');
        // 2. Fetch current weather and forecast for these coordinates
        const weatherData = await fetchWeatherDataForStorage(coords);

        console.log('[saveSearch] Weather data fetched successfully.');

        // 3. Create and save the history record
        // Decide if you want to store countryCode explicitly in the schema
        // (Add 'countryQuery: String' to WeatherHistorySchema if you do)
        const newHistory = new WeatherHistory({
            query: locationQuery, // Original location query
            // countryQuery: countryCode, // Optional: Store user's country input
            locationName: coords.name, // Resolved name from geocoding
            country: coords.country, // Resolved country from geocoding
            lat: coords.lat,
            lon: coords.lon,
            searchTimestamp: new Date(),
            currentWeather: weatherData.currentWeather,
            forecast: weatherData.forecast,
            notes: notes || ''
        });

        console.log('[saveSearch] Attempting to save document to MongoDB...');
        const savedHistory = await newHistory.save();
        console.log('[saveSearch] Document saved successfully with ID:', savedHistory._id);
        res.status(201).json(savedHistory);

    } catch (error) {
        console.error('[saveSearch] CAUGHT ERROR:', error.message);
        console.error(error.stack);
        // Pass error to global handler
        // Avoid sending response here if error is passed to next()
        next(error);
    }
};

// --- READ All --- (No changes needed)
exports.getAllHistory = async (req, res, next) => {
    console.log('[getAllHistory] Fetching all history records.');
    try {
        const history = await WeatherHistory.find().sort({ createdAt: -1 });
        console.log(`[getAllHistory] Found ${history.length} records.`);
        res.json(history);
    } catch (error) {
        console.error('[getAllHistory] Error fetching history:', error.message);
        console.error(error.stack);
        next(error);
    }
};

// --- READ One --- (No changes needed)
exports.getHistoryById = async (req, res, next) => {
     const id = req.params.id;
     console.log(`[getHistoryById] Fetching record with ID: ${id}`);
    try {
        const history = await WeatherHistory.findById(id);
        if (!history) {
             console.warn(`[getHistoryById] Record not found for ID: ${id}`);
            return res.status(404).json({ message: 'History record not found.' });
        }
         console.log(`[getHistoryById] Found record:`, history);
        res.json(history);
    } catch (error) {
         console.error(`[getHistoryById] Error fetching record ID ${id}:`, error.message);
         console.error(error.stack);
         if (error.name === 'CastError') { // Handle invalid ID format
             console.warn(`[getHistoryById] Invalid ID format: ${id}`);
             return res.status(400).json({ message: 'Invalid history record ID format.' });
         }
        next(error);
    }
};

// --- UPDATE --- (No changes needed unless updating more than notes)
exports.updateHistoryNotes = async (req, res, next) => {
     const id = req.params.id;
     const { notes } = req.body;
     console.log(`[updateHistoryNotes] Updating notes for ID: ${id}`);
     console.log(`[updateHistoryNotes] Request body:`, req.body);

    // Basic validation: notes should be a string if provided
    if (notes === undefined || typeof notes !== 'string') {
         console.warn(`[updateHistoryNotes] Invalid data for ID ${id}: notes must be a string.`);
        return res.status(400).json({ message: 'Invalid data: notes must be a string.' });
    }

    try {
        const updatedHistory = await WeatherHistory.findByIdAndUpdate(
            id,
            { $set: { notes: notes, updatedAt: new Date() } }, // Explicitly set updatedAt if needed, Mongoose does it with {timestamps: true}
            { new: true, runValidators: true }
        );

        if (!updatedHistory) {
             console.warn(`[updateHistoryNotes] Record not found for ID: ${id}`);
            return res.status(404).json({ message: 'History record not found.' });
        }
         console.log(`[updateHistoryNotes] Successfully updated record ID ${id}.`);
        res.json(updatedHistory);
    } catch (error) {
         console.error(`[updateHistoryNotes] Error updating record ID ${id}:`, error.message);
         console.error(error.stack);
         if (error.name === 'CastError') {
             console.warn(`[updateHistoryNotes] Invalid ID format: ${id}`);
             return res.status(400).json({ message: 'Invalid history record ID format.' });
         }
        next(error);
    }
};

// --- DELETE --- (No changes needed)
exports.deleteHistory = async (req, res, next) => {
     const id = req.params.id;
     console.log(`[deleteHistory] Attempting to delete record ID: ${id}`);
    try {
        const deletedHistory = await WeatherHistory.findByIdAndDelete(id);

        if (!deletedHistory) {
             console.warn(`[deleteHistory] Record not found for ID: ${id}`);
            return res.status(404).json({ message: 'History record not found.' });
        }
        console.log(`[deleteHistory] Successfully deleted record ID: ${id}`);
        res.json({ message: 'History record deleted successfully.', id: deletedHistory._id });
    } catch (error) {
         console.error(`[deleteHistory] Error deleting record ID ${id}:`, error.message);
         console.error(error.stack);
         if (error.name === 'CastError') {
             console.warn(`[deleteHistory] Invalid ID format: ${id}`);
             return res.status(400).json({ message: 'Invalid history record ID format.' });
         }
        next(error);
    }
};