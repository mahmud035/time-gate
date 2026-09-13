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

    codeLookup: {
      type: String,
      select: false,
      // Unique so two people can never share a code: one code stands for one
      // identity, so a collision would file someone's hours under the wrong
      // name. Sparse because a dashboard-only manager has no code at all.
      index: { unique: true, sparse: true },
      // Every employee punches, so every employee needs a code — enforced
      // here, not only in a service.
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

    failedPasswordAttempts: { type: Number, default: 0 },
    passwordLockedUntil: { type: Date, default: null },
  },
  { timestamps: true },
);

/**
 * Hashes are `select: false` so they cannot leak by forgetting to project them
 * away. Anything needing one asks for it explicitly with `.select('+codeLookup')`.
 */
export const User = model<IUser>('User', userSchema);
