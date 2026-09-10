import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { config } from '../../config/index.js';
import type { AccessTokenPayload } from '../modules/auth/auth.interface.js';

/**
 * Opaque credential for refresh, kiosk and phone sessions.
 *
 * Not a JWT: these must be revocable the instant a manager unlinks a phone or
 * deactivates a leaver, and a self-contained token cannot be withdrawn.
 */
export const createOpaqueToken = (): string =>
  randomBytes(32).toString('base64url');

/**
 * Only the hash is stored, so a database dump does not hand over live sessions.
 * sha256 rather than bcrypt is correct here — the input is 256 bits of entropy,
 * so there is nothing to brute-force and no salt to add.
 */
export const hashToken = (raw: string): string =>
  createHash('sha256').update(raw).digest('hex');

/** Constant-time comparison for hashes, so timing cannot confirm a near miss. */
export const hashesMatch = (a: string, b: string): boolean => {
  const bufferA = Buffer.from(a, 'hex');
  const bufferB = Buffer.from(b, 'hex');

  return (
    bufferA.length === bufferB.length && timingSafeEqual(bufferA, bufferB)
  );
};

/** Short-lived bearer of identity. Everything durable lives in a Session row. */
export const signAccessToken = (payload: AccessTokenPayload): string =>
  jwt.sign(payload, config.JWT_ACCESS_SECRET, {
    expiresIn: config.ACCESS_TOKEN_TTL,
  } as jwt.SignOptions);

/** Throws on an expired or tampered token; the global handler maps it to a 401. */
export const verifyAccessToken = (token: string): AccessTokenPayload =>
  jwt.verify(token, config.JWT_ACCESS_SECRET) as AccessTokenPayload;
