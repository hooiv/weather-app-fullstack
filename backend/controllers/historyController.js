// backend/controllers/historyController.js
const WeatherHistory = require('../models/WeatherHistory');
const axios = require('axios');
const { getCoordinates } = require('./weatherController'); // Ensure this is imported

const API_KEY = process.env.OPENWEATHERMAP_API_KEY;
const BASE_URL = 'http://api.openweathermap.org/data/2.5';

// Helper function (ensure it's present and correct)
const fetchWeatherDataForStorage = async (coords) => { /* ... */ };

// --- Utility for Date Validation --- (Could be moved to utils/validators.js)
const validateDateRange = (startDateStr, endDateStr) => {
     // Only validate if at least one date is provided
     if (!startDateStr && !endDateStr) {
         return { isValid: true, error: null, dates: { startDate: null, endDate: null } };
     }
     // If only one is provided, it's currently considered invalid for a 'range' by FE, but backend could allow just one
     if (!startDateStr || !endDateStr) {
        // return { isValid: false, error: "Both start and end dates are required if specifying a range." };
        // OR allow single dates:
         const singleDate = startDateStr ? new Date(startDateStr) : new Date(endDateStr);
         if (isNaN(singleDate.getTime())) {
            return { isValid: false, error: "Invalid date format provided.", dates: {} };
         }
          // Optional: Check if date is not too far in past/future if needed
         return { isValid: true, error: null, dates: { startDate: startDateStr? singleDate: null, endDate: endDateStr? singleDate: null } };
     }

     const startDate = new Date(startDateStr);
     const endDate = new Date(endDateStr);

     if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return { isValid: false, error: "Invalid date format. Please use YYYY-MM-DD.", dates: {} };
     }

     // Set time to start/end of day for comparison consistency
     startDate.setHours(0, 0, 0, 0);
     endDate.setHours(23, 59, 59, 999);

     if (startDate > endDate) {
        return { isValid: false, error: "Start date cannot be after end date.", dates: {} };
     }

     // Optional: Add further constraints (e.g., range not too long, not too far in future/past)
     // const today = new Date(); today.setHours(0, 0, 0, 0);
     // if (startDate < today) {
     //    return { isValid: false, error: "Start date cannot be in the past." };
     // }

    return { isValid: true, error: null, dates: { startDate, endDate } }; // Return validated Date objects
};
// --- End Utility ---

// CREATE
exports.saveSearch = async (req, res, next) => {
    console.log('[saveSearch] Received request body:', req.body);
    // --- Get dates from body ---
    const { locationQuery, countryCode, startDate: startDateStr, endDate: endDateStr, notes } = req.body;

    if (!locationQuery) {
         console.error('[saveSearch] Bad Request: locationQuery is required.');
         return res.status(400).json({ message: 'Location query is required.' });
    }

    // --- Validate Date Range ---
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
        // 1. Geocode (already validated to exist if successful)
        const coords = await getCoordinates(locationQuery, countryCode);

        console.log('[saveSearch] Coordinates obtained:', coords);
        console.log('[saveSearch] Fetching weather data for storage...');
        // 2. Fetch current weather/forecast data
        const weatherData = await fetchWeatherDataForStorage(coords);

        console.log('[saveSearch] Weather data fetched successfully.');

        // 3. Create and save the history record including dates
        const newHistory = new WeatherHistory({
            query: locationQuery,
            countryQuery: countryCode, // Store user input country code if desired
            locationName: coords.name,
            country: coords.country,
            lat: coords.lat,
            lon: coords.lon,
            searchTimestamp: new Date(),
            startDate: startDate, // Store validated start date (or null)
            endDate: endDate,     // Store validated end date (or null)
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
        // Pass error to global handler - ensure getCoordinates throws clear errors
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