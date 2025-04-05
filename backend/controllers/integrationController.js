const { getCoordinates } = require('./weatherController'); // Reuse geocoding

exports.getMapLink = async (req, res, next) => {
    const { location } = req.query;
    if (!location) {
        return res.status(400).json({ message: 'Location query is required.' });
    }
    try {
        // Get coords to make the map link more precise if possible
        const coords = await getCoordinates(location);
        // Construct Google Maps search URL
        const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(coords.name + ', ' + coords.country)}`;
        // Or use lat/lon: `https://www.google.com/maps?q=${coords.lat},${coords.lon}`;
        res.json({ mapUrl: mapUrl, locationName: coords.name });
    } catch (error) {
        // If geocoding fails, provide a link based on the original query
        console.warn("Map link using raw query due to geocoding error:", error.message);
        const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
        res.json({ mapUrl: mapUrl, locationName: location });
        // Or pass the error: next(error);
    }
};

exports.getYoutubeLink = async (req, res, next) => {
    const { location } = req.query;
     if (!location) {
         return res.status(400).json({ message: 'Location query is required.' });
     }
    try {
        // Try to get a more specific location name
        const coords = await getCoordinates(location);
        const searchLocation = coords.name && coords.country ? `${coords.name} ${coords.country}` : location;
         const youtubeUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchLocation + ' travel vlog OR tourism')}`; // Example search query
        res.json({ youtubeUrl: youtubeUrl, locationName: searchLocation });
    } catch (error) {
         console.warn("YouTube link using raw query due to geocoding error:", error.message);
         const youtubeUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(location + ' travel vlog OR tourism')}`;
         res.json({ youtubeUrl: youtubeUrl, locationName: location });
        // Or pass the error: next(error);
    }
};