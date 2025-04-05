import React, { useState, useEffect } from 'react';
import LocationInput from './components/LocationInput';
import WeatherDisplay from './components/WeatherDisplay';
import HistoryDisplay from './components/HistoryDisplay';
import IntegrationsDisplay from './components/IntegrationsDisplay';
import Footer from './components/Footer';
import ErrorDisplay from './components/ErrorDisplay';
import api from './services/api'; // Centralized API calls
import './App.css'; // Include Tailwind base styles indirectly via index.css

function App() {
    const [currentWeather, setCurrentWeather] = useState(null);
    const [forecast, setForecast] = useState(null);
    const [locationName, setLocationName] = useState('');
    const [history, setHistory] = useState([]);
    const [integrations, setIntegrations] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [lastQuery, setLastQuery] = useState(''); // To enable saving/integrations

    useEffect(() => {
        // Optionally fetch history on load
        fetchHistory();
    }, []);

    const handleLocationSubmit = async (query, isCoords = false) => {
        setLoading(true);
        setError(null);
        setCurrentWeather(null);
        setForecast(null);
        setIntegrations(null); // Clear integrations on new search
        setLastQuery(isCoords ? `coords:${query.lat},${query.lon}` : query); // Store query type

        try {
            let weatherData, forecastData;
            if (isCoords) {
                [weatherData, forecastData] = await Promise.all([
                    api.getCurrentWeatherByCoords(query.lat, query.lon),
                    api.getForecastByCoords(query.lat, query.lon)
                ]);
            } else {
                 [weatherData, forecastData] = await Promise.all([
                    api.getCurrentWeatherByLocation(query),
                    api.getForecastByLocation(query)
                ]);
            }

            setCurrentWeather(weatherData);
            setForecast(forecastData.forecast); // Assuming forecast API returns { forecast: [...] }
            // Use resolved location name if available, otherwise keep original query
             setLocationName(weatherData.resolvedLocationName || forecastData.location?.name || query);

        } catch (err) {
            console.error("Weather fetch error:", err);
            setError(err.message || 'Failed to fetch weather data. Please check the location or try again.');
        } finally {
            setLoading(false);
        }
    };

     const fetchHistory = async () => {
         try {
             const historyData = await api.getHistory();
             setHistory(historyData);
         } catch (err) {
             console.error("History fetch error:", err);
             // Don't necessarily show a blocking error for history fetch failure
             setError('Could not load search history.');
         }
     };

     const handleSaveSearch = async () => {
         if (!lastQuery || lastQuery.startsWith('coords:')) {
            setError("Cannot save search based on current coordinates directly. Please search by name/zip first.");
            // Or enhance backend to handle saving based on coords by reverse geocoding first
            return;
         }
         setLoading(true);
         setError(null);
         try {
             await api.saveSearch(lastQuery);
             await fetchHistory(); // Refresh history list
             alert('Search saved successfully!'); // Simple feedback
         } catch (err) {
             setError(err.message || 'Failed to save search.');
         } finally {
             setLoading(false);
         }
     };

     const handleDeleteHistory = async (id) => {
          if (!window.confirm('Are you sure you want to delete this history record?')) return;
          setLoading(true);
          setError(null);
          try {
              await api.deleteHistory(id);
              await fetchHistory(); // Refresh
          } catch (err) {
              setError(err.message || 'Failed to delete history record.');
          } finally {
              setLoading(false);
          }
     };

     // Add handlers for update, integrations fetch, export etc.
      const handleFetchIntegrations = async () => {
        if (!lastQuery || lastQuery.startsWith('coords:')) {
            setError("Please perform a search by name/zip to see integrations.");
            return;
        }
         setLoading(true);
         setError(null);
         try {
             const [mapData, youtubeData] = await Promise.all([
                 api.getMapLink(lastQuery),
                 api.getYoutubeLink(lastQuery)
             ]);
             setIntegrations({ map: mapData, youtube: youtubeData });
         } catch (err) {
             setError(err.message || 'Failed to fetch integration data.');
         } finally {
             setLoading(false);
         }
     };

     const handleExport = (format) => {
        api.exportHistory(format); // This will trigger download in api service
     };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-blue-200 p-4 sm:p-6 md:p-8">
            <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-4 sm:p-6">
                <h1 className="text-2xl sm:text-3xl font-bold text-center text-gray-800 mb-4 sm:mb-6">
                    AI Weather Hub
                </h1>

                <LocationInput onSubmit={handleLocationSubmit} loading={loading} />

                {loading && <div className="text-center my-4 text-blue-600">Loading...</div>}
                <ErrorDisplay message={error} onClose={() => setError(null)} />

                {currentWeather && forecast && (
                    <>
                         <WeatherDisplay
                             currentWeather={currentWeather}
                             forecast={forecast}
                             locationName={locationName}
                         />
                         {/* Add Buttons only after a successful search */}
                         <div className="mt-4 flex flex-wrap justify-center gap-2">
                             <button
                                 onClick={handleSaveSearch}
                                 disabled={loading || !lastQuery || lastQuery.startsWith('coords:')}
                                 className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                             >
                                 Save Search
                             </button>
                             <button
                                 onClick={handleFetchIntegrations}
                                 disabled={loading || !lastQuery || lastQuery.startsWith('coords:')}
                                 className="px-3 py-1 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
                             >
                                 Show Integrations
                             </button>
                         </div>
                          {integrations && <IntegrationsDisplay data={integrations} />}
                    </>
                )}

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

                <Footer yourName="[Your Name]" />
            </div>
        </div>
    );
}

export default App;