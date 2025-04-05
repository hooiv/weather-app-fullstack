// frontend/src/components/LocationInput.js
import React, { useState } from 'react';
import countryList from './countryList'; // Import the country list

const LocationInput = ({ onSubmit, loading }) => {
    const [locationQuery, setLocationQuery] = useState('');
    // Country state now holds the selected code, default to empty string
    const [selectedCountryCode, setSelectedCountryCode] = useState('');

    const handleSubmit = (event) => {
        event.preventDefault();
        const trimmedLocation = locationQuery.trim();

        // Log what's being submitted
        console.log('[LocationInput] Submitting:', { location: trimmedLocation, country: selectedCountryCode || null });

        if (trimmedLocation) {
            // Pass location and selected country code (or null if none selected)
            onSubmit({ location: trimmedLocation, country: selectedCountryCode || null }, false); // false indicates it's not coordinates
        }
    };

    const handleGetCurrentLocation = () => {
        console.log('[LocationInput] Attempting to get current location...');
        if (!navigator.geolocation) {
            console.error('[LocationInput] Geolocation not supported.');
            alert('Geolocation is not supported by your browser.');
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                console.log('[LocationInput] Geolocation success:', { lat: latitude, lon: longitude });
                onSubmit({ lat: latitude, lon: longitude }, true); // true indicates coordinates
            },
            (error) => {
                console.error("[LocationInput] Geolocation error:", error);
                alert(`Error getting location: ${error.message}`);
            },
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
        );
    };

    return (
        <div className="mb-4">
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

                {/* --- Country Dropdown --- */}
                <div className="w-full sm:w-auto">
                    <label htmlFor="country-select" className="sr-only">Country (Optional)</label>
                    <select
                        id="country-select"
                        value={selectedCountryCode}
                        onChange={(e) => {
                            console.log('[LocationInput] Country selected:', e.target.value);
                            setSelectedCountryCode(e.target.value);
                        }}
                        disabled={loading}
                        className="w-full sm:w-48 px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 bg-white appearance-none" // Added appearance-none for better styling control if needed
                    >
                        <option value="">-- Select Country (Optional) --</option>
                        {countryList.map(country => (
                            <option key={country.code} value={country.code}>
                                {country.name} ({country.code}) {/* Show code in dropdown */}
                            </option>
                        ))}
                    </select>
                </div>
                {/* --- End Country Dropdown --- */}

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={loading || !locationQuery.trim()}
                    className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
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