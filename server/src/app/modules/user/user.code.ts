import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { config } from '../../../config/index.js';

/** Four digits, as in the workplace this is modelled on. */
export const CODE_LENGTH = 4;
const CODE_MIN = 0;
const CODE_MAX = 10 ** CODE_LENGTH;

/**
 * A random code, never a sequential one.
 *
 * Sequential issuing would mean that learning one colleague's code tells you
 * roughly where everyone else's sits, which turns a ten-thousand-wide space
 * into a handful of guesses. `randomInt` is the CSPRNG, not `Math.random`.
 */
export const generateCode = (): string =>
  String(randomInt(CODE_MIN, CODE_MAX)).padStart(CODE_LENGTH, '0');

/**
 * The stored form of a code: a keyed hash that both identifies and
 * authenticates, in one indexed read.
 *
 * See `IUser.codeLookup` for why this is an HMAC rather than bcrypt.
 */
export const codeLookupOf = (code: string): string =>
  createHmac('sha256', config.PUNCH_CODE_PEPPER).update(code).digest('hex');

/**
 * Compares two digests without leaking where they first differ.
 *
 * The database lookup is already an equality match, so this guards the second
 * comparison the service makes rather than the query itself.
 */
export const lookupMatches = (a: string, b: string): boolean => {
  const left = Buffer.from(a, 'hex');
  const right = Buffer.from(b, 'hex');

  return left.length === right.length && timingSafeEqual(left, right);
};
