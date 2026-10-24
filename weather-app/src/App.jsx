
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity, ArrowDown, ArrowUp, Cloud, CloudRain, CloudSun,
  Compass, Droplets, Eye, Gauge, Heart, Map, MapPin,
  Menu, Moon, Search, Sun, Sunrise, Sunset, Thermometer,
  Wind, X
} from "lucide-react";
import "./App.css";

const DEFAULT_CITY = {
  name: "Addis Ababa",
  country: "Ethiopia",
  latitude: 8.9806,
  longitude: 38.7578
};

const weatherInfo = (code) => {
  if (code === 0) return { label: "Clear sky", icon: Sun };
  if (code <= 2) return { label: "Partly cloudy", icon: CloudSun };
  if (code === 3) return { label: "Overcast", icon: Cloud };
  if ([45, 48].includes(code)) return { label: "Foggy", icon: Cloud };
  if ([51, 53, 55, 56, 57].includes(code))
    return { label: "Drizzle", icon: CloudRain };
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code))
    return { label: "Rainy", icon: CloudRain };
  if ([71, 73, 75, 77, 85, 86].includes(code))
    return { label: "Snow", icon: Cloud };
  if ([95, 96, 99].includes(code))
    return { label: "Thunderstorm", icon: CloudRain };
  return { label: "Mixed conditions", icon: CloudSun };
};

const getWeather = async (city) => {
  const params = new URLSearchParams({
    latitude: city.latitude,
    longitude: city.longitude,
    current: [
      "temperature_2m", "relative_humidity_2m",
      "apparent_temperature", "is_day", "precipitation",
      "weather_code", "wind_speed_10m", "wind_direction_10m",
      "surface_pressure"
    ].join(","),
    hourly: [
      "temperature_2m", "precipitation_probability",
      "weather_code", "wind_speed_10m"
    ].join(","),
    daily: [
      "weather_code", "temperature_2m_max",
      "temperature_2m_min", "sunrise", "sunset",
      "uv_index_max", "precipitation_probability_max"
    ].join(","),
    forecast_days: "7",
    timezone: "auto"
  });

  const response = await fetch(
    `https://api.open-meteo.com/v1/forecast?${params}`
  );
  if (!response.ok) throw new Error("Weather data could not be loaded.");
  return response.json();
};

