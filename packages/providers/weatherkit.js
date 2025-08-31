import { createSign } from 'crypto';
export const slug = 'apple-weatherkit';
export const baseUrl = 'https://weatherkit.apple.com/api/v1/weather';
export function buildRequest({ lang, lat, lon, dataSets }) {
  const params = `dataSets=${dataSets.join(',')}`;
  return `${baseUrl}/${lang}/${lat}/${lon}?${params}`;
}
export let generateJwt = () => {
  const teamId = process.env.WEATHERKIT_TEAM_ID;
  const serviceId = process.env.WEATHERKIT_SERVICE_ID;
  const keyId = process.env.WEATHERKIT_KEY_ID;
  const privateKey = process.env.WEATHERKIT_PRIVATE_KEY;
  if (!teamId || !serviceId || !keyId || !privateKey) {
    throw new Error('WeatherKit env vars missing');
  }
  const header = Buffer.from(
    JSON.stringify({ alg: 'ES256', kid: keyId })
  ).toString('base64url');
  const iat = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({ iss: teamId, sub: serviceId, iat, exp: iat + 3600 })
  ).toString('base64url');
  const body = `${header}.${payload}`;
  const signer = createSign('sha256');
  signer.update(body);
  signer.end();
  const signature = signer
    .sign(privateKey.replace(/\\n/g, '\n'))
    .toString('base64url');
  return `${body}.${signature}`;
};
export async function fetchJson(url, token = generateJwt()) {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return res.json();
}
