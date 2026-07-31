import { ApiError } from "../utils/ApiError.js";

/* Validation middleware factory. Pass a zod schema describing any of
   `body`, `params`, `query`; each present key is parsed and the cleaned,
   coerced result is written back onto req. On failure we throw a 400
   ApiError carrying a flat list of "field: message" strings.

   Usage:  router.post("/login", validate(loginSchema), loginUser)
   where   loginSchema = z.object({ body: z.object({ ... }) }) */
export const validate = (schema) => (req, res, next) => {
    const result = schema.safeParse({
        body: req.body,
        params: req.params,
        query: req.query,
    });

    if (!result.success) {
        const errors = result.error.issues.map(
            (i) => `${i.path.slice(1).join(".") || "field"}: ${i.message}`
        );
        throw new ApiError(400, "Validation failed", errors);
    }

    // Write back the parsed (coerced/trimmed) values so controllers get
    // clean data. req.query is read-only in Express 5, so only reassign the
    // mutable ones.
    if (result.data.body) req.body = result.data.body;
    if (result.data.params) req.params = result.data.params;
    if (result.data.query) req.validatedQuery = result.data.query;

    next();
};
