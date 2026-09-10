import { model, Schema } from 'mongoose';
import { PUNCH_SOURCES, PUNCH_TYPES, type IPunch } from './punch.interface.js';

const punchSchema = new Schema<IPunch>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: PUNCH_TYPES, required: true },
    at: { type: Date, required: true },

    source: { type: String, enum: PUNCH_SOURCES, required: true },
    deviceSessionId: {
      type: Schema.Types.ObjectId,
      ref: 'Session',
      default: null,
    },

    idempotencyKey: { type: String, index: { unique: true, sparse: true } },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },

    voidedAt: { type: Date, default: null },
    voidedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    voidReason: { type: String, default: null },
  },
  { timestamps: true },
);

/** Shift assembly: every punch for a person over a date range, in order. */
punchSchema.index({ userId: 1, at: 1 });

/**
 * Current state: the most recent punch that still counts. Every punch attempt
 * runs this query, so it is the hottest read in the system.
 */
punchSchema.index({ userId: 1, voidedAt: 1, at: -1 });

export const Punch = model<IPunch>('Punch', punchSchema);
