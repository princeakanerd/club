# Push Notifications — Setup Guide

All the **code** for push is done (mobile token registration, backend storage,
and auto-send on every notification). But push **cannot fire in Expo Go** — you
must make a **development build** with EAS and add push credentials. Follow
these steps when you're ready.

## What's already built (no action needed)
- **Backend:** `pushTokens` on the User model; `POST/DELETE /api/v1/users/push-token`;
  a Notification model hook that sends an Expo push on every in-app
  notification; dead-token pruning. (`src/utils/push.js`, `notification.models.js`)
- **Mobile:** permission + token registration on login, unregister on logout,
  foreground handler, and tap-to-navigate. (`src/utils/push.js`,
  `AuthContext.js`, `RootNavigator.js`), plus the `expo-notifications` plugin in
  `app.json`.

## Steps to make it actually deliver

### 1. Create an Expo account + install EAS CLI
```bash
npm install -g eas-cli
eas login
```

### 2. Configure the project (creates an EAS projectId)
```bash
cd clubmobile
eas init          # links the app to your Expo account, writes projectId
eas build:configure
```
After `eas init`, confirm `app.json` has `expo.extra.eas.projectId` (the mobile
push code reads this automatically).

### 3. Build a development build
- **Android (easiest — no paid account):**
  ```bash
  eas build --profile development --platform android
  ```
  Download the resulting `.apk` to your phone and install it. Push works with
  Expo's FCM by default — no extra credentials needed for a dev build.

- **iOS (needs a paid Apple Developer account, $99/yr):**
  ```bash
  eas build --profile development --platform ios
  ```
  EAS will prompt to create an **APNs key** — let it manage credentials.
  Install via the QR/link on a registered device.

### 4. Run against the dev build
```bash
npx expo start --dev-client
```
Open the **dev build app** (not Expo Go) on your phone and scan the QR.

### 5. Test it
1. Log in on the phone → grant the notification permission prompt.
2. From another account (web or second device), trigger a notification —
   e.g. like/comment on your post, or send you a connection request.
3. A push should arrive on the phone (even with the app backgrounded), and
   tapping it opens the relevant screen.

You can also test tokens directly at https://expo.dev/notifications with a
token from your backend's `users.pushTokens`.

## Notes
- The backend targets Expo's push service (`exp.host`) — no Firebase/APNs code
  in your server; Expo handles the transport.
- Simulators/emulators can't receive push — use a physical device.
- If tokens stop working, the backend auto-prunes them on `DeviceNotRegistered`.