const searchCities = async (query) => {
  const response = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=6&language=en&format=json`
  );
  if (!response.ok) throw new Error("City search failed.");
  const data = await response.json();

  return (data.results || []).map((place) => ({
    name: place.name,
    country: place.country || "",
    admin1: place.admin1 || "",
    latitude: place.latitude,
    longitude: place.longitude
  }));
};

const formatDay = (date, options = { weekday: "short" }) =>
  new Date(`${date}T12:00:00`).toLocaleDateString("en-US", options);

const formatHour = (date) =>
  new Date(date).toLocaleTimeString("en-US", {
    hour: "numeric",
    hour12: true
  });

function App() {
  const [page, setPage] = useState("Overview");
  const [city, setCity] = useState(DEFAULT_CITY);
  const [weather, setWeather] = useState(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [favorites, setFavorites] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("skycast-favorites") || "[]");
    } catch {
      return [];
    }
  });
  const [mobileMenu, setMobileMenu] = useState(false);
  const [unit, setUnit] = useState("C");

  const loadWeather = useCallback(async (selectedCity) => {
    setLoading(true);
    setError("");
    try {
      const data = await getWeather(selectedCity);
      setCity(selectedCity);
      setWeather(data);
    } catch (err) {
      setError(err.message || "Unable to load weather. Check your connection.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWeather(DEFAULT_CITY);
  }, [loadWeather]);

  useEffect(() => {
    localStorage.setItem("skycast-favorites", JSON.stringify(favorites));
  }, [favorites]);

  const current = weather?.current;
  const daily = weather?.daily;
  const hourly = weather?.hourly;
  const condition = current ? weatherInfo(current.weather_code) : null;
  const CurrentIcon = condition?.icon || CloudSun;

  const temperature = (value) =>
    value == null ? "--" : Math.round(unit === "C" ? value : value * 9 / 5 + 32);

  const currentHourIndex = useMemo(() => {
    if (!hourly || !current) return 0;
    const found = hourly.time.findIndex((time) => time.slice(0, 13) === current.time.slice(0, 13));
    return Math.max(0, found);
  }, [hourly, current]);

  const hours = useMemo(() => {
    if (!hourly) return [];
    return hourly.time.slice(currentHourIndex, currentHourIndex + 24);
  }, [hourly, currentHourIndex]);

  async function handleSearch(event) {
    event.preventDefault();
    if (!query.trim()) return;
    setError("");
    try {
      const places = await searchCities(query.trim());
      setResults(places);
      if (places.length === 0) setError("No cities found. Try another spelling.");
    } catch {
      setError("City search failed. Check your internet connection.");
    }
  }

  function chooseCity(place) {
    setResults([]);
    setQuery("");
    setMobileMenu(false);
    setPage("Overview");
    loadWeather(place);
  }

  function toggleFavorite(place = city) {
    const exists = favorites.some(
      (item) => item.latitude === place.latitude && item.longitude === place.longitude
    );
    setFavorites(exists
      ? favorites.filter((item) =>
          item.latitude !== place.latitude || item.longitude !== place.longitude)
      : [...favorites, place]);
  }

  const isFavorite = favorites.some(
    (item) => item.latitude === city.latitude && item.longitude === city.longitude
  );

  const navItems = [
    { name: "Overview", icon: CloudSun },
    { name: "7-Day Forecast", icon: Sun },
    { name: "Hourly Forecast", icon: Activity },
    { name: "Weather Map", icon: Map },
    { name: "Weather Details", icon: Gauge },
    { name: "Favorite Cities", icon: Heart }
  ];

  function Metric({ icon: Icon, label, value, unit: suffix = "", detail }) {
    return (
      <article className="metric-card">
        <div className="metric-top">
          <span>{label}</span>
          <Icon size={19} />
        </div>
        <div className="metric-value">{value}{suffix}</div>
        {detail && <p className="metric-detail">{detail}</p>}
      </article>
    );
  }

  function WeatherCard({ code, temp, time, small = false }) {
    const info = weatherInfo(code);
    const Icon = info.icon;
    return (
      <div className={`weather-card ${small ? "weather-card-small" : ""}`}>
        <span className="muted">{time}</span>
        <Icon className="weather-icon" size={small ? 25 : 32} />
        <strong>{temperature(temp)}°</strong>
        {!small && <span className="muted">{info.label}</span>}
      </div>
    );
  }

  function SectionTitle({ eyebrow, title, subtitle }) {
    return (
      <div className="section-title">
        <div>
          {eyebrow && <span className="eyebrow">{eyebrow}</span>}
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>
    );
  }

  function renderOverview() {
    return (
      <>
        <section className="hero-weather">
          <div className="hero-copy">
            <span className="eyebrow">CURRENT CONDITIONS</span>
            <h2>{city.name}</h2>
            <p className="hero-location"><MapPin size={15} /> {city.admin1 ? `${city.admin1}, ` : ""}{city.country}</p>
            <div className="hero-temperature">
              <span>{temperature(current?.temperature_2m)}°</span>
              <CurrentIcon size={58} strokeWidth={1.5} />
            </div>
            <h3>{condition?.label || "Loading weather..."}</h3>
            <p>Feels like {temperature(current?.apparent_temperature)}°{unit}</p>
            <div className="hero-minmax">
              <span><ArrowUp size={15} /> {temperature(daily?.temperature_2m_max?.[0])}° high</span>
              <span><ArrowDown size={15} /> {temperature(daily?.temperature_2m_min?.[0])}° low</span>
            </div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="sun-orb" />
            <CloudSun size={150} strokeWidth={1} />
          </div>
          <button className={`favorite-button ${isFavorite ? "is-favorite" : ""}`}
            onClick={() => toggleFavorite()} aria-label="Toggle favorite">
            <Heart size={19} fill={isFavorite ? "currentColor" : "none"} />
          </button>
        </section>

        <div className="section-heading">
          <div><h3>Today's highlights</h3><p>Weather conditions at a glance</p></div>
          <span className="live-pill"><span /> Live weather</span>
        </div>

        <div className="metrics-grid">
          <Metric icon={Droplets} label="Humidity" value={current?.relative_humidity_2m ?? "--"} unit="%" detail="Relative humidity" />
          <Metric icon={Wind} label="Wind speed" value={current?.wind_speed_10m ?? "--"} unit=" km/h" detail={`Direction ${current?.wind_direction_10m ?? "--"}°`} />
          <Metric icon={Thermometer} label="Feels like" value={temperature(current?.apparent_temperature)} unit={`°${unit}`} detail="Apparent temperature" />
          <Metric icon={Gauge} label="Pressure" value={Math.round(current?.surface_pressure ?? 0) || "--"} unit=" hPa" detail="Surface pressure" />
        </div>

        <div className="section-heading">
          <div><h3>Next 24 hours</h3><p>See how the weather changes throughout the day</p></div>
          <button className="text-button" onClick={() => setPage("Hourly Forecast")}>View hourly →</button>
        </div>
        <div className="hourly-strip">
          {hours.slice(0, 8).map((time, i) => (
            <WeatherCard key={time} time={i === 0 ? "Now" : formatHour(time)}
              code={hourly.weather_code[currentHourIndex + i]}
              temp={hourly.temperature_2m[currentHourIndex + i]} />
          ))}
        </div>

        <div className="section-heading">
          <div><h3>7-day forecast</h3><p>Your week, planned with confidence</p></div>
          <button className="text-button" onClick={() => setPage("7-Day Forecast")}>Full forecast →</button>
        </div>
        {renderWeek(true)}
      </>
    );
  }

  function renderWeek(compact = false) {
    if (!daily) return null;
    return (
      <div className={`forecast-list ${compact ? "compact-list" : ""}`}>
        {daily.time.map((date, i) => {
          const info = weatherInfo(daily.weather_code[i]);
          const Icon = info.icon;
          return (
            <div className="forecast-row" key={date}>
              <strong>{i === 0 ? "Today" : formatDay(date)}</strong>
              <div className="forecast-condition"><Icon size={23} /><span>{info.label}</span></div>
              <div className="temp-range">
                <span>{temperature(daily.temperature_2m_max[i])}°</span>
                <div className="range-track"><span style={{ left: `${Math.max(0, Math.min(80, 10 + (daily.temperature_2m_min[i] + 10) * 1.5))}%` }} /></div>
                <span className="muted">{temperature(daily.temperature_2m_min[i])}°</span>
              </div>
              {!compact && <span className="muted rain-chance"><Droplets size={14} /> {daily.precipitation_probability_max?.[i] ?? 0}%</span>}
            </div>
          );
        })}
      </div>
    );
  }

  function renderHourly() {
    if (!hourly) return null;
    return (
      <>
        <SectionTitle eyebrow="PLAN YOUR DAY" title="Hourly forecast" subtitle={`The next 24 hours in ${city.name}`} />
        <div className="hourly-feature">
          <div><span className="eyebrow">RIGHT NOW</span><h3>{temperature(current?.temperature_2m)}°{unit}</h3><p>{condition?.label}</p></div>
          <CurrentIcon size={62} />
          <div className="hourly-feature-detail"><span>Feels like</span><strong>{temperature(current?.apparent_temperature)}°{unit}</strong></div>
        </div>
        <div className="hourly-grid">
          {hours.map((time, i) => {
            const info = weatherInfo(hourly.weather_code[currentHourIndex + i]);
            const Icon = info.icon;
            return <article className="hour-detail-card" key={time}>
              <span className="muted">{i === 0 ? "Now" : formatHour(time)}</span>
              <Icon size={27} />
              <strong>{temperature(hourly.temperature_2m[currentHourIndex + i])}°</strong>
              <span className="muted"><Droplets size={13} /> {hourly.precipitation_probability[currentHourIndex + i] ?? 0}%</span>
              <span className="muted"><Wind size={13} /> {hourly.wind_speed_10m[currentHourIndex + i] ?? "--"} km/h</span>
            </article>;
          })}
        </div>
      </>
    );
  }

  function renderDetails() {
    return (
      <>
        <SectionTitle eyebrow="WEATHER INTELLIGENCE" title="Weather details" subtitle={`More conditions for ${city.name}`} />
        <div className="metrics-grid detail-metrics">
          <Metric icon={Sun} label="UV index (max)" value={daily?.uv_index_max?.[0] ?? "--"} detail="Today's forecast maximum" />
          <Metric icon={Droplets} label="Rain probability" value={daily?.precipitation_probability_max?.[0] ?? 0} unit="%" detail="Maximum chance today" />
          <Metric icon={Sunrise} label="Sunrise" value={daily?.sunrise?.[0] ? new Date(daily.sunrise[0]).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--"} detail="Local time" />
          <Metric icon={Sunset} label="Sunset" value={daily?.sunset?.[0] ? new Date(daily.sunset[0]).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--"} detail="Local time" />
          <Metric icon={Eye} label="Humidity" value={current?.relative_humidity_2m ?? "--"} unit="%" detail="Moisture in the air" />
          <Metric icon={Compass} label="Wind direction" value={current?.wind_direction_10m ?? "--"} unit="°" detail="Degrees clockwise from north" />
          <Metric icon={Gauge} label="Surface pressure" value={current?.surface_pressure ?? "--"} unit=" hPa" detail="Atmospheric pressure" />
          <Metric icon={Cloud} label="Precipitation now" value={current?.precipitation ?? 0} unit=" mm" detail="Current precipitation" />
        </div>
        <div className="info-note"><Activity size={20} /><div><strong>About these measurements</strong><p>Values are supplied by Open-Meteo weather models. Forecasts may differ from local observations.</p></div></div>
      </>
    );
  }

  function renderMap() {
    return (
      <>
        <SectionTitle eyebrow="EXPLORE YOUR LOCATION" title="Weather map" subtitle={`Map centered on ${city.name}`} />
        <div className="map-info-card"><MapPin size={20} /><div><strong>{city.name}, {city.country}</strong><p>{city.latitude.toFixed(3)}° latitude · {city.longitude.toFixed(3)}° longitude</p></div></div>
        <div className="map-frame">
          <iframe title={`Map of ${city.name}`}
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${city.longitude - 0.12}%2C${city.latitude - 0.08}%2C${city.longitude + 0.12}%2C${city.latitude + 0.08}&layer=mapnik&marker=${city.latitude}%2C${city.longitude}`}
            loading="lazy" />
        </div>
        <a className="map-link" href={`https://www.openstreetmap.org/?mlat=${city.latitude}&mlon=${city.longitude}#map=11/${city.latitude}/${city.longitude}`} target="_blank" rel="noreferrer">Open larger map ↗</a>
        <div className="info-note"><Map size={20} /><div><strong>Map information</strong><p>This page displays a geographic map, not a live weather-radar layer.</p></div></div>
      </>
    );
  }

  function renderFavorites() {
    return (
      <>
        <SectionTitle eyebrow="YOUR PERSONAL WEATHER LIST" title="Favorite cities" subtitle="Save places you want to check often." />
        <form className="search-form favorite-search" onSubmit={handleSearch}>
          <Search size={19} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search for a city to add..." />
          <button type="submit">Search</button>
        </form>
        {results.length > 0 && <div className="search-results">{results.map((place) =>
          <button key={`${place.latitude}-${place.longitude}`} onClick={() => toggleFavorite(place)}>
            <MapPin size={17} /><span><strong>{place.name}</strong><small>{place.country}</small></span><span>+ Add</span>
          </button>)}</div>}
        {favorites.length === 0 ? <div className="empty-state"><Heart size={35} /><h3>No favorite cities yet</h3><p>Search for a city above and add it to your list.</p></div> :
          <div className="favorite-grid">{favorites.map((place) => <article className="favorite-card" key={`${place.latitude}-${place.longitude}`}>
            <div className="favorite-card-top"><MapPin size={18} /><button onClick={() => toggleFavorite(place)} aria-label={`Remove ${place.name}`}><X size={17} /></button></div>
            <h3>{place.name}</h3><p>{place.country}</p>
            <button className="secondary-button" onClick={() => chooseCity(place)}>View weather →</button>
          </article>)}</div>}
      </>
    );
  }

  function renderPage() {
    if (loading && !weather) return <div className="loading-state"><div className="spinner" /><h3>Loading weather...</h3><p>Connecting to live weather data.</p></div>;
    if (error && !weather) return <div className="error-card"><Cloud size={32} /><h3>Weather unavailable</h3><p>{error}</p><button onClick={() => loadWeather(city)}>Try again</button></div>;

    switch (page) {
      case "7-Day Forecast": return <><SectionTitle eyebrow="THE WEEK AHEAD" title="7-day forecast" subtitle={`Plan the week in ${city.name}`} />{renderWeek()}</>;
      case "Hourly Forecast": return renderHourly();
      case "Weather Map": return renderMap();
      case "Weather Details": return renderDetails();
      case "Favorite Cities": return renderFavorites();
      default: return renderOverview();
    }
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileMenu ? "sidebar-open" : ""}`}>
        <div className="brand"><div className="brand-mark"><CloudSun size={25} /></div><span>skycast<span className="brand-dot">.</span><small>WEATHER STUDIO</small></span><button className="mobile-close" onClick={() => setMobileMenu(false)}><X /></button></div>
        <div className="nav-label">WORKSPACE</div>
        <nav>{navItems.map(({ name, icon: Icon }) => <button key={name} className={`nav-item ${page === name ? "active" : ""}`} onClick={() => { setPage(name); setMobileMenu(false); setResults([]); }}><Icon size={19} /><span>{name}</span>{name === "Favorite Cities" && favorites.length > 0 && <span className="nav-count">{favorites.length}</span>}</button>)}</nav>
        <div className="sidebar-bottom"><div className="sidebar-weather-icon"><CloudSun size={27} /></div><strong>Weather, simplified.</strong><p>Your world, one forecast away.</p><span>Weather data by <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a></span></div>
      </aside>

      {mobileMenu && <button className="mobile-backdrop" aria-label="Close menu" onClick={() => setMobileMenu(false)} />}

      <main className="main-area">
        <header className="topbar">
          <div className="topbar-left"><button className="mobile-menu-button" onClick={() => setMobileMenu(true)} aria-label="Open menu"><Menu /></button><div><span className="breadcrumb">Weather / </span><strong>{page}</strong></div></div>
          <div className="topbar-actions">
            <button className="unit-toggle" onClick={() => setUnit(unit === "C" ? "F" : "C")} title="Switch temperature units">°{unit} <span>⌄</span></button>
            <div className="top-date">{new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</div>
            <div className="avatar">S</div>
          </div>
        </header>

        <div className="content-area">
          <div className="page-intro"><div><span className="eyebrow">YOUR PERSONAL WEATHER SPACE</span><h1>{page === "Overview" ? "Good day, explorer" : page}</h1><p>Stay one step ahead of the weather.</p></div><span className="update-label">{loading ? "Updating..." : "● Data connected"}</span></div>

          <form className="search-form main-search" onSubmit={handleSearch}>
            <Search size={19} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search any city in the world..." aria-label="Search city" />
            <button type="submit">Search</button>
          </form>
          {results.length > 0 && <div className="search-results">{results.map((place) =>
            <button key={`${place.latitude}-${place.longitude}`} onClick={() => chooseCity(place)}><MapPin size={17} /><span><strong>{place.name}</strong><small>{[place.admin1, place.country].filter(Boolean).join(", ")}</small></span><span>View weather →</span></button>)}</div>}
          {error && weather && <div className="inline-error">{error}</div>}
          {loading && weather && <div className="refreshing-note">Refreshing weather data…</div>}
          {renderPage()}
          <footer className="page-footer"><span>© {new Date().getFullYear()} Skycast Weather</span><span>Forecast data: <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a> · Map © OpenStreetMap</span></footer>
        </div>
      </main>
    </div>
  );
}

export default App;
