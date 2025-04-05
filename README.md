Important: After a period of inactivity , the website https://weather-app-fullstack-frontend.onrender.com/ would require upto 60 seconds to redeploy on the backend as it's on the free tier of render. So, after visiting site you may have to wait 60 seconds .

# Full Stack Weather App - AI Engineer Intern Assessment

This project is a full-stack weather application built for the PM Accelerator AI Engineer Intern technical assessment. It allows users to get current weather information by location (city/postal code + optional country) or geolocation, view 5-day forecasts, optionally save searches with a date range, view search history, see related integrations (Maps, YouTube links), and export search history.

**Submitted By:** ADITYA CHAUHAN

---

## Features

### Frontend (Tech Assessment #1)

*   **Location Input:** Enter location by City Name or Zip/Postal Code.
*   **Optional Country Selection:** Includes a dropdown to select the country, improving postal code geocoding accuracy.
*   **Current Location:** Get weather based on the browser's geolocation API.
*   **Current Weather Display:** Shows temperature, condition description, humidity, wind speed, resolved location name, country, and weather icon.
*   **5-Day Forecast:** Displays a 5-day weather forecast (based on current API data) with icons and high/low temperatures.
*   **Optional Date Range Input:** Allows users to specify a start and end date (for future/past interest).
*   **Informational Text:** Clearly states that displayed weather is current/near-future forecast, while saved dates are for user reference and stored with the search.
*   **Responsive Design:** Adapts reasonably to desktop, tablet, and mobile screen sizes using Tailwind CSS.
*   **Error Handling:** Displays user-friendly messages for API failures, invalid inputs, or location not found.
*   **API Interaction:** Communicates with the backend API.
*   **State Management:** Uses React Hooks (`useState`, `useEffect`).

### Backend (Tech Assessment #2)

*   **RESTful API:** Built with Node.js and Express.js.
*   **Weather Data Fetching:** Fetches real-time current weather and 5-day/3-hour forecast data from the OpenWeatherMap API.
*   **Geocoding:** Converts location input (text + optional country code) into coordinates using OpenWeatherMap Geocoding API (prioritizes `/zip` endpoint when country code is provided, falls back to `/direct`).
*   **Database:** Uses MongoDB with Mongoose (`weatherhistories` collection).
*   **CRUD Operations (`/api/history`):**
    *   **CREATE:** Saves weather search records including: original query, optional country input, optional start/end dates (validated), resolved location details, search timestamp, and the current weather/5-day forecast fetched at the time of search. Validates date ranges and location existence.
    *   **READ:** Retrieves all saved search history or a specific record by ID.
    *   **UPDATE:** Allows updating a `notes` field on a history record.
    *   **DELETE:** Removes a specific history record.
*   **API Integration (`/api/integrations`):**
    *   Provides Google Maps search links for the location.
    *   Provides YouTube search links for the location.
*   **Data Export (`/api/export`):**
    *   Allows exporting search history data into **JSON** or **CSV** format.
*   **Error Handling:** Includes specific error handling and a global error handling middleware.
*   **Environment Variables:** Uses `.env` file for configuration.

### Full Stack Integration

*   React frontend communicates asynchronously with the Node.js/Express backend API.
*   User input is passed from frontend to backend for processing and validation.

---

## Tech Stack

*   **Frontend:** React, Tailwind CSS, Axios
*   **Backend:** Node.js, Express.js, Mongoose, Axios, `dotenv`, `cors`, `json2csv`
*   **Database:** MongoDB (Local or Atlas)
*   **APIs:** OpenWeatherMap (Geocoding, Weather, Forecast)

---

## Setup and Running

**Prerequisites:**

*   Node.js (v16+ recommended) & npm (or yarn)
*   Git
*   MongoDB instance (local or cloud - e.g., MongoDB Atlas free tier)

**Configuration:**

1.  **OpenWeatherMap API Key:**
    *   Sign up for a **free API key** at [OpenWeatherMap](https://openweathermap.org/appid).
    *   **Important:** New keys might take several minutes to a couple of hours to become active.

2.  **Clone the Repository:**
    ```bash
    git clone https://github.com/hooiv/weather-app-fullstack
    cd weather-app-fullstack
    ```

3.  **Backend Setup:**
    *   Navigate to the backend directory:
        ```bash
        cd backend
        ```
    *   Create a `.env` file in this `backend` directory. **Do NOT commit this file.** Populate it with your credentials:
        ```dotenv
        # Server Port
        PORT=5001

        # MongoDB Connection String (replace with your local or Atlas URI)
        MONGODB_URI=mongodb://localhost:27017/weatherAppPMA

        # OpenWeatherMap API Key (replace with your activated key)
        OPENWEATHERMAP_API_KEY=YOUR_OWM_API_KEY

        # Frontend URL for CORS (adjust if your frontend runs elsewhere)
        FRONTEND_URL=http://localhost:3000

        # Node Environment ('development' shows more error details)
        NODE_ENV=development
        ```
    *   Install dependencies:
        ```bash
        npm install
        ```
    *   Start the backend server (includes nodemon for auto-restart on changes):
        ```bash
        npm run dev
        ```
        *(Alternatively, use `npm start` for basic execution without nodemon).*
    *   The backend API will be running at `http://localhost:5001`. Check the console for "MongoDB Connected Successfully."

4.  **Frontend Setup:**
    *   Navigate to the frontend directory:
        ```bash
        cd ../frontend
        ```
    *   Create a `.env` file in this `frontend` directory. **Do NOT commit this file.** Add the backend API URL:
        ```dotenv
        REACT_APP_API_URL=http://localhost:5001/api
        ```
        *(`REACT_APP_` prefix is required by Create React App).*
    *   Install dependencies:
        ```bash
        npm install
        ```
        *(This assumes React, Axios, and Tailwind dependencies are in `package.json`. If Tailwind setup is missing, run `npm install -D tailwindcss postcss autoprefixer` then `npx tailwindcss init -p` and configure `tailwind.config.js` and `src/index.css` as shown below).*
    *   Start the frontend development server:
        ```bash
        npm start
        ```
    *   The application should open in your browser at `http://localhost:3000`.

**Example Configuration Files:**

*   **`frontend/tailwind.config.js`:**
    ```javascript
    /** @type {import('tailwindcss').Config} */
    module.exports = {
      content: [
        "./src/**/*.{js,jsx,ts,tsx}", // Tells Tailwind where to look for classes
      ],
      theme: {
        extend: {},
      },
      plugins: [],
    }
    ```

*   **`frontend/src/index.css`:** (Ensure these are at the top)
    ```css
    @tailwind base;
    @tailwind components;
    @tailwind utilities;

    /* Your custom base styles go below */
    body {
      /* ... */
    }
    ```

**`.gitignore`:** Ensure your root `.gitignore` includes at least the following:

```gitignore
# Dependencies
**/node_modules

# Environment variables
**/.env

# Build output
/frontend/build

# Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# OS generated files
.DS_Store
Thumbs.db

# Optional editor directories
.idea
.vscode
