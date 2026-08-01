/* Backend connection config.

   IMPORTANT: a phone cannot reach the Mac's `localhost` — it must use the
   Mac's LAN IP address. Both devices must be on the SAME WiFi network.

   To find/update your Mac's IP:  ipconfig getifaddr en0
   Then set API_HOST below to that value.

   If your network blocks device-to-device traffic, run the backend as usual
   and start Expo in tunnel mode: `npx expo start --tunnel`, and set API_HOST
   to a public URL instead. */

// Current Mac LAN IP (update if your network changes)
const API_HOST = "192.168.81.127";
const API_PORT = 8000;

export const API_BASE_URL = `http://${API_HOST}:${API_PORT}/api/v1`;
export const SOCKET_URL = `http://${API_HOST}:${API_PORT}`;
