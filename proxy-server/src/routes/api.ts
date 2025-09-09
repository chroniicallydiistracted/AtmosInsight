import { Router } from 'express';
import { fetchWithRetry } from '@atmos/fetch-client';
import { getProvider } from '@atmos/providers';
import { AppError } from '../middleware/errorHandler.js';

export function createApiRouter(): Router {
  const router = Router();

  // NASA GIBS proxy
  router.get('/gibs/*', async (req, res, next) => {
    try {
      const gibsPath = (req.params as any)[0];
      const queryString = req.url.split('?')[1];
      
      const gibsProvider = getProvider('nasa-gibs');
      if (!gibsProvider || !gibsProvider.wmts) {
        throw new Error('GIBS provider not configured');
      }

      const url = `${gibsProvider.wmts.baseUrl}/${gibsPath}${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetchWithRetry(url, {
        headers: {
          'User-Agent': process.env.NWS_USER_AGENT || 'AtmosInsight/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`GIBS request failed: ${response.status} ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType) {
        res.setHeader('Content-Type', contentType);
      }

      res.setHeader('Cache-Control', 'public, max-age=3600');
      
      const buffer = await response.arrayBuffer();
      res.send(Buffer.from(buffer));

    } catch (error) {
      const appError: AppError = new Error(`GIBS proxy error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      appError.status = 500;
      next(appError);
    }
  });

  // AirNow proxy
  router.get('/air/airnow/*', async (req, res, next) => {
    try {
      const apiKey = process.env.AIRNOW_API_KEY;
      if (!apiKey) {
        const error: AppError = new Error('AirNow API key not configured');
        error.status = 503;
        return next(error);
      }

      const airnowPath = (req.params as any)[0];
      const queryString = req.url.split('?')[1];
      
      const airnowProvider = getProvider('airnow');
      if (!airnowProvider || !airnowProvider.rest) {
        throw new Error('AirNow provider not configured');
      }

      const url = `${airnowProvider.rest.baseUrl}/${airnowPath}?API_KEY=${apiKey}${queryString ? `&${queryString}` : ''}`;
      
      const response = await fetchWithRetry(url);
      
      if (!response.ok) {
        throw new Error(`AirNow request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minute cache for air quality
      res.json(data);

    } catch (error) {
      const appError: AppError = new Error(`AirNow proxy error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      appError.status = 500;
      next(appError);
    }
  });

  // OpenAQ proxy
  router.get('/air/openaq/*', async (req, res, next) => {
    try {
      const openaqPath = (req.params as any)[0];
      const queryString = req.url.split('?')[1];
      
      const openaqProvider = getProvider('openaq');
      if (!openaqProvider || !openaqProvider.rest) {
        throw new Error('OpenAQ provider not configured');
      }

      const url = `${openaqProvider.rest.baseUrl}/${openaqPath}${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetchWithRetry(url);
      
      if (!response.ok) {
        throw new Error(`OpenAQ request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minute cache
      res.json(data);

    } catch (error) {
      const appError: AppError = new Error(`OpenAQ proxy error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      appError.status = 500;
      next(appError);
    }
  });

  // MET Norway proxy
  router.get('/point/metno', async (req, res, next) => {
    try {
      const { lat, lon, altitude } = req.query;
      
      if (!lat || !lon) {
        const error: AppError = new Error('lat and lon parameters are required');
        error.status = 400;
        return next(error);
      }

      const metnoProvider = getProvider('met-norway');
      if (!metnoProvider || !metnoProvider.rest) {
        throw new Error('MET Norway provider not configured');
      }

      const params = new URLSearchParams({
        lat: lat as string,
        lon: lon as string,
        ...(altitude && { altitude: altitude as string })
      });

      const url = `${metnoProvider.rest.baseUrl}/complete?${params}`;
      
      const response = await fetchWithRetry(url, {
        headers: {
          'User-Agent': process.env.NWS_USER_AGENT || 'AtmosInsight/1.0 (https://github.com/chroniicallydiistracted/AtmosInsight)'
        }
      });
      
      if (!response.ok) {
        throw new Error(`MET Norway request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      res.setHeader('Cache-Control', 'public, max-age=1800'); // 30 minute cache for forecasts
      res.json(data);

    } catch (error) {
      const appError: AppError = new Error(`MET Norway proxy error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      appError.status = 500;
      next(appError);
    }
  });

  // Space Weather proxy (NOAA SWPC)
  router.get('/space/*', async (req, res, next) => {
    try {
      const spacePath = (req.params as any)[0];
      const queryString = req.url.split('?')[1];
      
      const swpcProvider = getProvider('noaa-swpc');
      if (!swpcProvider || !swpcProvider.rest) {
        throw new Error('NOAA SWPC provider not configured');
      }

      const url = `${swpcProvider.rest.baseUrl}/${spacePath}${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetchWithRetry(url);
      
      if (!response.ok) {
        throw new Error(`SWPC request failed: ${response.status} ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType?.includes('json')) {
        const data = await response.json();
        res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minute cache
        res.json(data);
      } else {
        const text = await response.text();
        res.setHeader('Content-Type', contentType || 'text/plain');
        res.setHeader('Cache-Control', 'public, max-age=300');
        res.send(text);
      }

    } catch (error) {
      const appError: AppError = new Error(`Space Weather proxy error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      appError.status = 500;
      next(appError);
    }
  });

  // RainViewer proxy
  router.get('/radar/rainviewer/*', async (req, res, next) => {
    try {
      const rainviewerPath = (req.params as any)[0];
      const queryString = req.url.split('?')[1];
      
      const rainviewerProvider = getProvider('rainviewer');
      if (!rainviewerProvider || !rainviewerProvider.tiles) {
        throw new Error('RainViewer provider not configured');
      }

      const url = `${rainviewerProvider.tiles.baseUrl}/${rainviewerPath}${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetchWithRetry(url);
      
      if (!response.ok) {
        throw new Error(`RainViewer request failed: ${response.status} ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType) {
        res.setHeader('Content-Type', contentType);
      }

      res.setHeader('Cache-Control', 'public, max-age=600'); // 10 minute cache for radar
      
      if (contentType?.includes('json')) {
        const data = await response.json();
        res.json(data);
      } else {
        const buffer = await response.arrayBuffer();
        res.send(Buffer.from(buffer));
      }

    } catch (error) {
      const appError: AppError = new Error(`RainViewer proxy error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      appError.status = 500;
      next(appError);
    }
  });

  // TracesTrack basemap proxy
  router.get('/basemap/tracestrack/*', async (req, res, next) => {
    try {
      const apiKey = process.env.TRACESTRACK_API_KEY;
      if (!apiKey) {
        const error: AppError = new Error('TracesTrack API key not configured');
        error.status = 503;
        return next(error);
      }

      const tilePath = (req.params as any)[0];
      
      const tracesProvider = getProvider('tracestrack-topo');
      if (!tracesProvider || !tracesProvider.tiles) {
        throw new Error('TracesTrack provider not configured');
      }

      const url = `${tracesProvider.tiles.baseUrl}${tracesProvider.tiles.tileFormat?.replace('{tilePath}', tilePath)}?key=${apiKey}`;
      
      const response = await fetchWithRetry(url);
      
      if (!response.ok) {
        throw new Error(`TracesTrack request failed: ${response.status} ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType) {
        res.setHeader('Content-Type', contentType);
      }

      res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day cache for basemap tiles
      
      const buffer = await response.arrayBuffer();
      res.send(Buffer.from(buffer));

    } catch (error) {
      const appError: AppError = new Error(`TracesTrack proxy error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      appError.status = 500;
      next(appError);
    }
  });

  // OpenWeatherMap tiles proxy
  router.get('/owm/*', async (req, res, next) => {
    try {
      const apiKey = process.env.OWM_API_KEY || process.env.OPENWEATHER_API_KEY;
      if (!apiKey) {
        const error: AppError = new Error('OpenWeatherMap API key not configured');
        error.status = 503;
        return next(error);
      }

      const owmPath = (req.params as any)[0];
      
      const owmProvider = getProvider('openweather-tiles');
      if (!owmProvider || !owmProvider.tiles) {
        throw new Error('OpenWeatherMap tiles provider not configured');
      }

      const url = `${owmProvider.tiles.baseUrl}/${owmPath}?appid=${apiKey}`;
      
      const response = await fetchWithRetry(url);
      
      if (!response.ok) {
        throw new Error(`OpenWeatherMap request failed: ${response.status} ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType) {
        res.setHeader('Content-Type', contentType);
      }

      res.setHeader('Cache-Control', 'public, max-age=600'); // 10 minute cache for weather tiles
      
      const buffer = await response.arrayBuffer();
      res.send(Buffer.from(buffer));

    } catch (error) {
      const appError: AppError = new Error(`OpenWeatherMap proxy error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      appError.status = 500;
      next(appError);
    }
  });

  // CyclOSM proxy (community tiles - use sparingly)
  router.get('/basemap/cyclosm/:z/:x/:y.png', async (req, res, next) => {
    try {
      const { z, x, y } = req.params;
      
      const cyclOSMProvider = getProvider('cyclosm');
      if (!cyclOSMProvider || !cyclOSMProvider.tiles) {
        throw new Error('CyclOSM provider not configured');
      }

      // Add rate limiting header to respect community service
      if (process.env.NODE_ENV === 'production') {
        const error: AppError = new Error('CyclOSM tiles should not be used in production - use commercial alternative');
        error.status = 503;
        return next(error);
      }

      const url = `${cyclOSMProvider.tiles.baseUrl}/${z}/${x}/${y}.png`;
      
      const response = await fetchWithRetry(url, {
        headers: {
          'User-Agent': process.env.NWS_USER_AGENT || 'AtmosInsight/1.0'
        }
      });
      
      if (!response.ok) {
        throw new Error(`CyclOSM request failed: ${response.status} ${response.statusText}`);
      }

      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day cache
      
      const buffer = await response.arrayBuffer();
      res.send(Buffer.from(buffer));

    } catch (error) {
      const appError: AppError = new Error(`CyclOSM proxy error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      appError.status = 500;
      next(appError);
    }
  });

  return router;
}
