// frontend/src/components/LocationInput.js
import React, { useState } from 'react';
import countryList from './countryList'; // Assuming this exists

// Helper to get today's date in YYYY-MM-DD format for min attribute
const getTodayDate = () => {
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const day = String(today.getDate()).padStart(2, '0');
    const year = today.getFullYear();
    return `${year}-${month}-${day}`;
}

const LocationInput = ({ onSubmit, loading, // Add props for date handling
                         startDate, setStartDate,
                         endDate, setEndDate }) => {
    const [locationQuery, setLocationQuery] = useState('');
    const [selectedCountryCode, setSelectedCountryCode] = useState('');

    const handleSubmit = (event) => {
        // Add console log to confirm this runs
        console.log('[LocationInput] handleSubmit triggered!');
        event.preventDefault();
        const trimmedLocation = locationQuery.trim();
        console.log('[LocationInput] Submitting weather request:', { location: trimmedLocation, country: selectedCountryCode || null });
        if (trimmedLocation) {
            onSubmit({ location: trimmedLocation, country: selectedCountryCode || null }, false);
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
                // Ensure onSubmit exists before calling
                if (onSubmit) {
                    onSubmit({ lat: latitude, lon: longitude }, true);
                }
             },
            (error) => {
                console.error("[LocationInput] Geolocation error:", error);
                alert(`Error getting location: ${error.message}`);
             },
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
        );
    };

    // --- Date Change Handlers ---
    const handleStartDateChange = (e) => {
        console.log('[LocationInput] Start Date changed:', e.target.value);
        // Ensure setStartDate exists before calling
        if (setStartDate) {
            setStartDate(e.target.value);
            // Optional: Clear end date if start date becomes later than end date
            if (endDate && e.target.value > endDate && setEndDate) {
                setEndDate('');
            }
        }
    };

     const handleEndDateChange = (e) => {
        console.log('[LocationInput] End Date changed:', e.target.value);
         // Ensure setEndDate exists before calling
         if (setEndDate) {
            setEndDate(e.target.value);
         }
     };

    // --- Location Input Change Handler ---
    const handleLocationChange = (e) => {
        setLocationQuery(e.target.value);
    }

    // --- Country Select Change Handler ---
     const handleCountryChange = (e) => {
        console.log('[LocationInput] Country selected:', e.target.value);
        setSelectedCountryCode(e.target.value);
     }

    return (
        <div className="mb-4">
            {/* Weather Search Form */}
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 mb-2 items-start flex-wrap"> {/* Added flex-wrap */}

                {/* Location Input - ADDED onChange and other props back */}
                <div className="flex-grow w-full sm:w-auto">
                    <label htmlFor="location-input" className="sr-only">Location</label>
                    <input
                        id="location-input"
                        type="text"
                        value={locationQuery}
                        onChange={handleLocationChange} // *** ADDED THIS LINE ***
                        placeholder="Enter City or Zip/Postal Code..."
                        disabled={loading}
                        className="w-full px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                        required
                    />
                </div>

                {/* Country Dropdown - ADDED className and disabled props */}
                <div className="w-full sm:w-auto">
                    <label htmlFor="country-select" className="sr-only">Country (Optional)</label>
                    <select
                        id="country-select"
                        value={selectedCountryCode}
                        onChange={handleCountryChange} // Use specific handler
                        disabled={loading} // *** ADDED THIS LINE ***
                        className="w-full sm:w-48 px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 bg-white appearance-none" // *** ADDED THIS LINE ***
                    >
                         <option value="">-- Select Country --</option>
                         {countryList.map(country => (
                             <option key={country.code} value={country.code}>{country.name} ({country.code})</option>
                         ))}
                     </select>
                 </div>

                {/* Submit Button - ADDED className */}
                <button
                    type="submit"
                    disabled={loading || !locationQuery.trim()}
                    className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed" // *** ADDED THIS LINE ***
                >
                    {loading ? 'Searching...' : 'Get Weather'}
                </button>
            </form>

             {/* Date Range Inputs (These looked correct already) */}
             <div className="flex flex-col sm:flex-row gap-2 my-3 items-center justify-center flex-wrap">
                 {/* ... date inputs ... */}
                  <span className="text-sm text-gray-600 mb-1 sm:mb-0">Optional Date Range (for saving):</span>
                  <div className='flex gap-2 items-center'>
                      <div>
                         <label htmlFor="start-date" className="sr-only">Start Date</label>
                         <input
                            id="start-date"
                            type="date"
                            value={startDate}
                            onChange={handleStartDateChange}
                            min={getTodayDate()}
                            disabled={loading}
                            className="px-2 py-1 border border-gray-300 rounded shadow-sm text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
                            aria-label="Start Date"
                         />
                     </div>
                      <span className="text-gray-500">-</span>
                      <div>
                         <label htmlFor="end-date" className="sr-only">End Date</label>
                         <input
                            id="end-date"
                            type="date"
                            value={endDate}
                            onChange={handleEndDateChange}
                            min={startDate || getTodayDate()}
                            disabled={loading || !startDate}
                            className="px-2 py-1 border border-gray-300 rounded shadow-sm text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
                            aria-label="End Date"
                         />
                      </div>
                  </div>
             </div>

            {/* Use Current Location Button - ADDED className */}
            <div className="text-center">
                 <span className="text-sm text-gray-500 mx-2">or</span>
                 <button
                     onClick={handleGetCurrentLocation}
                     disabled={loading}
                     className="px-4 py-2 bg-green-600 text-white rounded shadow hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 disabled:opacity-50" // *** ADDED THIS LINE ***
                 >
                     Use Current Location
                 </button>
            </div>
        </div>
    );
};

export default LocationInput;