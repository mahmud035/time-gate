import { model, Schema } from 'mongoose';
import { SESSION_KINDS, type ISession } from './auth.interface.js';

const sessionSchema = new Schema<ISession>(
  {
    tokenHash: { type: String, required: true, unique: true },
    kind: { type: String, enum: SESSION_KINDS, required: true },

    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    label: { type: String, required: true, trim: true },

    lastUsedAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
    revokedAt: { type: Date, default: null },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

/** The manager's own session list, and bulk revocation when someone leaves. */
sessionSchema.index({ userId: 1, kind: 1, revokedAt: 1 });

/**
 * Deliberately no TTL index. Expired sessions are kept, not deleted — v1 removes
 * nothing, and an expired session is evidence of who had access when.
 * Expiry is enforced on read.
 */
export const Session = model<ISession>('Session', sessionSchema);
