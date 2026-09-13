import type { RequestHandler } from 'express';
import { StatusCodes } from 'http-status-codes';
import { timingSafeEqual } from 'node:crypto';
import { config } from '../../config/index.js';
import { AppError } from '../utils/AppError.js';

const matches = (candidate: string, expected: string): boolean => {
  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);

  return a.length === b.length && timingSafeEqual(a, b);
};

/**
 * Gates the punch endpoints behind an unguessable slug.
 *
 * The staff credential is four digits, which is only ten thousand
 * possibilities — discoverable in seconds if the endpoint can be found and
 * hammered. The slug is what stops it being found. Staff never type it: they
 * open a link, which is the same message that has to carry their code anyway.
 *
 * A wrong slug returns a plain 404, identical to any other unknown path, so
 * probing cannot distinguish "wrong slug" from "no such endpoint".
 *
 * It travels in the body rather than the URL so it stays out of access logs,
 * browser history and `Referer` headers.
 */
export const requirePunchSlug: RequestHandler = (req, _res, next) => {
  const body = req.body as { slug?: unknown } | undefined;
  const slug = typeof body?.slug === 'string' ? body.slug : '';

  if (!matches(slug, config.PUNCH_SLUG)) {
    throw new AppError(StatusCodes.NOT_FOUND, 'Not found');
  }

  next();
};
