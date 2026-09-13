import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Not a valid id');

const name = z.string().trim().min(1, 'Enter a name').max(80);
const payrollRef = z.string().trim().max(40);

const createStaff = z.object({
  body: z.object({
    name,
    payrollRef: payrollRef.optional(),
  }),
});

const updateUser = z.object({
  params: z.object({ id: objectId }),
  body: z
    .object({
      name: name.optional(),
      /** Empty string clears it, so the sparse unique index keeps ignoring it. */
      payrollRef: payrollRef.nullable().optional(),
      isActive: z.boolean().optional(),
    })
    .refine((body) => Object.keys(body).length > 0, 'Nothing to change'),
});

const byId = z.object({
  params: z.object({ id: objectId }),
});

export const userValidation = { createStaff, updateUser, byId };
