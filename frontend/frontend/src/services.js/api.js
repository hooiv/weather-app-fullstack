import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL; // Get from .env

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
        const message = error.response?.data?.message || error.message || 'An unknown API error occurred';
        console.error('API Error:', error.response || error);
        // Return a custom error object or just the message
        return Promise.reject(new Error(message));
    }
);

// Weather Endpoints
const getCurrentWeatherByLocation = (location) => apiClient.get(`/weather/current?location=${encodeURIComponent(location)}`).then(res => res.data);
const getCurrentWeatherByCoords = (lat, lon) => apiClient.get(`/weather/current?lat=${lat}&lon=${lon}`).then(res => res.data);
const getForecastByLocation = (location) => apiClient.get(`/weather/forecast?location=${encodeURIComponent(location)}`).then(res => res.data);
const getForecastByCoords = (lat, lon) => apiClient.get(`/weather/forecast?lat=${lat}&lon=${lon}`).then(res => res.data);

// History CRUD Endpoints
const getHistory = () => apiClient.get('/history').then(res => res.data);
const saveSearch = (locationQuery, notes = '') => apiClient.post('/history', { locationQuery, notes }).then(res => res.data);
const updateHistoryNotes = (id, notes) => apiClient.put(`/history/${id}`, { notes }).then(res => res.data); // Example update
const deleteHistory = (id) => apiClient.delete(`/history/${id}`).then(res => res.data);

// Integration Endpoints
const getMapLink = (location) => apiClient.get(`/integrations/map?location=${encodeURIComponent(location)}`).then(res => res.data);
const getYoutubeLink = (location) => apiClient.get(`/integrations/youtube?location=${encodeURIComponent(location)}`).then(res => res.data);

// Export Endpoint (Triggers download)
const exportHistory = (format) => {
    const url = `${API_BASE_URL}/export?format=${format}`;
    // Open in a new tab or trigger download directly
    window.open(url, '_blank');
    // Or use file-saver library for more control if needed
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