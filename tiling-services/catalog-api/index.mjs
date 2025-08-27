import fs from 'node:fs/promises';
import path from 'node:path';

const base = path.dirname(new URL(import.meta.url).pathname);
const layersPath = path.join(base, 'layers.json');
const timesPath = path.join(base, 'times.json');

async function getLayers() {
  const txt = await fs.readFile(layersPath, 'utf8');
  return JSON.parse(txt);
}

async function getTimes(id) {
  const txt = await fs.readFile(timesPath, 'utf8');
  const all = JSON.parse(txt);
  return all[id] || [];
}

export async function handler(event) {
  const path = event.rawPath || '';
  if (path === '/catalog/layers') {
    const layers = await getLayers();
    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(layers)
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
      body: JSON.stringify(body)
    };
  }
  return { statusCode: 404, body: 'not found' };
}
