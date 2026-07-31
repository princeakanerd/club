import api from "../api/axios";

/* Upload a file straight to Cloudinary from the browser, so the image bytes
   never pass through our own server. Flow:
     1. ask our backend for a short-lived signature
     2. POST the file + signature directly to Cloudinary
     3. return the resulting secure URL
   Throws on failure so callers can show an error. */
export async function uploadImage(file, folder = "clubapp") {
    if (!file) throw new Error("No file provided");

    // 1. Get a signature from our API
    const { data } = await api.get(`/uploads/signature?folder=${encodeURIComponent(folder)}`);
    const { signature, timestamp, apiKey, cloudName, folder: signedFolder } = data.data;

    // 2. Build the multipart body Cloudinary expects
    const form = new FormData();
    form.append("file", file);
    form.append("api_key", apiKey);
    form.append("timestamp", timestamp);
    form.append("signature", signature);
    form.append("folder", signedFolder);

    // 3. Upload directly to Cloudinary (not through our backend)
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
        method: "POST",
        body: form,
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || "Image upload failed");
    }
    const json = await res.json();
    return json.secure_url;
}
