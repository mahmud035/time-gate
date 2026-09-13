import mongoose from 'mongoose';
import { config } from '../config/index.js';
import { codeLookupOf, generateCode } from '../app/modules/user/user.code.js';
import { User } from '../app/modules/user/user.model.js';

/**
 * Adds a staff member and prints their code once.
 *
 * The manager dashboard does this properly in Batch 4. Until then this is how a
 * code gets issued at all, which is what makes the punch screen testable on the
 * real tablet:
 *
 *   npm run seed:staff -- --name "Priya Nair" --payroll-ref TG-002
 *
 * Only a keyed hash of the code is stored, so the line this prints is the only
 * time it can be read. Lose it and you issue a new one — which is the right way
 * round: a code the system could hand back is a code a database dump hands over.
 */

const CODE_ATTEMPTS = 10;
const DUPLICATE_KEY = 11000;

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

const isDuplicateKey = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  (error as { code?: number }).code === DUPLICATE_KEY;

const run = async (): Promise<void> => {
  const name = readArg('name', 'SEED_STAFF_NAME');
  const payrollRef = readArg('payroll-ref', 'SEED_STAFF_PAYROLL_REF');

  if (!name) {
    throw new Error('Missing required value. Provide --name "Their Name".');
  }

  await mongoose.connect(config.MONGODB_URI, { dbName: config.MONGODB_DB });
  console.log(`Connected to "${config.MONGODB_DB}"`);

  if (await User.findOne({ name, role: 'employee' })) {
    throw new Error(
      `A staff member called "${name}" already exists. Nothing was changed.`,
    );
  }

  // A clash is a wasted attempt, not a failure — four digits against a
  // workplace of tens collides rarely, and never visibly.
  for (let attempt = 0; attempt < CODE_ATTEMPTS; attempt += 1) {
    const code = generateCode();

    try {
      const created = await User.create({
        name,
        ...(payrollRef ? { payrollRef } : {}),
        role: 'employee',
        isActive: true,
        codeLookup: codeLookupOf(code),
      });

      console.log(`Added "${created.name}"`);
      console.log(`  id:   ${String(created._id)}`);
      console.log(`  code: ${code}   <- shown once, never recoverable`);

      return;
    } catch (error) {
      if (!isDuplicateKey(error)) throw error;
    }
  }

  throw new Error('Could not allocate an unused code. Try again.');
};

run()
  .then(async () => {
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch(async (error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    await mongoose.disconnect();
    process.exit(1);
  });
