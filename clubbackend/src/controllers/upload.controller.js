import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { generateUploadSignature } from "../utils/cloudinary.js";

/* GET /uploads/signature?folder=clubapp
   Returns the params the browser needs to upload a file straight to Cloudinary
   without the file passing through our server. Auth-gated so only logged-in
   users can request one. */
export const getUploadSignature = asyncHandler(async (req, res) => {
    const folder = typeof req.query.folder === "string" ? req.query.folder : "clubapp";
    // Restrict to a small allowlist of folders so a client can't write anywhere
    const allowed = ["clubapp", "avatars", "covers", "clubs", "posts", "events"];
    const safeFolder = allowed.includes(folder) ? folder : "clubapp";

    const sig = generateUploadSignature({ folder: safeFolder });
    return res.status(200).json(new ApiResponse(200, sig, "Upload signature generated"));
});
