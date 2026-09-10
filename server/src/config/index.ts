import 'dotenv/config';
import { z } from 'zod';
import { DURATION_PATTERN } from '../app/utils/duration.js';

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

  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),
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
