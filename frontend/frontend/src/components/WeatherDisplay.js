import React from 'react';

const WeatherDisplay = ({ currentWeather, forecast, locationName }) => {
    if (!currentWeather || !forecast) return null;

    const { main, weather, wind, dt } = currentWeather;
    const currentDate = new Date(dt * 1000).toLocaleDateString();
    const iconUrl = `http://openweathermap.org/img/wn/${weather[0].icon}@2x.png`;

    return (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg shadow">
            <h2 className="text-xl font-semibold text-center mb-4">
                Weather for {locationName} ({currentDate})
            </h2>

            {/* Current Weather Section */}
            <div className="text-center mb-6 p-4 bg-white rounded shadow-inner flex flex-col items-center">
                <img src={iconUrl} alt={weather[0].description} className="w-16 h-16 -mt-8 mb-1" />
                <p className="text-4xl font-bold">{main.temp.toFixed(1)}°C</p>
                <p className="text-lg capitalize text-gray-600">{weather[0].description}</p>
                <div className="text-sm text-gray-500 mt-2">
                    <span>Feels like: {main.feels_like.toFixed(1)}°C</span> |
                    <span> Humidity: {main.humidity}%</span> |
                    <span> Wind: {wind.speed.toFixed(1)} m/s</span>
                </div>
            </div>

            {/* 5-Day Forecast Section */}
            <h3 className="text-lg font-semibold mb-3 text-center">5-Day Forecast</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 text-center">
                {forecast.map((day, index) => (
                    <div key={index} className="p-2 bg-white rounded shadow text-sm">
                        <p className="font-semibold">{new Date(day.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric'})}</p>
                         <img
                             src={`http://openweathermap.org/img/wn/${day.icon}@2x.png`}
                             alt={day.description}
                             className="w-10 h-10 mx-auto"
                             />
                        <p className="capitalize text-xs text-gray-500 truncate" title={day.description}>{day.description}</p>
                        <p>
                            <span className="text-red-500">{day.temp_max.toFixed(0)}°</span> / {' '}
                            <span className="text-blue-500">{day.temp_min.toFixed(0)}°</span>
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default WeatherDisplay;