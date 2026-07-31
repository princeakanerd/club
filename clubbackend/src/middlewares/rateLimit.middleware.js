import rateLimit from "express-rate-limit";
import { ApiError } from "../utils/ApiError.js";

/* When a limit is hit, hand off to our central error handler so the response
   matches every other error in the API instead of express-rate-limit's
   default text body. */
const limitHandler = (req, res, next) =>
    next(new ApiError(429, "Too many requests — please slow down and try again later"));

/* Broad limiter for the whole API: generous enough for normal browsing,
   low enough to blunt scraping / abuse. */
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    handler: limitHandler,
});

/* Strict limiter for credential endpoints (login / register / password
   reset) to slow brute-force attempts. Keyed per IP. */
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    // Don't count successful logins against the limit — only failed attempts.
    skipSuccessfulRequests: true,
    handler: limitHandler,
});
