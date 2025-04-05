// frontend/src/components/LocationInput.js
import React, { useState } from 'react';

const LocationInput = ({ onSubmit, loading }) => {
    const [locationQuery, setLocationQuery] = useState('');
    const [countryQuery, setCountryQuery] = useState(''); // New state for country code

    const handleSubmit = (event) => {
        event.preventDefault();
        const trimmedLocation = locationQuery.trim();
        const trimmedCountry = countryQuery.trim().toUpperCase(); // Standardize to uppercase

        if (trimmedLocation) {
            // Construct the query string. If country is provided, append it.
            // Backend will need to parse this or handle separate fields.
            // Let's pass them separately for clarity.
             onSubmit({ location: trimmedLocation, country: trimmedCountry || null }, false); // Pass as object, country is null if empty
        }
    };

    const handleGetCurrentLocation = () => {
        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser.');
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                 onSubmit({ lat: latitude, lon: longitude }, true); // true indicates coordinates
            },
            (error) => {
                console.error("Geolocation error:", error);
                alert(`Error getting location: ${error.message}`);
            },
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
        );
    };

    return (
        <div className="mb-4">
            {/* --- Updated Form --- */}
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 mb-2 items-start">
                 {/* Location Input */}
                 <div className="flex-grow w-full sm:w-auto">
                     <label htmlFor="location-input" className="sr-only">Location</label> {/* For accessibility */}
                     <input
                         id="location-input"
                         type="text"
                         value={locationQuery}
                         onChange={(e) => setLocationQuery(e.target.value)}
                         placeholder="Enter City or Zip/Postal Code..."
                         disabled={loading}
                         className="w-full px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                         required
                     />
                </div>

                 {/* Country Code Input (Optional) */}
                 <div className="w-full sm:w-auto">
                     <label htmlFor="country-input" className="sr-only">Country Code (Optional)</label> {/* For accessibility */}
                     <input
                         id="country-input"
                         type="text"
                         value={countryQuery}
                         onChange={(e) => setCountryQuery(e.target.value)}
                         placeholder="Country (e.g., US, IN, GB)"
                         disabled={loading}
                         maxLength="2" // Standard 2-letter codes
                         className="w-full sm:w-28 px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                        // Not required
                     />
                 </div>

                 {/* Submit Button */}
                <button
                    type="submit"
                    disabled={loading || !locationQuery.trim()}
                    className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? 'Searching...' : 'Get Weather'}
                </button>
            </form>
            {/* --- End Updated Form --- */}

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