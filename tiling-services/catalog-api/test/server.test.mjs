import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../server.ts';

test('serves catalog layers over HTTP', async (t) => {
  const server = createServer().listen(0);
  t.after(() => server.close());
  const port = server.address().port;
  const res = await fetch(`http://localhost:${port}/catalog/layers`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(Array.isArray(body));
});
