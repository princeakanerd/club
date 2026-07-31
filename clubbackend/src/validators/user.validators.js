import { z } from "zod";

/* Zod schemas for the user/auth endpoints. Each schema validates the parts
   of the request it cares about. File uploads (avatar/cover) are handled by
   multer separately, so they aren't described here. */

const email = z.string().trim().toLowerCase().email("A valid email is required");
const password = z.string().min(6, "Password must be at least 6 characters");
const username = z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username cannot exceed 30 characters")
    .regex(/^[a-z0-9_.]+$/, "Username may only contain letters, numbers, '_' and '.'");

export const registerSchema = z.object({
    body: z.object({
        fullName: z.string().trim().min(1, "Full name is required"),
        email,
        username,
        password,
        // Form data arrives as strings; coerce the year to a number.
        batchYear: z.coerce
            .number()
            .int()
            .gte(1990, "Enter a valid batch year")
            .lte(new Date().getFullYear() + 6, "Enter a valid batch year"),
        rollNumber: z.string().trim().min(1, "Roll number is required"),
    }),
});

export const loginSchema = z.object({
    body: z.object({
        email,
        password: z.string().min(1, "Password is required"),
    }),
});

export const changePasswordSchema = z.object({
    body: z.object({
        oldPassword: z.string().min(1, "Old password is required"),
        newPassword: password,
    }),
});

/* Used by Phase 2 (email/password flows) but defined here so all auth
   schemas live together. */
export const forgotPasswordSchema = z.object({
    body: z.object({ email }),
});

export const resetPasswordSchema = z.object({
    body: z.object({
        token: z.string().min(1, "Reset token is required"),
        newPassword: password,
    }),
});
