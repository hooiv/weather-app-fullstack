// backend/index.js (Previously server.js)
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// Route Imports (Ensure paths are correct relative to index.js)
const weatherRoutes = require('./routes/weatherRoutes');
const historyRoutes = require('./routes/historyRoutes');
const integrationRoutes = require('./routes/integrationRoutes');
const exportRoutes = require('./routes/exportRoutes');

const app = express();
// Note: Vercel sets the PORT environment variable automatically.
// const PORT = process.env.PORT || 5001; // PORT constant not needed for listen

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL || '*' })); // FRONTEND_URL env var is crucial
app.use(express.json());
app.use((req, res, next) => {
    console.log(`[Server] Vercel Request: ${req.method} ${req.originalUrl}`); // Use req.originalUrl
    next();
});

// Database Connection (Connect immediately)
// Consider adding error handling here if connection fails on startup
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('[Server] MongoDB Connected Successfully.'))
    .catch(err => {
         console.error('[Server] MongoDB Connection Error:', err);
         // Optional: Exit process if DB connection is critical for startup?
         // process.exit(1);
    });

// API Routes - IMPORTANT: Ensure base paths match what vercel.json routes expect
app.use('/api/weather', weatherRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/export', exportRoutes);

// Basic root route for health check/info within the /api path if routed
// Or handle this via vercel.json routes separately if needed at root '/'
app.get('/api', (req, res) => {
    res.send('Weather App Backend API is Running (Vercel)');
});

// Global Error Handler (Keep this as the LAST middleware)
app.use((err, req, res, next) => {
    console.error('--- Global Error Handler Triggered ---');
    console.error(`Timestamp: ${new Date().toISOString()}`);
    console.error(`Route: ${req.method} ${req.originalUrl}`);
    const statusCode = err.status || 500;
    const message = err.message || 'An internal server error occurred.';
    console.error(`Status: ${statusCode}`);
    console.error(`Message: ${message}`);
    console.error('Stack Trace:');
    console.error(err.stack);

    const errorResponse = { message };
    if (process.env.NODE_ENV === 'development' && err.stack) {
        errorResponse.stack = err.stack;
    }
    res.status(statusCode).json(errorResponse);
});

// --- REMOVE app.listen() ---
// app.listen(PORT, () => {
//     console.log(`[Server] Successfully started on port ${PORT}`);
// });

// --- EXPORT THE EXPRESS APP ---
module.exports = app;