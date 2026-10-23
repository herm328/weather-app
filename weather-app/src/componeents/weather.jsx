
import { useEffect, useState } from "react";
import "./weather.css";

const getWeatherInfo = (code) => {
  if (code === 0) return { label: "Clear sky", icon: "☀️" };
  if ([1, 2].includes(code))
    return { label: "Partly cloudy", icon: "🌤️" };
  if (code === 3) return { label: "Overcast", icon: "☁️" };
  if ([45, 48].includes(code))
    return { label: "Foggy", icon: "🌫️" };
  if ([51, 53, 55, 56, 57].includes(code))
    return { label: "Drizzle", icon: "🌦️" };
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code))
    return { label: "Rainy", icon: "🌧️" };
  if ([71, 73, 75, 77, 85, 86].includes(code))
    return { label: "Snowy", icon: "❄️" };
  if ([95, 96, 99].includes(code))
    return { label: "Thunderstorm", icon: "⛈️" };

  return { label: "Weather update", icon: "🌤️" };
};

async function getWeatherForCity(query) {
  const geoUrl =
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`;

  const geoResponse = await fetch(geoUrl);

  if (!geoResponse.ok) {
    throw new Error("Could not search for this city.");
  }

  const geoData = await geoResponse.json();
  const place = geoData.results?.[0];

  if (!place) {
    throw new Error("City not found. Try another city name.");
  }

  const params = new URLSearchParams({
    latitude: place.latitude,
    longitude: place.longitude,
    current:
      "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,pressure_msl",
    daily: "weather_code,temperature_2m_max,temperature_2m_min",
    timezone: "auto",
    forecast_days: "4",
  });

  const response = await fetch(
    `https://api.open-meteo.com/v1/forecast?${params}`
  );

  if (!response.ok) {
    throw new Error("Could not load weather data. Please try again.");
  }

  const data = await response.json();

  return {
    place,
    current: data.current,
    forecast: data.daily.time.slice(1).map((date, index) => ({
      date,
      code: data.daily.weather_code[index + 1],
      max: data.daily.temperature_2m_max[index + 1],
      min: data.daily.temperature_2m_min[index + 1],
    })),
  };
}

export default function Weather() {
  const [city, setCity] = useState("Addis Ababa");
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function searchWeather(event) {
    event?.preventDefault();

    const query = city.trim();

    if (!query) {
      setError("Please enter a city name.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await getWeatherForCity(query);

      setLocation(result.place);
      setWeather(result.current);
      setForecast(result.forecast);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    searchWeather();
    // Load weather for Addis Ababa when the app first opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const info = weather
    ? getWeatherInfo(weather.weather_code)
    : null;

  const formatDay = (dateString) =>
    new Date(`${dateString}T12:00:00`).toLocaleDateString("en-US", {
      weekday: "short",
    });

  return (
    <main className="weather-page">
      <section className="weather-dashboard">
        <header className="dashboard-header">
          <a className="brand" href="#top" aria-label="SkyCast home">
            <span className="brand-icon">☁</span>
            <span>SkyCast</span>
          </a>

          <span className="live-status">
            <span className="status-dot" />
            LIVE WEATHER
          </span>
        </header>

        <div className="dashboard-content" id="top">
          <section className="intro">
            <p className="eyebrow">YOUR WEATHER OVERVIEW</p>
            <h1>Weather, made simple.</h1>
            <p className="intro-text">
              Real-time conditions and forecasts to help you plan ahead.
            </p>
          </section>

          <form className="search-bar" onSubmit={searchWeather}>
            <span className="search-symbol" aria-hidden="true">
              ⌕
            </span>

            <input
              type="text"
              placeholder="Enter a city, e.g. London"
              value={city}
              onChange={(event) => setCity(event.target.value)}
              aria-label="Search for a city"
            />

            <button type="submit" disabled={loading}>
              {loading ? "Loading..." : "Search"}
            </button>
          </form>

          {error && (
            <div className="error-message" role="alert">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => searchWeather()}
                disabled={loading}
              >
                Try again
              </button>
            </div>
          )}

          {loading && !weather && (
            <div className="loading-message">
              <span className="loading-spinner" />
              Getting the latest weather...
            </div>
          )}

          {weather && info && location && (
            <>
              <section className="current-weather">
                <div className="current-main">
                  <p className="location-label">CURRENT CONDITIONS</p>

                  <h2>
                    {location.name}
                    {location.country ? `, ${location.country}` : ""}
                  </h2>

                  <p className="condition">{info.label}</p>

                  <div className="temperature">
                    {Math.round(weather.temperature_2m)}
                    <span>°C</span>
                  </div>

                  <p className="feels-like">
                    Feels like{" "}
                    {Math.round(weather.apparent_temperature)}°C
                  </p>
                </div>

                <div className="weather-illustration">
                  <span className="main-weather-icon">{info.icon}</span>
                  <p>{weather.is_day ? "Daytime" : "Nighttime"}</p>
                  <span className="illustration-caption">
                    Local conditions
                  </span>
                </div>
              </section>

              <section className="details-section">
                <div className="section-heading">
                  <div>
                    <p className="section-kicker">AT A GLANCE</p>
                    <h3>Today's details</h3>
                  </div>
                  <span className="section-note">Current measurements</span>
                </div>

                <div className="details-grid">
                  <article className="detail-card">
                    <span className="detail-icon">💧</span>
                    <p>Humidity</p>
                    <h4>{weather.relative_humidity_2m}%</h4>
                  </article>

                  <article className="detail-card">
                    <span className="detail-icon">💨</span>
                    <p>Wind speed</p>
                    <h4>
                      {Math.round(weather.wind_speed_10m)}
                      <small> km/h</small>
                    </h4>
                  </article>

                  <article className="detail-card">
                    <span className="detail-icon">🌡️</span>
                    <p>Pressure</p>
                    <h4>
                      {Math.round(weather.pressure_msl)}
                      <small> hPa</small>
                    </h4>
                  </article>

                  <article className="detail-card">
                    <span className="detail-icon">🌧️</span>
                    <p>Precipitation</p>
                    <h4>
                      {weather.precipitation}
                      <small> mm</small>
                    </h4>
                  </article>
                </div>
              </section>

              <section className="forecast-section">
                <div className="section-heading">
                  <div>
                    <p className="section-kicker">PLAN AHEAD</p>
                    <h3>Next 3 days</h3>
                  </div>
                  <span className="section-note">Daily forecast</span>
                </div>

                <div className="forecast-grid">
                  {forecast.map((day) => {
                    const dayInfo = getWeatherInfo(day.code);

                    return (
                      <article className="forecast-card" key={day.date}>
                        <p className="forecast-day">
                          {formatDay(day.date)}
                        </p>

                        <span className="forecast-icon">
                          {dayInfo.icon}
                        </span>

                        <strong>{Math.round(day.max)}°</strong>

                        <span className="low-temp">
                          {Math.round(day.min)}°
                        </span>

                        <small>{dayInfo.label}</small>
                      </article>
                    );
                  })}
                </div>
              </section>
            </>
          )}

          <footer className="dashboard-footer">
            <span>Designed for everyday forecasts.</span>
            <span>
              Weather data by{" "}
              <a
                href="https://open-meteo.com/"
                target="_blank"
                rel="noreferrer"
              >
                Open-Meteo
              </a>
            </span>
          </footer>
        </div>
      </section>
    </main>
  );
}






