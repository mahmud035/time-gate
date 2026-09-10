import { z } from 'zod';

const login = z.object({
  body: z.object({
    email: z.email('Enter a valid email address'),
    password: z.string().min(1, 'Password is required'),
  }),
});

export const authValidation = {
  login,
};
