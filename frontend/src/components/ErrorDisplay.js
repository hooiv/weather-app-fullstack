import React from 'react';

const ErrorDisplay = ({ message, onClose }) => {
    if (!message) {
        return null; // Don't render if there's no error message
    }

    return (
        <div
            className="my-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded relative flex justify-between items-center"
            role="alert"
        >
            <span className="block sm:inline">{message}</span>
            {onClose && ( // Only show close button if onClose handler is provided
                <button
                    onClick={onClose}
                    className="ml-4 text-red-500 hover:text-red-700 text-2xl font-bold leading-none"
                    aria-label="Close"
                >
                    × {/* HTML entity for multiplication sign (X) */}
                </button>
            )}
        </div>
    );
};

export default ErrorDisplay;