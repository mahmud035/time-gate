import { z } from 'zod';

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a YYYY-MM-DD date');

/** `to` is exclusive, so a single day is from=D, to=D+1. */
const range = z.object({
  query: z
    .object({ from: isoDate, to: isoDate })
    .refine((q) => q.from < q.to, 'The end of the range must come after the start'),
});

export const timesheetValidation = { range };
