import { ApiError } from "../utils/ApiError.js";

/* Catch-all 404 for any /api route that didn't match. Mounted AFTER all
   routers so it only fires when nothing else handled the request. */
export const notFound = (req, res, next) => {
    next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
};

/* Centralized error handler. Express 5 forwards both sync throws and rejected
   promises (via asyncHandler) here. We normalize everything into the same
   JSON shape the ApiResponse util produces, so the frontend never has to
   guess the error format. Must be the LAST app.use() and must keep all four
   args — that's how Express identifies an error-handling middleware. */
// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
    let error = err;

    // Normalize anything that wasn't already an ApiError (e.g. a raw throw,
    // a Mongoose error, a JWT error) into our ApiError shape.
    if (!(error instanceof ApiError)) {
        let statusCode = error.statusCode || 500;
        let message = error.message || "Internal Server Error";
        let errors = error.errors || [];

        // Mongoose validation -> 400 with per-field messages
        if (error.name === "ValidationError") {
            statusCode = 400;
            errors = Object.values(error.errors || {}).map((e) => e.message);
            message = "Validation failed";
        }
        // Duplicate key (unique index) -> 409
        else if (error.code === 11000) {
            statusCode = 409;
            const field = Object.keys(error.keyValue || {})[0];
            message = field
                ? `A record with this ${field} already exists`
                : "Duplicate value";
        }
        // Bad ObjectId in a query -> 400
        else if (error.name === "CastError") {
            statusCode = 400;
            message = `Invalid ${error.path}: ${error.value}`;
        }
        // Invalid / expired JWT -> 401
        else if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
            statusCode = 401;
            message = "Invalid or expired token";
        }

        error = new ApiError(statusCode, message, errors, err.stack);
    }

    const payload = {
        statusCode: error.statusCode,
        success: false,
        message: error.message,
        errors: error.errors,
        // Only leak the stack in development
        ...(process.env.NODE_ENV === "development" ? { stack: error.stack } : {}),
    };

    return res.status(error.statusCode).json(payload);
};
