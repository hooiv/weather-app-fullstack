// frontend/src/App.js
import React, { useState, useEffect } from 'react';
import LocationInput from './components/LocationInput';
import WeatherDisplay from './components/WeatherDisplay';
import HistoryDisplay from './components/HistoryDisplay';
import IntegrationsDisplay from './components/IntegrationsDisplay';
import Footer from './components/Footer';
import ErrorDisplay from './components/ErrorDisplay';
import api from './services/api';
import './App.css'; // Assuming Tailwind is imported via index.css

function App() {
    const [currentWeather, setCurrentWeather] = useState(null);
    const [forecast, setForecast] = useState(null);
    const [displayLocationName, setDisplayLocationName] = useState(''); // For display purposes
    const [history, setHistory] = useState([]);
    const [integrations, setIntegrations] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // --- MODIFIED: Store type and data needed for later actions ---
    const [lastQueryData, setLastQueryData] = useState({ type: null, data: null });
    // type: 'coords' | 'location' | null
    // data: { lat, lon } | { location, country } | null

    useEffect(() => {
        fetchHistory();
    }, []);

    const handleLocationSubmit = async (queryData, isCoords = false) => {
        setLoading(true);
        setError(null);
        setCurrentWeather(null);
        setForecast(null);
        setIntegrations(null);

        // --- MODIFIED: Set lastQueryData based on input type ---
        if (isCoords) {
            setLastQueryData({ type: 'coords', data: { lat: queryData.lat, lon: queryData.lon } });
        } else {
            // queryData is { location, country }
            setLastQueryData({ type: 'location', data: queryData });
        }
        // ---

        try {
            let weatherData, forecastData;
            if (isCoords) {
                console.log('[App] Fetching by Coords:', queryData);
                [weatherData, forecastData] = await Promise.all([
                    api.getCurrentWeatherByCoords(queryData.lat, queryData.lon),
                    api.getForecastByCoords(queryData.lat, queryData.lon)
                ]);
            } else {
                console.log('[App] Fetching by Location:', queryData);
                [weatherData, forecastData] = await Promise.all([
                    api.getCurrentWeatherByLocation(queryData), // Pass the object { location, country }
                    api.getForecastByLocation(queryData)
                ]);
            }

            console.log('[App] Weather Data Received:', weatherData);
            console.log('[App] Forecast Data Received:', forecastData);

            setCurrentWeather(weatherData);
            setForecast(forecastData.forecast); // Assuming forecast API returns { forecast: [...] }

            // Use resolved location name for display
            const resolvedName = weatherData.resolvedLocationName || forecastData.location?.name || (isCoords ? `Lat/Lon: ${queryData.lat.toFixed(2)}, ${queryData.lon.toFixed(2)}` : queryData.location);
            const resolvedCountry = weatherData.resolvedCountry || forecastData.location?.country;
            setDisplayLocationName(`${resolvedName}${resolvedCountry ? `, ${resolvedCountry}` : ''}`);

        } catch (err) {
            console.error("[App] Weather fetch error:", err);
            setError(err.message || 'Failed to fetch weather data. Please check the location or try again.');
             setLastQueryData({ type: null, data: null }); // Clear last query on error
        } finally {
            setLoading(false);
        }
    };

     const fetchHistory = async () => {
         // ... (fetch history logic - no changes needed) ...
         try {
            const historyData = await api.getHistory();
            setHistory(historyData);
        } catch (err) {
            console.error("[App] History fetch error:", err);
            setError('Could not load search history.');
        }
     };

    // --- MODIFIED: Use lastQueryData ---
     const handleSaveSearch = async () => {
         if (lastQueryData.type !== 'location' || !lastQueryData.data?.location) {
            setError("Cannot save search based on current coordinates directly or if no location search was performed.");
            return;
         }
         setLoading(true);
         setError(null);
         try {
             // Pass location and country separately to api.saveSearch
             await api.saveSearch(lastQueryData.data.location, lastQueryData.data.country);
             await fetchHistory(); // Refresh history list
             alert('Search saved successfully!');
         } catch (err) {
             console.error("[App] Save search error:", err);
             setError(err.message || 'Failed to save search.');
         } finally {
             setLoading(false);
         }
     };

     const handleDeleteHistory = async (id) => {
          // ... (delete history logic - no changes needed) ...
           if (!window.confirm('Are you sure you want to delete this history record?')) return;
           setLoading(true);
           setError(null);
           try {
               await api.deleteHistory(id);
               await fetchHistory(); // Refresh
           } catch (err) {
                console.error("[App] Delete history error:", err);
               setError(err.message || 'Failed to delete history record.');
           } finally {
               setLoading(false);
           }
     };

     // --- MODIFIED: Use lastQueryData ---
      const handleFetchIntegrations = async () => {
        if (lastQueryData.type !== 'location' || !lastQueryData.data?.location) {
            setError("Please perform a search by name/zip to see integrations.");
            return;
        }
         setLoading(true);
         setError(null);
         try {
            // Pass the location/country object to the API calls
             const locationDataForApi = lastQueryData.data;
             const [mapData, youtubeData] = await Promise.all([
                 api.getMapLink(locationDataForApi),
                 api.getYoutubeLink(locationDataForApi)
             ]);
             setIntegrations({ map: mapData, youtube: youtubeData });
         } catch (err) {
             console.error("[App] Fetch integrations error:", err);
             setError(err.message || 'Failed to fetch integration data.');
         } finally {
             setLoading(false);
         }
     };

     const handleExport = (format) => {
        console.log(`[App] Initiating export format: ${format}`);
        api.exportHistory(format); // This will trigger download in api service
     };

    // --- Determine if buttons should be disabled based on lastQueryData ---
    const canSaveOrIntegrate = lastQueryData.type === 'location' && !!lastQueryData.data?.location;

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-blue-200 p-4 sm:p-6 md:p-8">
            <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-4 sm:p-6">
                <h1 className="text-2xl sm:text-3xl font-bold text-center text-gray-800 mb-4 sm:mb-6">
                    AI Weather Hub
                </h1>

                {/* Pass handleLocationSubmit to LocationInput */}
                <LocationInput onSubmit={handleLocationSubmit} loading={loading} />

                {loading && <div className="text-center my-4 text-blue-600">Loading...</div>}
                {/* Pass error and onClose handler to ErrorDisplay */}
                <ErrorDisplay message={error} onClose={() => setError(null)} />

                {currentWeather && forecast && (
                    <>
                         {/* Pass weather data and display name */}
                         <WeatherDisplay
                             currentWeather={currentWeather}
                             forecast={forecast}
                             locationName={displayLocationName} // Use the state variable for display
                         />
                         <div className="mt-4 flex flex-wrap justify-center gap-2">
                            {/* --- MODIFIED: Update disabled logic --- */}
                             <button
                                 onClick={handleSaveSearch}
                                 disabled={loading || !canSaveOrIntegrate}
                                 className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                             >
                                 Save Search
                             </button>
                             <button
                                 onClick={handleFetchIntegrations}
                                 disabled={loading || !canSaveOrIntegrate}
                                 className="px-3 py-1 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
                             >
                                 Show Integrations
                             </button>
                         </div>
                          {integrations && <IntegrationsDisplay data={integrations} />}
                    </>
                )}

                {/* Pass history data and delete handler */}
                <HistoryDisplay
                    history={history}
                    onDelete={handleDeleteHistory}
                    loading={loading}
                />

                 {/* Export Section */}
                 <div className="mt-6 pt-4 border-t text-center">
                     <h3 className="text-lg font-semibold mb-2">Export History</h3>
                     <button
                         onClick={() => handleExport('json')}
                         disabled={loading || history.length === 0}
                         className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50 mr-2"
                     >
                         Export JSON
                     </button>
                     <button
                         onClick={() => handleExport('csv')}
                         disabled={loading || history.length === 0}
                         className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50"
                     >
                         Export CSV
                     </button>
                 </div>

                {/* Pass your name */}
                <Footer yourName="[Your Name]" /> {/* Replace [Your Name] */}
            </div>
        </div>
    );
}

export default App;