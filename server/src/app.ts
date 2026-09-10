import cookieParser from 'cookie-parser';
import express from 'express';
import { StatusCodes } from 'http-status-codes';
import mongoose from 'mongoose';
import { globalErrorHandler } from './app/middlewares/globalErrorHandler.js';
import { noStore } from './app/middlewares/noStore.js';
import { notFound } from './app/middlewares/notFound.js';
import { apiRoutes } from './app/routes/index.js';
import { sendResponse } from './app/utils/sendResponse.js';

const app = express();

/**
 * Two proxies sit in front of this server (Vercel, then Railway). This is set
 * so `req.protocol` and `req.ip` are meaningful **in logs only** — nothing
 * security-relevant is ever keyed on the client IP, because a forwarded header
 * is attacker-controlled. Lockouts are account-keyed (plan §3).
 */
app.set('trust proxy', true);
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

app.use('/api', notFound);
app.use(globalErrorHandler);

export default app;
