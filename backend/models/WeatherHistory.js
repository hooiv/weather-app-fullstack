// backend/models/WeatherHistory.js
const mongoose = require('mongoose');

const weatherHistorySchema = new mongoose.Schema({
    query: { type: String, required: true }, // User's original location input
    countryQuery: { type: String }, // Optional: Store user's country input
    locationName: { type: String, required: true }, // Resolved City/Area Name
    country: { type: String }, // Resolved Country code
    lat: { type: Number, required: true },
    lon: { type: Number, required: true },
    searchTimestamp: { type: Date, default: Date.now }, // When the search was performed
    // --- NEW FIELDS for Date Range ---
    startDate: { type: Date }, // User's specified start date (optional)
    endDate: { type: Date },   // User's specified end date (optional)
    // ---
    currentWeather: { // Weather at the time of search
        timestamp: { type: Number },
        temp: { type: Number },
        feels_like: { type: Number },
        humidity: { type: Number },
        pressure: { type: Number },
        wind_speed: { type: Number },
        description: { type: String },
        icon: { type: String },
    },
    forecast: [{ // 5-day forecast at the time of search
        dt: { type: Number },
        date: { type: String },
        temp_min: { type: Number },
        temp_max: { type: Number },
        description: { type: String },
        icon: { type: String },
    }],
    notes: { type: String, default: '' }
}, { timestamps: true }); // Adds createdAt and updatedAt

module.exports = mongoose.model('WeatherHistory', weatherHistorySchema);