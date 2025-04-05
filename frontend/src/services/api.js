// frontend/src/services/api.js
import axios from 'axios';

// Ensure this points to your backend API base URL
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api'; // Added fallback
console.log(`[api.js] Using API Base URL: ${API_BASE_URL}`); // Log base URL

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add error interceptor for better logging/handling
apiClient.interceptors.response.use(
    response => response,
    error => {
        // Log the error received by the interceptor
        console.error('[api.js] Interceptor caught error:', error);

        const message = error.response?.data?.message || error.message || 'An unknown API error occurred';

        // Log the specific message being rejected
        console.error(`[api.js] Rejecting with message: ${message}`);

        // Return a rejected promise with an Error object for consistency
        return Promise.reject(new Error(message));
    }
);

// --- MODIFIED FUNCTIONS TO SEND locationData OBJECT as PARAMS ---
const getCurrentWeatherByLocation = (locationData) => {
    // locationData is { location: '...', country: '...' or null }
    console.log('[api.js] getCurrentWeatherByLocation called with:', locationData);
    // Send as query parameters using the 'params' option in Axios GET
    return apiClient.get(`/weather/current`, { params: locationData }).then(res => {
         console.log('[api.js] getCurrentWeatherByLocation response:', res.data);
         return res.data;
     });
}
const getForecastByLocation = (locationData) => {
    // locationData is { location: '...', country: '...' or null }
    console.log('[api.js] getForecastByLocation called with:', locationData);
     // Send as query parameters
    return apiClient.get(`/weather/forecast`, { params: locationData }).then(res => {
         console.log('[api.js] getForecastByLocation response:', res.data);
         return res.data;
     });
}
// --- END MODIFIED FUNCTIONS ---

// --- Functions using lat/lon remain the same ---
const getCurrentWeatherByCoords = (lat, lon) => {
    console.log('[api.js] getCurrentWeatherByCoords called with:', { lat, lon });
    return apiClient.get(`/weather/current`, { params: { lat, lon } }).then(res => {
        console.log('[api.js] getCurrentWeatherByCoords response:', res.data);
        return res.data;
    });
};
const getForecastByCoords = (lat, lon) => {
    console.log('[api.js] getForecastByCoords called with:', { lat, lon });
    return apiClient.get(`/weather/forecast`, { params: { lat, lon } }).then(res => {
        console.log('[api.js] getForecastByCoords response:', res.data);
        return res.data;
    });
};
// ---

// History CRUD Endpoints (Adapt saveSearch based on backend expectations)
const getHistory = () => {
    console.log('[api.js] getHistory called');
    return apiClient.get('/history').then(res => {
        console.log('[api.js] getHistory response:', res.data);
        return res.data;
    });
}

const saveSearch = (locationQuery, countryCode = null, startDate = null, endDate = null, notes = '') => {
    // Backend expects these fields in the body now
    const payload = { locationQuery, countryCode, startDate, endDate, notes };
    console.log('[api.js] saveSearch called with payload:', payload);
     return apiClient.post('/history', payload).then(res => {
         console.log('[api.js] saveSearch response:', res.data);
         return res.data;
     });
}
const updateHistoryNotes = (id, notes) => {
    const payload = { notes };
    console.log(`[api.js] updateHistoryNotes called for id ${id} with payload:`, payload);
    return apiClient.put(`/history/${id}`, payload).then(res => {
        console.log('[api.js] updateHistoryNotes response:', res.data);
        return res.data;
    });
}

const deleteHistory = (id) => {
     console.log(`[api.js] deleteHistory called for id ${id}`);
    return apiClient.delete(`/history/${id}`).then(res => {
        console.log('[api.js] deleteHistory response:', res.data);
        return res.data;
    });
}

// Integration Endpoints (Send locationData object as params)
const getMapLink = (locationData) => {
    console.log('[api.js] getMapLink called with:', locationData);
    return apiClient.get(`/integrations/map`, { params: locationData }).then(res => {
        console.log('[api.js] getMapLink response:', res.data);
        return res.data;
    });
};
const getYoutubeLink = (locationData) => {
     console.log('[api.js] getYoutubeLink called with:', locationData);
    return apiClient.get(`/integrations/youtube`, { params: locationData }).then(res => {
        console.log('[api.js] getYoutubeLink response:', res.data);
        return res.data;
    });
};

// Export Endpoint (Triggers download)
const exportHistory = (format) => {
    console.log(`[api.js] exportHistory called with format: ${format}`);
    const url = `${API_BASE_URL}/export?format=${format}`;
    console.log(`[api.js] Opening export URL: ${url}`);
    // Open in a new tab or trigger download directly
    window.open(url, '_blank');
};

const api = {
    getCurrentWeatherByLocation,
    getCurrentWeatherByCoords,
    getForecastByLocation,
    getForecastByCoords,
    getHistory,
    saveSearch,
    updateHistoryNotes,
    deleteHistory,
    getMapLink,
    getYoutubeLink,
    exportHistory,
    
};

export default api;