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
        event.preventDefault();
        const trimmedLocation = locationQuery.trim();
        console.log('[LocationInput] Submitting weather request:', { location: trimmedLocation, country: selectedCountryCode || null });
        if (trimmedLocation) {
            onSubmit({ location: trimmedLocation, country: selectedCountryCode || null }, false);
        }
    };

    const handleGetCurrentLocation = () => {
        // ... (no changes needed here) ...
        console.log('[LocationInput] Attempting to get current location...');
        if (!navigator.geolocation) { /* ... */ }
        navigator.geolocation.getCurrentPosition(
            (position) => { /* onSubmit({ lat, lon }, true) */ },
            (error) => { /* ... */ },
            { /* ... */ }
        );
    };

    // --- Date Change Handlers ---
    const handleStartDateChange = (e) => {
        console.log('[LocationInput] Start Date changed:', e.target.value);
        setStartDate(e.target.value);
        // Optional: Clear end date if start date becomes later than end date
        if (endDate && e.target.value > endDate) {
            setEndDate('');
        }
    };

     const handleEndDateChange = (e) => {
        console.log('[LocationInput] End Date changed:', e.target.value);
        setEndDate(e.target.value);
     };

    return (
        <div className="mb-4">
            {/* Weather Search Form */}
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 mb-2 items-start flex-wrap"> {/* Added flex-wrap */}
                {/* Location Input */}
                <div className="flex-grow w-full sm:w-auto">
                    <label htmlFor="location-input" className="sr-only">Location</label>
                    <input id="location-input" type="text" value={locationQuery} /* ...props... */ />
                </div>

                {/* Country Dropdown */}
                <div className="w-full sm:w-auto">
                    <label htmlFor="country-select" className="sr-only">Country (Optional)</label>
                    <select id="country-select" value={selectedCountryCode} onChange={(e) => setSelectedCountryCode(e.target.value)} /* ...props... */ >
                         <option value="">-- Select Country --</option>
                         {countryList.map(country => (
                             <option key={country.code} value={country.code}>{country.name} ({country.code})</option>
                         ))}
                     </select>
                 </div>

                {/* Submit Button */}
                <button type="submit" disabled={loading || !locationQuery.trim()} /* ...props... */ >
                    {loading ? 'Searching...' : 'Get Weather'}
                </button>
            </form>

             {/* --- Date Range Inputs --- */}
             <div className="flex flex-col sm:flex-row gap-2 my-3 items-center justify-center flex-wrap">
                  <span className="text-sm text-gray-600 mb-1 sm:mb-0">Optional Date Range (for saving):</span>
                  <div className='flex gap-2 items-center'>
                      <div>
                         <label htmlFor="start-date" className="sr-only">Start Date</label>
                         <input
                            id="start-date"
                            type="date"
                            value={startDate}
                            onChange={handleStartDateChange}
                            min={getTodayDate()} // Prevent selecting past dates
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
                            min={startDate || getTodayDate()} // End date cannot be before start date
                            disabled={loading || !startDate} // Disable if no start date
                            className="px-2 py-1 border border-gray-300 rounded shadow-sm text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
                            aria-label="End Date"
                         />
                      </div>
                  </div>
             </div>
             {/* --- End Date Range Inputs --- */}

            {/* Use Current Location Button */}
            <div className="text-center">
                 <span className="text-sm text-gray-500 mx-2">or</span>
                 <button onClick={handleGetCurrentLocation} disabled={loading} /* ...props... */ >
                     Use Current Location
                 </button>
            </div>
        </div>
    );
};

export default LocationInput;