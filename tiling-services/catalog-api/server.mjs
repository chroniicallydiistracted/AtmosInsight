import http from 'http';
import { handler } from './index.mjs';

const port = process.env.PORT || 3001;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const event = {
    rawPath: url.pathname,
    queryStringParameters: Object.fromEntries(url.searchParams.entries()),
  };
  const result = await handler(event);
  res.statusCode = result.statusCode;
  for (const key in result.headers) {
    res.setHeader(key, result.headers[key]);
  }
  res.end(result.body);
});

server.listen(port, () => {
  console.log(`catalog-api server listening on port ${port}`);
});
