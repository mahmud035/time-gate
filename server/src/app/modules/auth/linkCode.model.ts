import { model, Schema } from 'mongoose';
import type { ILinkCode } from './auth.interface.js';

const linkCodeSchema = new Schema<ILinkCode>({
  codeHash: { type: String, required: true, unique: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  expiresAt: { type: Date, required: true },
  usedAt: { type: Date, default: null },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, required: true, default: () => new Date() },
});

/**
 * TTL index — a spent or stale enrolment code is not a business record, so this
 * is the one collection v1 lets Mongo clean up.
 *
 * Mongo's TTL monitor only sweeps about once a minute, so a code can outlive its
 * `expiresAt` by up to that long. Expiry is therefore also checked on redemption
 * and never left to the index alone.
 */
linkCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const LinkCode = model<ILinkCode>('LinkCode', linkCodeSchema);
