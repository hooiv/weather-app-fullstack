const WeatherHistory = require('../models/WeatherHistory');
const axios = require('axios'); // Need axios to re-fetch weather on CREATE
const { getCoordinates } = require('./weatherController'); // Reuse geocoding

const API_KEY = process.env.OPENWEATHERMAP_API_KEY;
const BASE_URL = 'http://api.openweathermap.org/data/2.5';

// Helper function to fetch weather and forecast (similar to weatherController but returns structured data for saving)
const fetchWeatherDataForStorage = async (coords) => {
    try {
        const [weatherRes, forecastRes] = await Promise.all([
            axios.get(`${BASE_URL}/weather`, { params: { lat: coords.lat, lon: coords.lon, appid: API_KEY, units: 'metric' } }),
            axios.get(`${BASE_URL}/forecast`, { params: { lat: coords.lat, lon: coords.lon, appid: API_KEY, units: 'metric' } })
        ]);

        // Process forecast (same logic as in weatherController.getForecast)
        const dailyForecasts = {};
         forecastRes.data.list.forEach(item => {
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
        console.error("Error fetching weather for storage:", error.response ? error.response.data : error.message);
        throw new Error("Failed to fetch weather data from OpenWeatherMap.");
    }
};


// CREATE
exports.saveSearch = async (req, res, next) => {
    const { locationQuery } = req.body; // User's typed input

    if (!locationQuery) {
        return res.status(400).json({ message: 'Location query is required.' });
    }

    try {
        // 1. Geocode the user's query
        const coords = await getCoordinates(locationQuery); // Reuse from weatherController {lat, lon, name, country}

        // 2. Fetch current weather and forecast for these coordinates
        const weatherData = await fetchWeatherDataForStorage(coords);

        // 3. Create and save the history record
        const newHistory = new WeatherHistory({
            query: locationQuery,
            locationName: coords.name,
            country: coords.country,
            lat: coords.lat,
            lon: coords.lon,
            searchTimestamp: new Date(), // Explicitly set search time
            currentWeather: weatherData.currentWeather,
            forecast: weatherData.forecast,
            notes: req.body.notes || '' // Optional notes on creation
        });

        const savedHistory = await newHistory.save();
        res.status(201).json(savedHistory);

    } catch (error) {
        next(error); // Forward to global error handler
    }
};

// READ All
exports.getAllHistory = async (req, res, next) => {
    try {
        const history = await WeatherHistory.find().sort({ createdAt: -1 }); // Sort by creation date, newest first
        res.json(history);
    } catch (error) {
        next(error);
    }
};

// READ One
exports.getHistoryById = async (req, res, next) => {
    try {
        const history = await WeatherHistory.findById(req.params.id);
        if (!history) {
            return res.status(404).json({ message: 'History record not found.' });
        }
        res.json(history);
    } catch (error) {
        next(error);
    }
};

// UPDATE (e.g., adding/modifying notes)
exports.updateHistoryNotes = async (req, res, next) => {
    const { notes } = req.body;

    // Basic validation: notes should be a string if provided
    if (notes === undefined || typeof notes !== 'string') {
        return res.status(400).json({ message: 'Invalid data: notes must be a string.' });
    }

    try {
        const updatedHistory = await WeatherHistory.findByIdAndUpdate(
            req.params.id,
            { $set: { notes: notes } },
            { new: true, runValidators: true } // Return the updated doc, run schema validators
        );

        if (!updatedHistory) {
            return res.status(404).json({ message: 'History record not found.' });
        }
        res.json(updatedHistory);
    } catch (error) {
         if (error.name === 'CastError') { // Handle invalid ID format
             return res.status(400).json({ message: 'Invalid history record ID format.' });
         }
        next(error);
    }
};

// DELETE
exports.deleteHistory = async (req, res, next) => {
    try {
        const deletedHistory = await WeatherHistory.findByIdAndDelete(req.params.id);

        if (!deletedHistory) {
            return res.status(404).json({ message: 'History record not found.' });
        }
        // Send back the deleted record's ID or a success message
        res.json({ message: 'History record deleted successfully.', id: deletedHistory._id });
        // Alternative: res.status(204).send(); // No content response
    } catch (error) {
         if (error.name === 'CastError') {
             return res.status(400).json({ message: 'Invalid history record ID format.' });
         }
        next(error);
    }
};