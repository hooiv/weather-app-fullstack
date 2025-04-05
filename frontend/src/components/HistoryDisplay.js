// frontend/src/components/HistoryDisplay.js
import React from 'react';

// Helper to format date string (optional)
const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
        // Input might be ISO string from DB, convert to local date part
        const date = new Date(dateString);
         // Adjust for timezone offset to prevent day shifting when just getting date part
        const offset = date.getTimezoneOffset();
        const adjustedDate = new Date(date.getTime() + (offset * 60 * 1000));
        return adjustedDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD
    } catch (e) {
        return 'Invalid Date';
    }
};


const HistoryDisplay = ({ history, onDelete, loading }) => {
    if (!history || history.length === 0) {
        return (
             <div className="mt-6 pt-4 border-t">
                <h3 className="text-lg font-semibold mb-2 text-center text-gray-700">Search History</h3>
                <p className="text-center text-gray-500 text-sm">No search history yet.</p>
            </div>
        );
    }

    return (
        <div className="mt-6 pt-4 border-t">
            <h3 className="text-lg font-semibold mb-3 text-center text-gray-700">Search History</h3>
            <ul className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {history.map((item) => (
                    <li
                        key={item._id}
                        className="p-3 bg-gray-50 rounded shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2"
                    >
                        <div className="flex-grow">
                            {/* Location Info */}
                            <span className="font-medium text-gray-800">
                                {item.locationName || item.query}{item.country ? `, ${item.country}` : ''}
                            </span>
                            {/* Original Query Info */}
                            <span className="text-xs text-gray-500 block sm:inline sm:ml-2">
                                 (Queried: "{item.query}{item.countryQuery ? `, ${item.countryQuery}` : ''}" on {new Date(item.searchTimestamp || item.createdAt).toLocaleString()})
                            </span>

                            {/* --- Display Date Range if exists --- */}
                            {(item.startDate || item.endDate) && (
                                <span className='block text-sm text-purple-600 mt-1'>
                                    Dates: {formatDate(item.startDate) || '?'} - {formatDate(item.endDate) || '?'}
                                </span>
                            )}
                            {/* --- End Date Range --- */}

                             {/* Weather Snippet */}
                             {item.currentWeather && (
                                 <span className='block text-sm text-blue-600 mt-1'>
                                     {item.currentWeather.temp?.toFixed(1)}°C, {item.currentWeather.description}
                                 </span>
                             )}
                              {/* Notes */}
                             {item.notes && (
                                  <p className='text-xs text-gray-600 italic mt-1'>Notes: {item.notes}</p>
                             )}
                        </div>
                        <button
                            onClick={() => onDelete(item._id)}
                            disabled={loading}
                            className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 disabled:opacity-50 flex-shrink-0"
                        >
                            Delete
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default HistoryDisplay;