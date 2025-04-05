// backend/routes/integrationRoutes.js
const express = require('express');
const integrationController = require('../controllers/integrationController'); // Make sure controller path is correct
const router = express.Router();

// GET /api/integrations/map?location=... - Get Google Maps link
router.get('/map', integrationController.getMapLink);

// GET /api/integrations/youtube?location=... - Get YouTube search link
router.get('/youtube', integrationController.getYoutubeLink);

// Add more integration routes here if needed

module.exports = router;