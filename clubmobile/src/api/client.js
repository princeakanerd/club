import axios from "axios";
import { API_BASE_URL } from "../config";
import { getAccessToken, getRefreshToken, saveTokens, clearTokens } from "../storage/tokens";

/* The single axios instance the whole app uses.
   - Request interceptor: attach `Authorization: Bearer <accessToken>`.
   - Response interceptor: on a 401, try ONCE to refresh the access token via
     POST /users/refresh-token, then replay the original request. If refresh
     fails, clear tokens and notify the app to log the user out. */
const api = axios.create({ baseURL: API_BASE_URL, timeout: 15000 });

// The AuthContext registers a callback here so a failed refresh can force logout.
let onAuthFailure = null;
export function setAuthFailureHandler(fn) {
    onAuthFailure = fn;
}

api.interceptors.request.use(async (config) => {
    const token = await getAccessToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// Prevent refresh stampedes: if several requests 401 at once, only one
// refresh call runs; the rest await its result.
let refreshPromise = null;

async function refreshAccessToken() {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) throw new Error("No refresh token");
    // Use a bare axios call (not `api`) to avoid recursive interceptors.
    const res = await axios.post(`${API_BASE_URL}/users/refresh-token`, { refreshToken });
    const { accessToken, refreshToken: newRefresh } = res.data.data;
    await saveTokens({ accessToken, refreshToken: newRefresh });
    return accessToken;
}

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const original = error.config;
        const status = error.response?.status;

        // Only try refresh once per request, and never for the refresh call itself.
        if (status === 401 && original && !original._retried) {
            original._retried = true;
            try {
                if (!refreshPromise) refreshPromise = refreshAccessToken();
                const newToken = await refreshPromise;
                refreshPromise = null;
                original.headers.Authorization = `Bearer ${newToken}`;
                return api(original);
            } catch (refreshErr) {
                refreshPromise = null;
                await clearTokens();
                if (onAuthFailure) onAuthFailure(); // bounce to login
                return Promise.reject(refreshErr);
            }
        }
        return Promise.reject(error);
    }
);

/* Pull a human-readable message out of our backend's error envelope
   ({ message, errors: [...] }) for showing in the UI. */
export function apiErrorMessage(error, fallback = "Something went wrong") {
    const data = error?.response?.data;
    if (Array.isArray(data?.errors) && data.errors.length) return data.errors.join(" • ");
    return data?.message || error?.message || fallback;
}

export default api;
