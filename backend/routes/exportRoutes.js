// backend/routes/exportRoutes.js
const express = require('express');
const exportController = require('../controllers/exportController'); // Make sure controller path is correct
const router = express.Router();

// GET /api/export?format=json (or csv, etc.) - Export history data
router.get('/', exportController.exportData);

module.exports = router;