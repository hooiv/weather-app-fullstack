const WeatherHistory = require('../models/WeatherHistory');
const { Parser } = require('json2csv'); // Using json2csv for CSV export

exports.exportData = async (req, res, next) => {
    const { format = 'json' } = req.query; // Default to JSON

    try {
        const historyData = await WeatherHistory.find().lean(); // Use .lean() for plain JS objects

        if (!historyData || historyData.length === 0) {
            return res.status(404).json({ message: 'No history data found to export.' });
        }

        let filename = `weather_history_export_${new Date().toISOString().split('T')[0]}`;
        let contentType = '';
        let dataOutput = '';

        switch (format.toLowerCase()) {
            case 'csv':
                contentType = 'text/csv';
                filename += '.csv';
                 // Define fields carefully, potentially flattening nested objects
                 const fields = [
                    '_id', 'query', 'locationName', 'country', 'lat', 'lon', 'searchTimestamp',
                    'currentWeather.timestamp', 'currentWeather.temp', 'currentWeather.feels_like', 'currentWeather.humidity',
                    'currentWeather.pressure', 'currentWeather.wind_speed', 'currentWeather.description', 'currentWeather.icon',
                    'notes', 'createdAt', 'updatedAt',
                     // Handle forecast array - might be better to export separately or simplify
                     { label: 'forecast_summary', value: row => row.forecast?.map(f => `${f.date}: ${f.temp_min}-${f.temp_max}C`).join(' | ') || '' }
                 ];
                const json2csvParser = new Parser({ fields });
                dataOutput = json2csvParser.parse(historyData);
                break;

            case 'json':
            default: // Default to JSON
                contentType = 'application/json';
                filename += '.json';
                dataOutput = JSON.stringify(historyData, null, 2); // Pretty print JSON
                break;

            // Add cases for XML, Markdown, PDF if needed using relevant libraries
            // case 'xml': ...
            // case 'md': ...
        }

        res.setHeader('Content-disposition', `attachment; filename=${filename}`);
        res.setHeader('Content-type', contentType);
        res.send(dataOutput);

    } catch (error) {
        next(error);
    }
};