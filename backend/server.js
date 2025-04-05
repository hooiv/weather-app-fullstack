// backend/server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const weatherRoutes = require('./routes/weatherRoutes');
const historyRoutes = require('./routes/historyRoutes');
const integrationRoutes = require('./routes/integrationRoutes');
const exportRoutes = require('./routes/exportRoutes');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL || '*' })); // Allow requests from frontend
app.use(express.json()); // Parse JSON bodies

// Database Connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.error('MongoDB Connection Error:', err));

// API Routes
app.use('/api/weather', weatherRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/export', exportRoutes);

// Basic root route
app.get('/', (req, res) => {
    res.send('Weather App Backend Running');
});

// Global Error Handler (should be last)
app.use((err, req, res, next) => {
    // --- ADD LOGGING ---
    console.error('--- Global Error Handler Triggered ---');
    console.error(`Timestamp: ${new Date().toISOString()}`);
    console.error(`Requested URL: ${req.originalUrl}`);
    console.error(`Error Status: ${err.status || 500}`);
    console.error(`Error Message: ${err.message || 'An unexpected error occurred.'}`);
    console.error('Error Stack Trace:');
    console.error(err.stack); // Ensure stack trace is logged
    // --- END LOGGING ---

    res.status(err.status || 500).json({
        message: err.message || 'An unexpected error occurred.',
        // Only include detailed error in development environment for security
        error: process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}
    });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});