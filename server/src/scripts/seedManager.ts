import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { config } from '../config/index.js';
import { User } from '../app/modules/user/user.model.js';

/**
 * Creates the first manager account.
 *
 * There is no public sign-up — this is an internal tool for one company, so the
 * only way in is a manager seeded deliberately by an operator. Run once per
 * database:
 *
 *   npm run seed:manager -- --name "Jane Doe" --email jane@example.com \
 *     --password "a-long-password"
 */

const MIN_PASSWORD_LENGTH = 10;

/** Reads `--flag value` pairs from argv, falling back to an environment variable. */
const readArg = (flag: string, envKey: string): string | undefined => {
  const index = process.argv.indexOf(`--${flag}`);

  if (index !== -1) {
    const value = process.argv[index + 1];
    if (value !== undefined && !value.startsWith('--')) {
      return value;
    }
  }

  return process.env[envKey];
};

const run = async (): Promise<void> => {
  const name = readArg('name', 'SEED_MANAGER_NAME');
  const email = readArg('email', 'SEED_MANAGER_EMAIL')?.toLowerCase();
  const password = readArg('password', 'SEED_MANAGER_PASSWORD');

  if (!name || !email || !password) {
    throw new Error(
      'Missing required values. Provide --name, --email and --password ' +
        '(or SEED_MANAGER_NAME / SEED_MANAGER_EMAIL / SEED_MANAGER_PASSWORD).',
    );
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(
      `Password must be at least ${String(MIN_PASSWORD_LENGTH)} characters.`,
    );
  }

  await mongoose.connect(config.MONGODB_URI, { dbName: config.MONGODB_DB });
  console.log(`Connected to "${config.MONGODB_DB}"`);

  const existing = await User.findOne({ email });

  if (existing) {
    throw new Error(
      `A user with the email ${email} already exists. Nothing was changed.`,
    );
  }

  const manager = await User.create({
    name,
    email,
    passwordHash: await bcrypt.hash(password, config.BCRYPT_ROUNDS),
    role: 'manager',
    isActive: true,
  });

  // The password is never echoed, not even on success.
  console.log(`Created manager "${manager.name}" <${email}>`);
  console.log(`  id: ${String(manager._id)}`);
};

run()
  .then(async () => {
    await mongoose.connection.close();
    process.exit(0);
  })
  .catch(async (error: unknown) => {
    console.error(
      error instanceof Error ? `Seed failed: ${error.message}` : error,
    );
    await mongoose.connection.close().catch(() => undefined);
    process.exit(1);
  });
