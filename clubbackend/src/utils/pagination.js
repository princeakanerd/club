import mongoose from "mongoose";

/* Cursor-based pagination helpers. We paginate on _id, which is monotonic
   with insertion time and always indexed — so "newest first" is
   { _id: { $lt: cursor } } sorted { _id: -1 }, and there's no expensive
   skip(). Backward-compatible: callers still return the plain array in
   `data`; the cursor rides along in the response `meta`.

   Usage in a controller:
     const { limit, cursorFilter } = parsePageQuery(req, { defaultLimit: 20 });
     const docs = await Model.find({ ...myFilter, ...cursorFilter })
                             .sort({ _id: -1 })
                             .limit(limit + 1);          // fetch one extra
     const { items, meta } = buildPage(docs, limit);
     return res.json(new ApiResponse(200, items, "…", meta));
*/

const MAX_LIMIT = 100;

export const parsePageQuery = (req, { defaultLimit = 20 } = {}) => {
    const q = req.validatedQuery || req.query || {};
    let limit = parseInt(q.limit, 10);
    if (!Number.isInteger(limit) || limit <= 0) limit = defaultLimit;
    limit = Math.min(limit, MAX_LIMIT);

    // Descending (newest-first) cursor: return items with _id < cursor.
    let cursorFilter = {};
    if (q.cursor && mongoose.isValidObjectId(q.cursor)) {
        cursorFilter = { _id: { $lt: new mongoose.Types.ObjectId(q.cursor) } };
    }
    return { limit, cursorFilter };
};

/* Given docs fetched with `.limit(limit + 1)`, trim to `limit` and derive the
   next cursor. Returns { items, meta } where meta = { nextCursor, hasMore }. */
export const buildPage = (docs, limit) => {
    const hasMore = docs.length > limit;
    const items = hasMore ? docs.slice(0, limit) : docs;
    const last = items[items.length - 1];
    const nextCursor = hasMore && last ? String(last._id) : null;
    return { items, meta: { nextCursor, hasMore } };
};
