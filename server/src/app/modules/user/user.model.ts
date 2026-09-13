import { model, Schema } from 'mongoose';
import { USER_ROLES, type IUser } from './user.interface.js';

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      // Sparse: employees have no email, and many missing values must not
      // collide with each other under the unique index.
      index: { unique: true, sparse: true },
    },
    passwordHash: { type: String, select: false },

    pinHash: {
      type: String,
      select: false,
      // Every employee punches, so every employee needs a PIN. A manager who
      // only runs the dashboard does not — enforced here, not just in a service.
      required: function (this: IUser): boolean {
        return this.role === 'employee';
      },
    },

    payrollRef: {
      type: String,
      trim: true,
      index: { unique: true, sparse: true },
    },

    role: { type: String, enum: USER_ROLES, required: true },
    isActive: { type: Boolean, default: true },

    failedPinAttempts: { type: Number, default: 0 },
    pinLockedUntil: { type: Date, default: null },
    failedPasswordAttempts: { type: Number, default: 0 },
    passwordLockedUntil: { type: Date, default: null },
  },
  { timestamps: true },
);

/**
 * Hashes are `select: false` so they cannot leak by forgetting to project them
 * away. Anything needing one asks for it explicitly with `.select('+pinHash')`.
 */
export const User = model<IUser>('User', userSchema);
