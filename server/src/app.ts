import cookieParser from 'cookie-parser';
import express from 'express';
import { StatusCodes } from 'http-status-codes';
import mongoose from 'mongoose';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { globalErrorHandler } from './app/middlewares/globalErrorHandler.js';
import { noStore } from './app/middlewares/noStore.js';
import { notFound } from './app/middlewares/notFound.js';
import { apiRoutes } from './app/routes/index.js';
import { sendResponse } from './app/utils/sendResponse.js';

const app = express();

/**
 * Exactly one proxy sits in front of this server: Railway's router.
 *
 * The hop count matters. `true` would make Express believe the whole of
 * `X-Forwarded-For`, and the left of that header is written by the caller — so
 * `req.ip` would become an attacker-chosen value and the per-IP throttle on the
 * punch endpoints could be sidestepped by inventing a new address per request.
 * Trusting a single hop takes the address Railway actually observed.
 *
 * Even so, nothing security-relevant is **authorised** by IP.
 */
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(express.json());
app.use(cookieParser());

/** Every API response is uncacheable. See the middleware for why. */
app.use('/api', noStore);

app.get('/api/health', (_req, res) => {
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    message: 'TimeGate API is running',
    data: {
      uptimeSeconds: Math.round(process.uptime()),
      database: mongoose.STATES[mongoose.connection.readyState],
      timestamp: new Date().toISOString(),
    },
  });
});

app.use('/api', apiRoutes);

/**
 * API 404s must stay JSON. Registering this before the static block is what
 * stops an unknown `/api/*` path falling through and being answered with
 * `index.html`.
 */
app.use('/api', notFound);

/**
 * One origin serves the API and the built client, which is what makes the auth
 * cookies first-party without a proxy.
 *
 * `index: false` keeps `express.static` from answering `/` directly, so every
 * navigation reaches the SPA fallback below.
 *
 * The fallback is `/{*splat}`. Express 5 ships path-to-regexp 8, where a bare
 * `'*'` throws `Missing parameter name at index 1`, so the wildcard must be
 * named — and a bare `/*splat` matches every path **except** `/`, which would
 * leave the root serving Express's default 404 page. The braces make the
 * segment optional so `/` matches too. Verified against both patterns.
 */
const CLIENT_DIST = join(
  fileURLToPath(new URL('.', import.meta.url)),
  '../../client/dist',
);

app.use(express.static(CLIENT_DIST, { index: false }));
app.get('/{*splat}', (_req, res) => {
  res.sendFile(join(CLIENT_DIST, 'index.html'));
});

app.use(globalErrorHandler);

export default app;
