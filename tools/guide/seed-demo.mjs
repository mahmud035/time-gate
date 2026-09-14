import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

/**
 * Deterministic demo data for the guide's screenshots.
 *
 * Invented people and a week whose arithmetic is easy to follow, so no real
 * name or wage ever appears in a document that gets emailed around. Runs
 * against whichever database the server's own config points at — never point it
 * at production.
 */
const DEMO_STAFF = [
  { name: 'Alice Reed', payrollRef: 'TG-101', code: '1111' },
  { name: 'Ben Shaw', payrollRef: 'TG-102', code: '2222' },
  { name: 'Cara Diaz', payrollRef: 'TG-103', code: '3333', isActive: false },
  { name: 'Dana Okoro', payrollRef: 'TG-104', code: '4444' },
];

export const MANAGER = {
  name: 'Aisha Karim',
  email: 'manager@timegate.example',
  password: 'Guide-Screenshots-Only',
};

export const DEMO_CODE = '1111';

export const seedDemo = async ({ serverRoot }) => {
  const serverDist = `${serverRoot}/dist`;

  /**
   * The server's dependencies live in its own package, and this tool runs from
   * the repository root, so they are resolved from there rather than assumed to
   * be hoisted — the two packages install separately on purpose.
   */
  const fromServer = createRequire(`${serverRoot}/package.json`);
  const load = async (name) => import(pathToFileURL(fromServer.resolve(name)).href);

  const { config } = await import(`${serverDist}/config/index.js`);
  const mongoose = (await load('mongoose')).default;
  const { DateTime } = await load('luxon');
  const { User } = await import(`${serverDist}/app/modules/user/user.model.js`);
  const { Punch } = await import(`${serverDist}/app/modules/punch/punch.model.js`);
  const { codeLookupOf } = await import(`${serverDist}/app/modules/user/user.code.js`);
  const bcrypt = (await load('bcryptjs')).default;

  if (config.NODE_ENV === 'production') {
    throw new Error('refusing to seed demo data against a production configuration');
  }

  await mongoose.connect(config.MONGODB_URI, { dbName: config.MONGODB_DB });

  const at = (iso) => DateTime.fromISO(iso, { zone: config.TIMEZONE }).toJSDate();
  const today = DateTime.now().setZone(config.TIMEZONE).toISODate();

  for (const person of [...DEMO_STAFF.map((s) => s.name), MANAGER.name]) {
    const existing = await User.findOne({ name: person });

    if (existing) {
      await Punch.deleteMany({ userId: existing._id });
      await User.deleteOne({ _id: existing._id });
    }
  }
  await User.deleteOne({ email: MANAGER.email });

  const people = {};
  for (const staff of DEMO_STAFF) {
    people[staff.name] = await User.create({
      name: staff.name,
      payrollRef: staff.payrollRef,
      role: 'employee',
      isActive: staff.isActive ?? true,
      codeLookup: codeLookupOf(staff.code),
    });
  }

  await User.create({
    name: MANAGER.name,
    email: MANAGER.email,
    passwordHash: await bcrypt.hash(MANAGER.password, config.BCRYPT_ROUNDS),
    role: 'manager',
    isActive: true,
  });

  const punch = (person, type, iso) =>
    Punch.create({
      userId: people[person]._id,
      type,
      at: at(iso),
      source: 'staff',
      createdBy: people[person]._id,
    });

  // A week that reads clearly in a screenshot: two clean shifts, one leaver,
  // and one forgotten clock-out to illustrate the review flow.
  await punch('Alice Reed', 'clock-in', '2026-09-07T09:00');
  await punch('Alice Reed', 'break-start', '2026-09-07T12:00');
  await punch('Alice Reed', 'break-end', '2026-09-07T12:30');
  await punch('Alice Reed', 'clock-out', '2026-09-07T17:00');
  await punch('Alice Reed', 'clock-in', '2026-09-08T09:00');
  await punch('Alice Reed', 'clock-out', '2026-09-08T17:00');

  await punch('Ben Shaw', 'clock-in', '2026-09-09T09:00');
  await punch('Ben Shaw', 'break-start', '2026-09-09T12:00');
  await punch('Ben Shaw', 'break-end', '2026-09-09T12:30');

  await punch('Cara Diaz', 'clock-in', '2026-09-07T10:00');
  await punch('Cara Diaz', 'clock-out', '2026-09-07T16:00');

  // A finished shift earlier today, so "your week so far" shows a real figure
  // on the confirmation screen rather than zero.
  await punch('Alice Reed', 'clock-in', `${today}T08:30`);
  await punch('Alice Reed', 'clock-out', `${today}T12:45`);

  await mongoose.disconnect();

  return { database: config.MONGODB_DB, slug: config.PUNCH_SLUG };
};
