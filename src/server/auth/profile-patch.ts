import { z } from 'zod';

/** Body of PATCH /api/v1/auth/me (Profile -> Edit). */
const code = z.string().regex(/^\d{6}$/);

export const profilePatchSchema = z
  .object({
    fullName: z.string().trim().min(2).max(100).optional(),
    preferredLocale: z.enum(['uz', 'en', 'ru', 'ar', 'tr', 'kk', 'ky', 'tg']).optional(),
    /** New phone (any common format); needs `phoneCode` while SMS is on. */
    phone: z.string().trim().min(5).max(40).optional(),
    phoneCode: code.optional(),
    /** New e-mail, or null / "" to remove it; needs `emailCode` while e-mail delivery is on. */
    email: z.union([z.string().trim().max(254), z.null()]).optional(),
    emailCode: code.optional(),
  })
  .strict();

