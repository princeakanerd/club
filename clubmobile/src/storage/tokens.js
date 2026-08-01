import * as SecureStore from "expo-secure-store";

/* Encrypted persistence for JWTs. On mobile we authenticate with a Bearer
   token (the backend supports this — no cookies), so we keep the access and
   refresh tokens in the OS keychain/keystore via expo-secure-store. */

const ACCESS_KEY = "clubapp.accessToken";
const REFRESH_KEY = "clubapp.refreshToken";

export async function saveTokens({ accessToken, refreshToken }) {
    if (accessToken) await SecureStore.setItemAsync(ACCESS_KEY, accessToken);
    if (refreshToken) await SecureStore.setItemAsync(REFRESH_KEY, refreshToken);
}

export async function getAccessToken() {
    return SecureStore.getItemAsync(ACCESS_KEY);
}

export async function getRefreshToken() {
    return SecureStore.getItemAsync(REFRESH_KEY);
}

export async function clearTokens() {
    await SecureStore.deleteItemAsync(ACCESS_KEY);
    await SecureStore.deleteItemAsync(REFRESH_KEY);
}
