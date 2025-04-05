import React from 'react';

const IntegrationsDisplay = ({ data }) => {
    if (!data || (!data.map && !data.youtube)) {
        return null; // Don't render anything if no data
    }

    const { map, youtube } = data;

    return (
        <div className="mt-6 p-4 bg-purple-50 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-3 text-center text-purple-800">
                Related Links for {map?.locationName || youtube?.locationName || 'Location'}
            </h3>
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
                {map && map.mapUrl && (
                    <a
                        href={map.mapUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition duration-200 text-center text-sm"
                    >
                        View on Google Maps
                    </a>
                )}
                {youtube && youtube.youtubeUrl && (
                    <a
                        href={youtube.youtubeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition duration-200 text-center text-sm"
                    >
                        Search on YouTube
                    </a>
                )}
            </div>
             {(!map || !map.mapUrl) && (!youtube || !youtube.youtubeUrl) && (
                 <p className="text-center text-sm text-gray-500 mt-2">No integration links available for this location.</p>
             )}
        </div>
    );
};

export default IntegrationsDisplay;