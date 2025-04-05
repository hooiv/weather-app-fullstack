const express = require('express');
const weatherController = require('../controllers/weatherController'); // Correct path to controller
const router = express.Router();

router.get('/current', weatherController.getCurrentWeather);
router.get('/forecast', weatherController.getForecast);

module.exports = router;