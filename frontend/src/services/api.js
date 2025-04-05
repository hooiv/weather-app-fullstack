// frontend/src/services/api.js
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL;

const apiClient = axios.create({ /* ... (no changes needed here) ... */ });
apiClient.interceptors.response.use( /* ... (no changes needed here) ... */ );

// --- MODIFIED FUNCTIONS ---
const getCurrentWeatherByLocation = (locationData) => {
    // locationData is now { location: '...', country: '...' or null }
    // Send as query parameters
    return apiClient.get(`/weather/current`, { params: locationData }).then(res => res.data);
}
const getForecastByLocation = (locationData) => {
    // locationData is now { location: '...', country: '...' or null }
     // Send as query parameters
    return apiClient.get(`/weather/forecast`, { params: locationData }).then(res => res.data);
}
// --- END MODIFIED FUNCTIONS ---

// --- Functions using lat/lon remain the same ---
const getCurrentWeatherByCoords = (lat, lon) => apiClient.get(`/weather/current?lat=${lat}&lon=${lon}`).then(res => res.data);
const getForecastByCoords = (lat, lon) => apiClient.get(`/weather/forecast?lat=${lat}&lon=${lon}`).then(res => res.data);
// ---

// History CRUD Endpoints (Need modification if saving requires separate fields now)
const getHistory = () => apiClient.get('/history').then(res => res.data);
const saveSearch = (locationQuery, countryCode = null, notes = '') => {
    // Adapt based on how you want to save - maybe save original query and country separately
    // Option 1: Save original location query only
    // return apiClient.post('/history', { locationQuery: locationQuery + (countryCode ? `, ${countryCode}` : ''), notes }).then(res => res.data);
    // Option 2: Modify backend to accept separate fields (better)
     return apiClient.post('/history', { locationQuery, countryCode, notes }).then(res => res.data); // Requires backend historyController change
}
const updateHistoryNotes = (id, notes) => apiClient.put(`/history/${id}`, { notes }).then(res => res.data);
const deleteHistory = (id) => apiClient.delete(`/history/${id}`).then(res => res.data);

// Integration Endpoints (Need modification to send separate fields)
const getMapLink = (locationData) => apiClient.get(`/integrations/map`, { params: locationData }).then(res => res.data);
const getYoutubeLink = (locationData) => apiClient.get(`/integrations/youtube`, { params: locationData }).then(res => res.data);

// Export Endpoint
const exportHistory = (format) => { /* ... (no changes needed here) ... */ };

const api = {
    getCurrentWeatherByLocation, // Modified
    getCurrentWeatherByCoords,
    getForecastByLocation,      // Modified
    getForecastByCoords,
    getHistory,
    saveSearch,             // Modified (requires backend change too)
    updateHistoryNotes,
    deleteHistory,
    getMapLink,             // Modified (requires backend change too)
    getYoutubeLink,         // Modified (requires backend change too)
    exportHistory,
};

export default api;