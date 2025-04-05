const mongoose = require('mongoose');

const weatherHistorySchema = new mongoose.Schema({
    query: { type: String, required: true }, // User's original input
    locationName: { type: String, required: true }, // Resolved City/Area Name
    country: { type: String, required: true },
    lat: { type: Number, required: true },
    lon: { type: Number, required: true },
    searchTimestamp: { type: Date, default: Date.now },
    currentWeather: {
        timestamp: { type: Number }, // dt from OWM
        temp: { type: Number },
        feels_like: { type: Number },
        humidity: { type: Number },
        pressure: { type: Number },
        wind_speed: { type: Number },
        description: { type: String },
        icon: { type: String },
    },
    forecast: [{ // Array for 5-day forecast
        dt: { type: Number },
        date: { type: String }, // Formatted date string
        temp_min: { type: Number },
        temp_max: { type: Number },
        description: { type: String },
        icon: { type: String },
    }],
    notes: { type: String, default: '' } // Added for UPDATE functionality
}, { timestamps: true }); // Adds createdAt and updatedAt

module.exports = mongoose.model('WeatherHistory', weatherHistorySchema);