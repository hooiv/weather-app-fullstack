const axios = require('axios');
const API_KEY = process.env.OPENWEATHERMAP_API_KEY;
const BASE_URL = 'http://api.openweathermap.org/data/2.5';
const GEO_URL = 'http://api.openweathermap.org/geo/1.0';

// Helper to get coordinates (handles city name, zip)
const getCoordinates = async (location) => {
    try {
        let geoResponse;
        // Basic check if it might be a zip code (US/simple format)
        if (/^\d{5}(-\d{4})?$/.test(location) || /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/.test(location)) { // Simple US/Canada zip/postal
             geoResponse = await axios.get(`${GEO_URL}/zip`, {
                params: { zip: location, appid: API_KEY }
            });
             // OWM zip often lacks country, add it if needed based on format
             if (!geoResponse.data.country && /^\d{5}/.test(location)) geoResponse.data.country = 'US';
             if (!geoResponse.data.country && /^[A-Za-z]\d[A-Za-z]/.test(location)) geoResponse.data.country = 'CA'; // Assume Canada
        } else {
            // Assume city name
            geoResponse = await axios.get(`${GEO_URL}/direct`, {
                params: { q: location, limit: 1, appid: API_KEY }
            });
            // Use the first result if available
            if (!geoResponse.data || geoResponse.data.length === 0) {
                 throw new Error('Location not found.');
            }
            // Extract data from the first element of the array
            const { lat, lon, name, country } = geoResponse.data[0];
            return { lat, lon, name, country }; // Return full object
        }

        // For zip code response
        if (!geoResponse.data || !geoResponse.data.lat) {
             throw new Error('Location not found from zip/postal code.');
        }
         // Zip response structure is different
        return {
            lat: geoResponse.data.lat,
            lon: geoResponse.data.lon,
            name: geoResponse.data.name, // City name from zip
            country: geoResponse.data.country || 'Unknown' // Country might be missing
         };

    } catch (error) {
        console.error("Geocoding Error:", error.response ? error.response.data : error.message);
         if (error.response && error.response.status === 404) {
             throw new Error('Location not found.');
         } else if (error.message === 'Location not found.' || error.message.includes('Location not found')) {
            throw error; // Re-throw specific error
        }
        throw new Error('Failed to geocode location.');
    }
};


exports.getCurrentWeather = async (req, res, next) => {
    const { location, lat, lon } = req.query;
    let coords;

    try {
        if (lat && lon) {
            coords = { lat: parseFloat(lat), lon: parseFloat(lon) };
             // Optional: Reverse geocode to get name/country if needed for consistency
             const reverseGeo = await axios.get(`${GEO_URL}/reverse`, { params: { lat, lon, limit: 1, appid: API_KEY } });
             if (reverseGeo.data && reverseGeo.data.length > 0) {
                 coords.name = reverseGeo.data[0].name;
                 coords.country = reverseGeo.data[0].country;
             } else {
                 coords.name = "Unknown Location";
                 coords.country = "";
             }
        } else if (location) {
            coords = await getCoordinates(location); // Gets {lat, lon, name, country}
        } else {
            return res.status(400).json({ message: 'Location or coordinates are required.' });
        }

        const weatherResponse = await axios.get(`${BASE_URL}/weather`, {
            params: {
                lat: coords.lat,
                lon: coords.lon,
                appid: API_KEY,
                units: 'metric' // Or 'imperial'
            }
        });

        // Add resolved location name from geocoding back to the response
        const responseData = {
             ...weatherResponse.data,
             resolvedLocationName: coords.name, // Add resolved name
             resolvedCountry: coords.country    // Add resolved country
         };

        res.json(responseData);

    } catch (error) {
        next(error); // Pass error to global handler
    }
};

exports.getForecast = async (req, res, next) => {
     const { location, lat, lon } = req.query;
     let coords;

     try {
        if (lat && lon) {
            coords = { lat: parseFloat(lat), lon: parseFloat(lon) };
             // Optional: Reverse geocode for name/country
             const reverseGeo = await axios.get(`${GEO_URL}/reverse`, { params: { lat, lon, limit: 1, appid: API_KEY } });
             if (reverseGeo.data && reverseGeo.data.length > 0) {
                 coords.name = reverseGeo.data[0].name;
                 coords.country = reverseGeo.data[0].country;
             } else {
                 coords.name = "Unknown Location";
                 coords.country = "";
             }
        } else if (location) {
            coords = await getCoordinates(location);
        } else {
             return res.status(400).json({ message: 'Location or coordinates are required.' });
        }

        // Use 5 day / 3 hour forecast endpoint
         const forecastResponse = await axios.get(`${BASE_URL}/forecast`, {
            params: {
                lat: coords.lat,
                lon: coords.lon,
                appid: API_KEY,
                units: 'metric' // Or 'imperial'
            }
         });

        // Process the forecast data to get daily summaries
        const dailyForecasts = {};
        forecastResponse.data.list.forEach(item => {
            const date = new Date(item.dt * 1000).toISOString().split('T')[0]; // Get YYYY-MM-DD
            if (!dailyForecasts[date]) {
                dailyForecasts[date] = {
                    date: date,
                    temps: [],
                    humidities: [],
                    descriptions: new Set(),
                    icons: new Set(),
                    dt: item.dt // Store first timestamp for the day
                };
            }
            dailyForecasts[date].temps.push(item.main.temp);
            dailyForecasts[date].humidities.push(item.main.humidity); // Example: Store humidity too
            dailyForecasts[date].descriptions.add(item.weather[0].description);
            dailyForecasts[date].icons.add(item.weather[0].icon.substring(0, 2) + 'd'); // Use day icon consistently
        });

        const processedForecast = Object.values(dailyForecasts).map(day => {
            // Find min/max temp for the day
            const temp_min = Math.min(...day.temps);
            const temp_max = Math.max(...day.temps);
            // Choose the most frequent or representative icon/description (simple: first icon)
            const icon = day.icons.values().next().value || '01d'; // Default icon
             // Aggregate descriptions (simple: join unique ones)
            const description = Array.from(day.descriptions).join(', ');

            return {
                dt: day.dt, // Timestamp for sorting/reference
                date: day.date,
                temp_min,
                temp_max,
                description,
                icon
            };
        }).slice(0, 5); // Ensure only 5 days

         // Add resolved location name back to the response
         const responseData = {
             forecast: processedForecast,
             location: { // Include location details from geocoding
                 name: coords.name,
                 country: coords.country,
                 lat: coords.lat,
                 lon: coords.lon
             },
             city: forecastResponse.data.city // Original city info from API if needed
         };


        res.json(responseData);

     } catch (error) {
         next(error);
     }
};