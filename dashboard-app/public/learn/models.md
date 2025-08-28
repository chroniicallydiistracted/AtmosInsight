# Weather Model Layers (Forecast)

- Definition: Gridded forecast fields (e.g., temperature, wind, pressure) rendered as tile overlays.
- Update cadence: Varies by model (hourly to 6‑hourly). Some providers publish visualization‑ready tiles with short TTLs.
- Limitations: Models have biases and resolution limits; local effects may not be captured; always consider uncertainty when interpreting single frames.
- Source: Example provider OpenWeatherMap tiles `https://tile.openweathermap.org/map/{layer}/{z}/{x}/{y}.png?appid=...` via the proxy with a layer allowlist.
