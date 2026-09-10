import { model, Schema } from 'mongoose';
import { ADJUSTMENT_ACTIONS, type IAdjustment } from './punch.interface.js';

const snapshotSchema = new Schema(
  {
    at: { type: Date },
    type: { type: String },
  },
  { _id: false },
);

const adjustmentSchema = new Schema<IAdjustment>({
  punchId: { type: Schema.Types.ObjectId, ref: 'Punch', required: true },
  action: { type: String, enum: ADJUSTMENT_ACTIONS, required: true },
  before: { type: snapshotSchema, default: null },
  after: { type: snapshotSchema, default: null },

  /** Required by schema, not just by the UI — an unexplained edit is not allowed. */
  reason: { type: String, required: true, trim: true, minlength: 3 },

  by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  at: { type: Date, required: true, default: () => new Date() },
});

/** The audit trail for one punch, and the manager's recent-activity view. */
adjustmentSchema.index({ punchId: 1, at: -1 });
adjustmentSchema.index({ at: -1 });

/**
 * Append-only by convention and by service discipline: nothing in the codebase
 * updates or deletes an adjustment. `timestamps` is deliberately off — `at` is
 * set once, on creation, and never moves.
 */
export const Adjustment = model<IAdjustment>('Adjustment', adjustmentSchema);
