import React, { useState } from 'react';

const LocationInput = ({ onSubmit, loading }) => {
    const [query, setQuery] = useState('');

    const handleSubmit = (event) => {
        event.preventDefault();
        if (query.trim()) {
            onSubmit(query.trim(), false); // false indicates it's not coordinates
        }
    };

    const handleGetCurrentLocation = () => {
        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser.');
            return;
        }

        // Indicate loading specific to geolocation request if desired
        // setLoadingGeo(true); // You might need another state variable for this

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                onSubmit({ lat: latitude, lon: longitude }, true); // true indicates coordinates
                // setLoadingGeo(false);
            },
            (error) => {
                console.error("Geolocation error:", error);
                alert(`Error getting location: ${error.message}`);
                // setLoadingGeo(false);
            },
            {
                 enableHighAccuracy: false, // Faster, less accurate
                 timeout: 10000, // 10 seconds
                 maximumAge: 60000 // Use cached position up to 1 minute old
            }
        );
    };

    return (
        <div className="mb-4">
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 mb-2">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Enter City, Zip/Postal Code..."
                    disabled={loading}
                    className="flex-grow px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                    required // Make input required for form submission
                />
                <button
                    type="submit"
                    disabled={loading || !query.trim()} // Disable if loading or input is empty/whitespace
                    className="px-4 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? 'Searching...' : 'Get Weather'}
                </button>
            </form>
            <div className="text-center">
                 <span className="text-sm text-gray-500 mx-2">or</span>
                 <button
                     onClick={handleGetCurrentLocation}
                     disabled={loading}
                     className="px-4 py-2 bg-green-600 text-white rounded shadow hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 disabled:opacity-50"
                 >
                     Use Current Location
                 </button>
            </div>
        </div>
    );
};

export default LocationInput;