// backend/server.js
require('dotenv').config(); // Make sure this is at the top
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// --- Route Imports ---
// Make sure these paths are correct relative to server.js
const weatherRoutes = require('./routes/weatherRoutes');
const historyRoutes = require('./routes/historyRoutes');
const integrationRoutes = require('./routes/integrationRoutes');
const exportRoutes = require('./routes/exportRoutes');
// --- End Route Imports ---

const app = express();
const PORT = process.env.PORT || 5001;

// --- Middleware ---
// Use CORS - configure origin carefully for production
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json()); // Parse JSON request bodies
// Optional: Log incoming requests
app.use((req, res, next) => {
    console.log(`[Server] Request: ${req.method} ${req.path}`);
    next();
});
// --- End Middleware ---

// --- Database Connection ---
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('[Server] MongoDB Connected Successfully.'))
    .catch(err => console.error('[Server] MongoDB Connection Error:', err)); // Log DB connection errors
// --- End Database Connection ---

// --- API Routes ---
// Ensure base paths are correct
app.use('/api/weather', weatherRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/export', exportRoutes);
// --- End API Routes ---

// Basic root route for health check/info
app.get('/', (req, res) => {
    res.send('Weather App Backend API is Running');
});

// --- Global Error Handler (MUST be LAST middleware) ---
app.use((err, req, res, next) => {
    console.error('--- Global Error Handler Triggered ---');
    console.error(`Timestamp: ${new Date().toISOString()}`);
    console.error(`Route: ${req.method} ${req.originalUrl}`);
    // Use err.status if provided by previous middleware/route, otherwise default to 500
    const statusCode = err.status || 500;
    // Ensure a message exists
    const message = err.message || 'An internal server error occurred.';
    console.error(`Status: ${statusCode}`);
    console.error(`Message: ${message}`);
    console.error('Stack Trace:');
    console.error(err.stack); // Log the full stack trace

    // Avoid sending stack trace in production
    const errorResponse = { message };
    if (process.env.NODE_ENV === 'development' && err.stack) {
        errorResponse.stack = err.stack; // Include stack trace only in development
    }

    // Send JSON response
    res.status(statusCode).json(errorResponse);
});
// --- End Global Error Handler ---

// --- Start Server ---
app.listen(PORT, () => {
    console.log(`[Server] Successfully started on port ${PORT}`);
});
// --- End Start Server ---