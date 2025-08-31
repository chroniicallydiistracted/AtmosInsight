import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Load port configuration from JSON file
// Try absolute workspace path first (requested), then fall back to repo-relative path.
let config = null;
const absConfigPath = '/AtmosInsight/config/ports.json';
const relativeConfigPath = join(__dirname, '..', '..', 'config', 'ports.json');
try {
  config = JSON.parse(readFileSync(absConfigPath, 'utf8'));
} catch (e) {
  try {
    config = JSON.parse(readFileSync(relativeConfigPath, 'utf8'));
  } catch (e2) {
    // Fallback defaults if ports.json is missing
    config = { proxy: 3000, catalog: 3001, web: 3002, database: 5432 };
  }
}
export const PORTS = {
  PROXY: config.proxy,
  CATALOG: config.catalog,
  WEB: config.web,
  DATABASE: config.database,
};
export function createErrorResponse(status, error, details) {
  return { status, error, details };
}
export function createSuccessResponse(status, data, headers) {
  return { status, data, headers };
}
// Common HTTP status codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
};
// Common headers
export const HEADERS = {
  JSON: { 'Content-Type': 'application/json' },
  TEXT: { 'Content-Type': 'text/plain' },
  PNG: { 'Content-Type': 'image/png' },
  XML: { 'Content-Type': 'application/xml' },
  CACHE_SHORT: { 'Cache-Control': 'public, max-age=60' },
  CACHE_MEDIUM: { 'Cache-Control': 'public, max-age=300' },
  CACHE_LONG: { 'Cache-Control': 'public, max-age=3600' },
};
// Port checking utility
export function isPortInUse(port) {
  return new Promise(resolve => {
    const { exec } = require('child_process');
    // Try multiple methods to check port usage
    exec(`lsof -Pi :${port} -sTCP:LISTEN -t 2>/dev/null`, (error, stdout) => {
      if (!error && stdout) {
        resolve(true);
        return;
      }
      exec(`ss -tlnp | grep ":${port} " 2>/dev/null`, (error2, stdout2) => {
        if (!error2 && stdout2) {
          resolve(true);
        } else {
          resolve(false);
        }
      });
    });
  });
}
// Process killing utility
export async function killProcessOnPort(port) {
  return new Promise(resolve => {
    const { exec } = require('child_process');
    // Try to kill using lsof first
    exec(`lsof -ti:${port} 2>/dev/null`, (error, pid) => {
      if (!error && pid) {
        // Try graceful shutdown first
        exec(`kill -TERM ${pid.trim()}`, killError => {
          if (!killError) {
            // Wait a moment for graceful shutdown
            setTimeout(() => {
              // Check if process is still running
              exec(`ps -p ${pid.trim()} -o comm= 2>/dev/null`, checkError => {
                if (!checkError) {
                  // If still running, force kill
                  exec(`kill -KILL ${pid.trim()}`, forceKillError => {
                    resolve(!forceKillError);
                  });
                } else {
                  // Process terminated gracefully
                  resolve(true);
                }
              });
            }, 3000);
          } else {
            // Failed to send termination signal, try force kill
            exec(`kill -KILL ${pid.trim()}`, forceKillError => {
              resolve(!forceKillError);
            });
          }
        });
      } else {
        // Try alternative method using fuser
        exec(`fuser -k ${port}/tcp 2>/dev/null`, fuserError => {
          if (!fuserError) {
            resolve(true);
          } else {
            // Last resort: try to kill any process using the port
            exec(`pkill -f ":${port}" 2>/dev/null`, pkillError => {
              resolve(!pkillError);
            });
          }
        });
      }
    });
  });
}
// Health check utility
export function createHealthCheckEndpoint(serviceName) {
  return async (req, res) => {
    try {
      res.status(200).json({
        service: serviceName,
        status: 'healthy',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        service: serviceName,
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  };
}
// Retry utility with exponential backoff
export async function fetchWithRetry(
  url,
  options = {},
  retries = 3,
  timeoutMs = 10000,
  backoffMs = 500
) {
  let attempt = 0;
  let delay = backoffMs;
  while (true) {
    try {
      const timeoutSignal = AbortSignal.timeout(timeoutMs);
      const signal = options.signal
        ? AbortSignal.any([options.signal, timeoutSignal])
        : timeoutSignal;
      const response = await fetch(url, { ...options, signal });
      // If we hit a rate limit (429) and still have retries left, wait and retry
      if (response.status === 429 && attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
        attempt++;
        continue;
      }
      return response;
    } catch (error) {
      // If we've used all retries, throw the error
      if (attempt >= retries) {
        throw error;
      }
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2;
      attempt++;
    }
  }
}
//# sourceMappingURL=index.js.map
