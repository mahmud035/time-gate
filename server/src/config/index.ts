import { config as loadEnvFile } from 'dotenv';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { DURATION_PATTERN } from '../app/utils/duration.js';

/**
 * `NODE_ENV` chooses the file, so it is read from the real environment before
 * the schema below ever runs: `.env.development` locally, `.env.production` for
 * a production-mode run on this machine.
 *
 * Two dotenv behaviours make this safe on a hosted platform, and both are
 * relied on deliberately:
 *
 * 1. A real environment variable always beats a file value, so Railway's
 *    dashboard variables win and are never shadowed by a stray local file.
 * 2. A missing file is not an error. Nothing is deployed with the app — the
 *    env files are gitignored — so in production dotenv simply finds nothing
 *    and the platform's own variables are used.
 *
 * Resolved against the package root rather than `process.cwd()` so the script
 * works the same whether it is run by tsx from source or by node from `dist`.
 */
const mode = process.env.NODE_ENV ?? 'development';
const packageRoot = fileURLToPath(new URL('../../', import.meta.url));

loadEnvFile({ path: join(packageRoot, `.env.${mode}`), quiet: true });

/**
 * Environment contract. The process refuses to boot on an invalid environment —
 * a missing secret should fail loudly at startup, never silently at 3am.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),

  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  MONGODB_DB: z.string().min(1, 'MONGODB_DB is required'),

  JWT_ACCESS_SECRET: z
    .string()
    .min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  // Validated here so a typo like "15min" fails at boot rather than producing a
  // token with a silently wrong lifetime.
  ACCESS_TOKEN_TTL: z.string().regex(DURATION_PATTERN).default('15m'),
  REFRESH_TOKEN_TTL: z.string().regex(DURATION_PATTERN).default('7d'),
  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),

  TIMEZONE: z.string().default('Europe/London'),
  OPEN_SHIFT_LIMIT_HOURS: z.coerce.number().int().positive().default(16),
  PAY_WEEK_START: z.enum(['monday', 'sunday']).default('monday'),

  /**
   * Gates the punch page. Staff arrive by link and never type it, so length
   * costs nothing and an unguessable path is what stops a public code-only
   * endpoint being enumerated from the open internet.
   */
  PUNCH_SLUG: z.string().min(16, 'PUNCH_SLUG must be at least 16 characters'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:');
  for (const issue of parsed.error.issues) {
    console.error(`  ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

export const config = parsed.data;

export const isProduction = config.NODE_ENV === 'production';
