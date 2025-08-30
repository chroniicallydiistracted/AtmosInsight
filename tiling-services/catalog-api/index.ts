import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const base = __dirname;
const layersPath = path.join(base, 'layers.json');
const timesPath = path.join(base, 'times.json');

interface ServerEvent {
  rawPath: string;
  queryStringParameters?: Record<string, string>;
}

interface ServerResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

async function getLayers(): Promise<any> {
  const txt = await fs.readFile(layersPath, 'utf8');
  return JSON.parse(txt);
}

async function getTimes(id: string): Promise<string[]> {
  const txt = await fs.readFile(timesPath, 'utf8');
  const all: Record<string, string[]> = JSON.parse(txt);
  return all[id] || [];
}

export async function handler(event: ServerEvent): Promise<ServerResponse> {
  const path = event.rawPath || '';

  if (path === '/health') {
    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'ok' }),
    };
  }

  if (path === '/catalog/layers') {
    const layers = await getLayers();
    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(layers),
    };
  }

  const match = path.match(/^\/catalog\/layers\/([^\/]+)\/times$/);
  if (match) {
    const id = match[1];
    const limit = event.queryStringParameters?.limit
      ? Number(event.queryStringParameters.limit)
      : undefined;
    const times = await getTimes(id);
    const body = limit ? times.slice(0, limit) : times;
    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    };
  }

  return {
    statusCode: 404,
    headers: { 'content-type': 'text/plain' },
    body: 'not found',
  };
}
