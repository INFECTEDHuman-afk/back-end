import express from "express";
import fetch from "node-fetch";
const app = express();
app.use(express.json());

const PORT = 3000;
const TOMORROW_IO_API_KEY = "iGvsFx6Ps6mk1MnrAWi677ls9HC1ZYXC";
const GOOGLE_API_KEY = "AIzaSyB8pSm3UiPDV-IIMjWic6F7EldNmaKoJoA";
const IP_INFO_API_KEY = "d23a0ae9f2f13a";

app.get("/get_weather", async (req, res) => {
  const useLocation = req.query.use_location === "true";
  let lat, lon, formatted_address;

  if (useLocation) {
    const ipInfoUrl = `https://ipinfo.io/json?token=${IP_INFO_API_KEY}`;
    const ipResponse = await fetch(ipInfoUrl);
    const ipData = await ipResponse.json();
    [lat, lon] = ipData.loc.split(",");
    formatted_address = `${ipData.city}, ${ipData.region}, ${ipData.country}`;
  } else {
    const { street, city, state } = req.query;
    const address = `${street} ${city} ${state}`.split(" ").join("+");
    const googleUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${address}&key=${GOOGLE_API_KEY}`;
    const geoResponse = await fetch(googleUrl);

    console.log(geoResponse);
    const geoData = await geoResponse.json();

    if (geoData.status === "OK") {
      const results = geoData.results[0];
      lat = results.geometry.location.lat;
      lon = results.geometry.location.lng;
      formatted_address = results.formatted_address;
    } else {
      return res.status(400).json({ error: "Invalid address provided" });
    }

    lat = geoData.results[0].geometry.location.lat;
    lon = geoData.results[0].geometry.location.lng;
    formatted_address = geoData.results[0].formatted_address;
  }

  // Fields to retrieve from the API
  const fields =
    "temperature,temperatureMin,temperatureMax,weatherCode,precipitationProbability,windSpeed,humidity,visibility,sunriseTime,sunsetTime";

  // Configure parameters for the 7-day forecast
  const tomorrowUrl = `https://api.tomorrow.io/v4/timelines?location=${lat},${lon}&fields=${fields}&timesteps=1d&units=imperial&timezone=America/Los_Angeles&apikey=${TOMORROW_IO_API_KEY}&startTime=${new Date().toISOString()}`;

  const weatherResponse = await fetch(tomorrowUrl);
  const weatherData = await weatherResponse.json();

  if (!weatherResponse.ok) {
    return res.status(500).json({ error: "Unable to retrieve weather data" });
  }

  const dailyWeather = weatherData.data.timelines[0].intervals.map(
    (interval) => ({
      date: interval.startTime,
      temperatureMax: interval.values.temperatureMax,
      temperatureMin: interval.values.temperatureMin,
      weatherCode: interval.values.weatherCode,
      precipitationProbability: interval.values.precipitationProbability,
      windSpeed: interval.values.windSpeed,
      humidity: interval.values.humidity,
      visibility: interval.values.visibility,
      sunriseTime: interval.values.sunriseTime,
      sunsetTime: interval.values.sunsetTime,
    })
  );

  res.json({
    address: formatted_address,
    daily_weather: dailyWeather,
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
