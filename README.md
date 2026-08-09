# Clubhouse — Campus Club Platform

A full-stack platform for discovering, joining, and running student clubs — with
real-time chat, events, a social feed, and a native mobile app. One backend
serves both a **React web app** and a **React Native (Expo) mobile app**.

<p align="left">
  <img alt="Node" src="https://img.shields.io/badge/Node-18+-3c873a">
  <img alt="React" src="https://img.shields.io/badge/React-19-61dafb">
  <img alt="React Native" src="https://img.shields.io/badge/React%20Native-Expo%20SDK%2054-000">
  <img alt="MongoDB" src="https://img.shields.io/badge/MongoDB-Atlas-13aa52">
  <img alt="Socket.IO" src="https://img.shields.io/badge/Realtime-Socket.IO-010101">
</p>

---

## ✨ Features

- **Auth** — JWT access/refresh tokens with rotation, email verification, and
  password reset (Nodemailer).
- **Clubs** — create, browse, search (name/description/category), join/leave,
  role-based membership (Lead / Executive / Member), join-requests & approvals,
  and invites.
- **Events** — create events, RSVP (Going / Maybe / Not going), attendee lists,
  **QR-based attendance check-in**, `.ics` calendar export, and automated
  reminder notifications via cron.
- **Posts** — image posts and **polls**, likes, emoji **reactions**, and
  comments — with author notifications.
- **Real-time messaging** — 1:1 DMs and club group chat over Socket.IO, with
  typing indicators, read receipts, unread counts, and presence.
- **Connections** — friend/connection requests, user search, and profiles.
- **Notifications** — in-app activity feed plus **push notifications** (Expo)
  on mobile.
- **Production-minded backend** — Helmet, rate limiting, Zod validation,
  centralized error handling, cursor pagination, and indexed queries.

---

## 🧱 Tech Stack

| Layer | Stack |
|---|---|
| **Backend** (`clubbackend/`) | Node.js, Express 5, MongoDB + Mongoose, Socket.IO, JWT, Cloudinary, Nodemailer, Zod, Helmet, node-cron, qrcode |
| **Web** (`clubfrontend/`) | React 19, Vite, React Router, GSAP + Lenis (animation), Socket.IO client |
| **Mobile** (`clubmobile/`) | React Native (Expo SDK 54), React Navigation, expo-secure-store, expo-image-picker, expo-notifications, Socket.IO client |

---

## 📂 Repository Structure

```
club/
├── clubbackend/     # Express API + Socket.IO server (shared by web & mobile)
├── clubfrontend/    # React (Vite) web app
├── clubmobile/      # React Native (Expo) mobile app
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- A MongoDB database (e.g. MongoDB Atlas)
- A [Cloudinary](https://cloudinary.com) account (image uploads)
- (Optional) SMTP credentials for email; without them, emails log to the console

### 1. Backend

```bash
cd clubbackend
npm install
cp .env.example .env   # then fill in the values below
npm run dev            # starts on http://localhost:8000
```

Create `clubbackend/.env`:

```env
PORT=8000
MONGODB_URI=your_mongodb_connection_string

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

ACCESS_TOKEN_SECRET=your_access_secret
REFRESH_TOKEN_SECRET=your_refresh_secret
ACCESS_TOKEN_EXPIRY=1d
REFRESH_TOKEN_EXPIRY=10d

CLIENT_URL=http://localhost:5173

# Optional — leave blank to log emails to the console instead of sending
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=Club App <no-reply@clubapp.local>
```

> **Note:** `.env` is gitignored — never commit real secrets.

### 2. Web app

```bash
cd clubfrontend
npm install
npm run dev            # starts on http://localhost:5173
```

### 3. Mobile app (Expo)

```bash
cd clubmobile
npm install
npx expo start         # scan the QR with the Expo Go app
```

Set your Mac's LAN IP in `clubmobile/src/config.js` (`ipconfig getifaddr en0`)
so your phone can reach the backend — both devices must be on the same Wi-Fi.
If the phone can't connect, run `npx expo start --tunnel`.

---

## 🔌 API Overview

Base URL: `http://localhost:8000/api/v1`

| Resource | Routes (selected) |
|---|---|
| **Users / Auth** | `POST /users/register`, `POST /users/login`, `POST /users/refresh-token`, `GET /users/current-user`, `POST /users/forgot-password`, `POST /users/reset-password`, `GET/POST /users/verify-email` |
| **Connections** | `GET /users/search`, `GET /users/connections`, `POST /users/:id/connect`, `POST /users/:id/connect/accept` |
| **Clubs** | `GET /clubs`, `GET /clubs/:id`, `POST /clubs/create`, `POST /clubs/:id/join`, `POST /clubs/:id/requests`, `POST /clubs/:id/invites` |
| **Events** | `GET /events/club/:id`, `POST /events/create`, `POST /events/:id/rsvp`, `POST /events/:id/checkin`, `GET /events/:id/calendar.ics` |
| **Posts** | `GET /posts/club/:id`, `POST /posts`, `PATCH /posts/:id/like`, `PATCH /posts/:id/react`, `POST /posts/:id/comment`, `PATCH /posts/:id/poll/vote` |
| **Messages** | `GET /messages/inbox`, `GET/POST /messages/dm/:id`, `GET/POST /messages/club/:id` |
| **Notifications** | `GET /notifications`, `PATCH /notifications/mark-all-read` |

Auth is via JWT: the web app uses httpOnly cookies; mobile uses
`Authorization: Bearer <token>` (both supported by the backend).

**Real-time (Socket.IO):** authenticate the socket with the access token
(`auth: { token }`). Events include `new_dm`, `new_club_message`, `typing`,
`dm_read`, and `presence`.

---

## 📱 Push Notifications (mobile)

Push code is fully implemented (token registration, backend send-on-notification,
tap-to-navigate). Delivering pushes on a real device requires an **EAS
development build** and push credentials — Expo Go can't receive remote push.
See [`clubmobile/PUSH_SETUP.md`](clubmobile/PUSH_SETUP.md) for the step-by-step
guide.

---

## 🗺️ Roadmap / Ideas

- Super-admin & content moderation
- Trending / recommended clubs
- Redis for multi-instance rate limiting and Socket.IO scaling
- Signed direct-to-CDN uploads
- App Store / Play Store release builds

---

## 📄 License

This project is provided under the MIT License. See individual package files for
details.

---

Built with ☕ by [@princeakanerd](https://github.com/princeakanerd).
