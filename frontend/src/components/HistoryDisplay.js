import React from 'react';

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
            <ul className="space-y-2 max-h-60 overflow-y-auto pr-2"> {/* Added scroll */}
                {history.map((item) => (
                    <li
                        key={item._id}
                        className="p-3 bg-gray-50 rounded shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2"
                    >
                        <div className="flex-grow">
                            <span className="font-medium text-gray-800">{item.locationName}, {item.country}</span>
                            <span className="text-xs text-gray-500 block sm:inline sm:ml-2">
                                (Queried: "{item.query}" on {new Date(item.searchTimestamp || item.createdAt).toLocaleString()})
                            </span>
                             {/* Optionally display a snippet of weather */}
                             {item.currentWeather && (
                                 <span className='block text-sm text-blue-600 mt-1'>
                                     {item.currentWeather.temp?.toFixed(1)}°C, {item.currentWeather.description}
                                 </span>
                             )}
                        </div>
                         {/* Add Update Notes Functionality Here if needed */}
                         {/* Example: <button onClick={() => onUpdate(item._id, prompt('New notes:'))}>Update Notes</button> */}
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