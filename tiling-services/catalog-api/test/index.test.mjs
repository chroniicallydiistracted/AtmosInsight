import test from 'node:test';
import assert from 'node:assert/strict';
import { handler } from '../index.mjs';

test('lists layers', async () => {
  const res = await handler({ rawPath: '/catalog/layers' });
  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  assert.ok(Array.isArray(body));
  assert.equal(body[0].id, 'goes-east');
});

test('lists times with limit', async () => {
  const res = await handler({ rawPath: '/catalog/layers/goes-east/times', queryStringParameters: { limit: '2' } });
  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  assert.equal(body.length, 2);
});
