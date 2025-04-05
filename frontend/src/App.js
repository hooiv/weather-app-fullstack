// frontend/src/App.js
import React, { useState, useEffect } from 'react';

// Import Components
import LocationInput from './components/LocationInput';
import WeatherDisplay from './components/WeatherDisplay';
import HistoryDisplay from './components/HistoryDisplay';
import IntegrationsDisplay from './components/IntegrationsDisplay';
import Footer from './components/Footer';
import ErrorDisplay from './components/ErrorDisplay';

// Import API service
import api from './services/api';

// Import CSS (ensure Tailwind is imported via index.css)
import './App.css';

function App() {
    // State for weather data
    const [currentWeather, setCurrentWeather] = useState(null);
    const [forecast, setForecast] = useState(null);
    const [displayLocationName, setDisplayLocationName] = useState(''); // For display

    // State for search history and integrations
    const [history, setHistory] = useState([]);
    const [integrations, setIntegrations] = useState(null);

    // State for UI control
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // State to track the last successful query's details for save/integration actions
    const [lastQueryData, setLastQueryData] = useState({ type: null, data: null });
    // type: 'coords' | 'location' | null
    // data: { lat, lon } | { location, country } | null

    // --- State for Date Range Inputs ---
    const [startDate, setStartDate] = useState(''); // Store as 'YYYY-MM-DD' string
    const [endDate, setEndDate] = useState('');   // Store as 'YYYY-MM-DD' string
    // ---

    // Fetch history on initial component mount
    useEffect(() => {
        console.log('[App] Initializing: Fetching history...');
        fetchHistory();
    }, []); // Empty dependency array ensures this runs only once on mount

    // Function to handle location submission from LocationInput component
    const handleLocationSubmit = async (queryData, isCoords = false) => {
        console.log(`[App] handleLocationSubmit called. isCoords: ${isCoords}, queryData:`, queryData);
        setLoading(true);
        setError(null);
        setCurrentWeather(null); // Clear previous results
        setForecast(null);
        setIntegrations(null); // Clear integrations on new search

        // Update last query state based on input type
        if (isCoords) {
            setLastQueryData({ type: 'coords', data: { lat: queryData.lat, lon: queryData.lon } });
        } else {
            // queryData is { location, country }
            setLastQueryData({ type: 'location', data: queryData });
        }

        try {
            let weatherData, forecastData;
            if (isCoords) {
                console.log('[App] Fetching weather/forecast by Coords:', queryData);
                // Use Promise.all to fetch both concurrently
                [weatherData, forecastData] = await Promise.all([
                    api.getCurrentWeatherByCoords(queryData.lat, queryData.lon),
                    api.getForecastByCoords(queryData.lat, queryData.lon)
                ]);
            } else {
                console.log('[App] Fetching weather/forecast by Location:', queryData);
                [weatherData, forecastData] = await Promise.all([
                    api.getCurrentWeatherByLocation(queryData), // Pass the object { location, country }
                    api.getForecastByLocation(queryData)
                ]);
            }

            console.log('[App] Weather Data Received:', weatherData);
            console.log('[App] Forecast Data Received:', forecastData);

            // Update state with fetched data
            setCurrentWeather(weatherData);
            // Ensure forecastData and forecastData.forecast exist before accessing
            setForecast(forecastData?.forecast || []); // Default to empty array if forecast is missing

            // Construct display name from resolved data or fallback
            const resolvedName = weatherData?.resolvedLocationName || forecastData?.location?.name || (isCoords ? `Lat/Lon: ${queryData.lat.toFixed(2)}, ${queryData.lon.toFixed(2)}` : queryData.location);
            const resolvedCountry = weatherData?.resolvedCountry || forecastData?.location?.country;
            const nameForDisplay = `${resolvedName}${resolvedCountry ? `, ${resolvedCountry}` : ''}`;
            console.log('[App] Setting display name:', nameForDisplay);
            setDisplayLocationName(nameForDisplay);

        } catch (err) {
            // Handle errors during fetch
            console.error("[App] Weather fetch error:", err);
            setError(err.message || 'Failed to fetch weather data. Please check the location or API status.');
            setLastQueryData({ type: null, data: null }); // Clear last query details on error
        } finally {
            // Ensure loading is set to false regardless of success/failure
            setLoading(false);
            console.log("[App] handleLocationSubmit finished.");
        }
    };

    // Function to fetch search history from the backend
     const fetchHistory = async () => {
         console.log('[App] fetchHistory called.');
         // Indicate loading history perhaps? (Optional)
         // setLoading(true); // Might interfere with weather loading
         try {
             const historyData = await api.getHistory();
             console.log('[App] History data received:', historyData);
             setHistory(historyData || []); // Ensure history is an array
         } catch (err) {
             console.error("[App] History fetch error:", err);
             // Show non-blocking error for history fetch failure
             setError(prev => prev ? `${prev}\nCould not load search history.` : 'Could not load search history.');
         } finally {
            // setLoading(false);
         }
     };

    // Function to handle saving the current search to history
     const handleSaveSearch = async () => {
         console.log('[App] handleSaveSearch called. lastQueryData:', lastQueryData);
         // Check if the last search was by location and has data
         if (lastQueryData.type !== 'location' || !lastQueryData.data?.location) {
             console.warn('[App] Save condition not met. Type:', lastQueryData.type, 'Data:', lastQueryData.data);
             setError("Cannot save: Please perform a successful search by location first.");
             return;
         }
         // Basic frontend validation for dates
         if (startDate && !endDate) {
             console.warn('[App] Save validation failed: Start date without end date.');
             setError("Please select an end date if a start date is chosen.");
             return;
         }
          if (startDate && endDate && startDate > endDate) {
              console.warn('[App] Save validation failed: Start date after end date.');
              setError("Start date cannot be after end date.");
              return;
          }

         setLoading(true); // Indicate loading during save
         setError(null);
         try {
             console.log('[App] Calling api.saveSearch with:', {
                location: lastQueryData.data.location,
                country: lastQueryData.data.country,
                startDate: startDate || null,
                endDate: endDate || null
             });
             // Pass location, country, start date, end date, and optionally notes
             await api.saveSearch(
                 lastQueryData.data.location,
                 lastQueryData.data.country, // Pass countryCode
                 startDate || null, // Pass date string or null
                 endDate || null,   // Pass date string or null
                 '' // Notes - currently empty, could add input later
             );
             console.log('[App] Save search successful.');
             await fetchHistory(); // Refresh history list after successful save
             alert('Search saved successfully!');
             // Optionally clear date fields after successful save
             // setStartDate('');
             // setEndDate('');
         } catch (err) {
             console.error("[App] Save search error:", err);
             setError(err.message || 'Failed to save search. Check backend logs.');
         } finally {
             setLoading(false);
             console.log('[App] handleSaveSearch finished.');
         }
     };

    // Function to handle deleting a history item
     const handleDeleteHistory = async (id) => {
          console.log(`[App] handleDeleteHistory called for ID: ${id}`);
          if (!id) {
            console.error('[App] Delete failed: No ID provided.');
            return;
          }
          // Confirmation dialog
          if (!window.confirm('Are you sure you want to delete this history record?')) {
            console.log('[App] Delete cancelled by user.');
            return;
          }
          setLoading(true); // Indicate loading during delete
          setError(null);
          try {
              await api.deleteHistory(id);
              console.log(`[App] Delete successful for ID: ${id}`);
              await fetchHistory(); // Refresh history list
          } catch (err) {
              console.error("[App] Delete history error:", err);
              setError(err.message || 'Failed to delete history record.');
          } finally {
              setLoading(false);
              console.log('[App] handleDeleteHistory finished.');
          }
     };

    // Function to fetch integration links (Maps, YouTube)
      const handleFetchIntegrations = async () => {
         console.log('[App] handleFetchIntegrations called. lastQueryData:', lastQueryData);
        // Check if the last search was by location
        if (lastQueryData.type !== 'location' || !lastQueryData.data?.location) {
            console.warn('[App] Fetch integrations condition not met.');
            setError("Please perform a successful search by name/zip to see integrations.");
            return;
        }
         setLoading(true); // Indicate loading
         setError(null);
         setIntegrations(null); // Clear previous integrations
         try {
            // Pass the location/country object to the API calls
             const locationDataForApi = lastQueryData.data;
             console.log('[App] Calling integration APIs with:', locationDataForApi);
             const [mapData, youtubeData] = await Promise.all([
                 api.getMapLink(locationDataForApi),
                 api.getYoutubeLink(locationDataForApi)
             ]);
             console.log('[App] Integration data received:', { mapData, youtubeData });
             setIntegrations({ map: mapData, youtube: youtubeData });
         } catch (err) {
             console.error("[App] Fetch integrations error:", err);
             setError(err.message || 'Failed to fetch integration data.');
         } finally {
             setLoading(false);
             console.log('[App] handleFetchIntegrations finished.');
         }
     };

    // Function to trigger data export
     const handleExport = (format) => {
        console.log(`[App] handleExport called for format: ${format}`);
        if (history.length === 0) {
            alert("No history data to export.");
            return;
        }
        try {
             api.exportHistory(format); // This triggers download in api.js
        } catch (err) {
             console.error("[App] Export error (though likely handled by api.js):", err);
             setError("Failed to initiate export.");
        }
     };

    // Determine if Save/Integrate buttons should be enabled
    const canSaveOrIntegrate = lastQueryData.type === 'location' && !!lastQueryData.data?.location;
    console.log('[App] Render check - canSaveOrIntegrate:', canSaveOrIntegrate);

    // Render the UI
    return (
        // Main container with background and padding
        <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-blue-200 p-4 sm:p-6 md:p-8 font-sans">
            {/* Centered content card */}
            <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-4 sm:p-6">
                {/* App Title */}
                <h1 className="text-2xl sm:text-3xl font-bold text-center text-gray-800 mb-4 sm:mb-6">
                    Global Weather Search
                </h1>

                {/* Location Input Component */}
                <LocationInput
                    onSubmit={handleLocationSubmit}
                    loading={loading}
                    // Pass date state and setters
                    startDate={startDate}
                    setStartDate={setStartDate}
                    endDate={endDate}
                    setEndDate={setEndDate}
                />

                {/* Loading Indicator */}
                {loading && <div className="text-center my-4 text-blue-600 animate-pulse">Loading...</div>}

                {/* Error Display Component */}
                <ErrorDisplay message={error} onClose={() => setError(null)} />

                {/* Conditional rendering for Weather Display and Action Buttons */}
                {currentWeather && forecast && (
                    <>
                         {/* Weather Display Component */}
                         <WeatherDisplay
                             currentWeather={currentWeather}
                             forecast={forecast}
                             locationName={displayLocationName} // Use state variable for consistent display name
                         />
                         {/* Action Buttons Container */}
                         <div className="mt-4 flex flex-wrap justify-center items-center gap-2 md:gap-4">
                             {/* Save Search Button */}
                             <button
                                 onClick={handleSaveSearch}
                                 disabled={loading || !canSaveOrIntegrate} // Updated disabled logic
                                 className="px-4 py-2 text-sm bg-green-500 text-white rounded-md shadow hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-75 transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
                             >
                                 Save Search {startDate && endDate ? 'with Dates' : ''}
                             </button>
                             {/* Show Integrations Button */}
                             <button
                                 onClick={handleFetchIntegrations}
                                 disabled={loading || !canSaveOrIntegrate} // Updated disabled logic
                                 className="px-4 py-2 text-sm bg-purple-500 text-white rounded-md shadow hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-opacity-75 transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
                             >
                                 Show Integrations
                             </button>
                         </div>
                         {/* Integrations Display Component */}
                          {integrations && <IntegrationsDisplay data={integrations} />}
                    </>
                )}

                {/* Search History Display Component */}
                <HistoryDisplay
                    history={history}
                    onDelete={handleDeleteHistory}
                    loading={loading} // Pass loading state to disable delete during other actions
                />

                 {/* Export Section */}
                 <div className="mt-8 pt-6 border-t border-gray-200 text-center">
                     <h3 className="text-lg font-semibold mb-3 text-gray-700">Export History</h3>
                     <div className="flex justify-center gap-3">
                         <button
                             onClick={() => handleExport('json')}
                             disabled={loading || history.length === 0} // Disable if loading or no history
                             className="px-4 py-2 text-sm bg-gray-700 text-white rounded-md shadow hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-75 transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
                         >
                             Export JSON
                         </button>
                         <button
                             onClick={() => handleExport('csv')}
                             disabled={loading || history.length === 0} // Disable if loading or no history
                             className="px-4 py-2 text-sm bg-gray-700 text-white rounded-md shadow hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-75 transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
                         >
                             Export CSV
                         </button>
                     </div>
                 </div>

                {/* Footer Component */}
                <Footer yourName="[Your Name]" /> {/* <<< Replace [Your Name] */}
            </div>
        </div>
    );
}

export default App;