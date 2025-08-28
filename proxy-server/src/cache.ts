import { RequestHandler } from 'express';

export const shortLived60: RequestHandler = (_req, res, next) => {
  res.set('Cache-Control', 'public, max-age=60');
  next();
};

export const immutable1h: RequestHandler = (_req, res, next) => {
  res.set('Cache-Control', 'public, max-age=3600, immutable');
  next();
};
