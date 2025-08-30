import http from 'http';
import { URL, pathToFileURL } from 'url';
import { handler } from './index.js';

export function createServer() {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
    const event = {
      rawPath: url.pathname,
      queryStringParameters: Object.fromEntries(url.searchParams),
    };
    const response = await handler(event);
    res.writeHead(response.statusCode, response.headers);
    res.end(response.body);
  });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT) || 3001;
  createServer().listen(port, () => {
    console.log(`catalog-api listening on ${port}`);
  });
}
