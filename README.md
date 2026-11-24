# PeerUp — Campus Peer-to-Peer Micro-Skill & Doubt Bounty Board

PeerUp connects college students stuck on coding bugs, programming assignments, SQL queries, or academic concepts with classmates who already know the topic for focused **15-minute live mentoring sessions**.

Students post doubts, discover skill-matched peers, atomically claim open help requests, meet over **live Jitsi Meet video calls** with a persisted 15-minute timer, and earn server-verified contribution points and badges.

---

## Features

- **Real Authentication & Persistent Sessions**: Signup and login powered by Express, MongoDB, `bcryptjs` password hashing, and JWT verification (`Authorization: Bearer` in memory + `HttpOnly` session cookie for refresh persistence).
- **Student Profiles & Skill Catalog**: Searchable catalog of 19+ technical and academic skills (`C++`, `Java`, `Python`, `JavaScript`, `React`, `HTML/CSS`, `DSA`, `DBMS`, `SQL`, `Machine Learning`, `AI/ML`, `Mathematics`, `Discrete Mathematics`, `Computer Networks`, `Operating Systems`, `Aptitude`, `Data Structures`, `Web Development`, `Git/GitHub`) with `Beginner`, `Intermediate`, and `Advanced` proficiencies.
- **Doubt & Bounty Board**: Post doubts with title, detailed description, skill category, urgency (`Low`, `Medium`, `High`), and optional bounty points (`0–100`). Includes keyword-based skill auto-suggestion, live search, filters, author-only edit, and unclaimed delete.
- **Rule-Based Skill Matching**: Deterministic scoring engine matching doubts to helpers using actual MongoDB `UserSkill` records—prioritizing exact skill match, related skills, proficiency, completed sessions, and contribution points.
- **Atomic Request Claiming**: Uses MongoDB conditional `findOneAndUpdate` to prevent race conditions or duplicate claims, plus explicit rollback if session creation fails.
- **Live 15-Minute Jitsi Meet Video Mentoring**: Real embedded Jitsi Meet room (`meet.jit.si`) with camera, microphone, screen sharing, room copy/new-tab fallback, doubt context sidebar, and a persisted `startedAt` 15-minute timer.
- **Gamification & Leaderboard**: Server-side atomic completion awards `+20` base points plus any attached bounty points, unlocks earned skill badges, and ranks top campus mentors.

---

## Technology Stack

- **Frontend**: React 19, Vite, JavaScript (JSX), Tailwind CSS v4, React Router DOM, Lucide React
- **Backend**: Node.js, Express.js, JavaScript, JWT (`jsonwebtoken`), `bcryptjs`
- **Database**: MongoDB Atlas Free Tier (M0) with Mongoose ODM (plus `mongodb-memory-server` automatic local preview fallback when `MONGODB_URI` is unset in non-production)
- **Video Conferencing**: Public Jitsi Meet (`meet.jit.si` External API & iframe) — 100% free, no API key or billing required

---

## Project Structure

```
peerup/
├── client/
│   └── src/
│       ├── components/      # Avatar, DoubtCard, HelperMatchCard, JitsiRoom, SessionTimer, ProtectedRoute
│       ├── context/         # AuthContext, ToastContext
│       ├── layouts/         # PublicLayout, AppLayout (desktop sidebar + mobile bottom nav)
│       ├── pages/           # All 13 pages (Landing, Signup, Login, Dashboard, DoubtBoard, etc.)
│       ├── services/        # In-memory Bearer + credentialed fetch wrapper
│       ├── utils/           # Time formatting, timer math, badge/status styles
│       └── App.jsx          # Route definitions & protection
├── server/
│   ├── config/              # env.js, db.js (MongoDB Atlas + non-prod local fallback)
│   ├── controllers/         # auth, user, skill, request, session, leaderboard
│   ├── middleware/          # JWT auth & CSRF origin check
│   ├── models/              # User, Skill, UserSkill, HelpRequest, HelpSession
│   ├── routes/              # REST API routes
│   ├── seed/                # Skill catalog + optional clearly marked demo seed data
│   ├── services/            # matchingService.js, badgeService.js
│   ├── utils/               # sanitize.js, points.js
│   └── app.js               # Express app configuration
├── server.ts                # Full-stack Express + Vite entrypoint (port 3000)
├── .env.example
└── package.json
```

---

## MongoDB Atlas Free Tier (M0) Setup

1. Create a free account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) (no credit card required).
2. Create a **M0 Sandbox (Free)** cluster.
3. Under **Database Access**, create a database user with **Read and write to any database** permissions and save the username/password.
4. Under **Network Access**, add `0.0.0.0/0` (or your backend host's outbound IPs) so your Express server can connect.
5. Click **Connect -> Drivers**, copy your connection string (`mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/peerup?retryWrites=true&w=majority`), and set it as `MONGODB_URI`.

---

## Environment Variables

Copy `.env.example` to `.env` for local development or configure these in your hosting dashboard:

| Variable | Required | Description |
| --- | --- | --- |
| `MONGODB_URI` | Production: Yes | MongoDB Atlas M0 connection string. In local dev, if left empty, PeerUp automatically spins up an embedded local MongoDB preview server. |
| `JWT_SECRET` | Production: Yes | Long random secret string for signing JWTs. If omitted in dev, a random 32-byte secret is generated in memory at startup. |
| `SEED_DEMO_DATA` | No (default `true`) | Set to `false` to disable seeding sample demo students and demo doubts when the database is empty. |
| `CLIENT_ORIGIN` | Split deploy only | Frontend origin URL (e.g. `https://peerup.vercel.app`) allowed by CORS with credentials. |
| `PORT` | No (default `3000`) | HTTP server port. |

---

## Local Development Commands

```bash
# 1. Install dependencies
npm install

# 2. (Optional) Configure .env with your MongoDB Atlas MONGODB_URI and JWT_SECRET
cp .env.example .env

# 3. Start full-stack dev server (Express API + Vite frontend on port 3000)
npm run dev

# 4. (Optional) Run standalone seed script manually
npm run seed

# 5. Build frontend for production
npm run build
```

---

## Video Conferencing (Jitsi Meet) Notes & Free-Tier Limits

- PeerUp uses the public Jitsi Meet infrastructure (`https://meet.jit.si`) via the Jitsi Meet External API and iframe fallback.
- **No paid API keys, Zoom licenses, or credit cards are required.**
- **Free-Tier Limitations**: Public `meet.jit.si` servers are community-operated and subject to Jitsi's public room policies (some regions/sessions may display a moderator authentication prompt or enforce a 5-minute lobby/call limit on unauthenticated public rooms, and corporate/campus firewalls or iframe permissions can occasionally restrict camera/screen-share inside embedded frames). Every PeerUp session provides a direct **"Open in New Tab"** button and **"Copy Link"** button so participants can launch the room directly on `meet.jit.si` if needed.

---

## Free Deployment Guide (No Credit Card Required)

### Option A: Single Full-Stack Service (Render Free Web Service)
1. Push the repository to GitHub.
2. Create a free Web Service on **Render** (no credit card required for free tier).
3. Build command: `npm install && npm run build`
4. Start command: `NODE_ENV=production npm start`
5. Set environment variables: `MONGODB_URI`, `JWT_SECRET`, `NODE_ENV=production`, `SEED_DEMO_DATA=false`.
   - *Free-tier limit*: Render free web services spin down after 15 minutes of inactivity (~30–50s cold start on first request).

### Option B: Split Deployment (Frontend on Vercel + Backend on Render/Koyeb)
1. **Database**: MongoDB Atlas M0 Free Cluster.
2. **Backend (Render Free Web Service)**: Deploy Express API (`server/app.js` or `server.ts`), set `MONGODB_URI`, `JWT_SECRET`, `CLIENT_ORIGIN=https://your-app.vercel.app`, `NODE_ENV=production`.
3. **Frontend (Vercel Hobby Free Tier)**: Build Vite frontend (`npm run build`, output `dist`), configure `/api/*` rewrite to your backend URL in `vercel.json` so cookies and API calls stay same-origin.

---

## Seeded Demo Data (Optional)

When `SEED_DEMO_DATA` is not `false` and the database has zero users, `server/seed/seed.js` seeds the 19-skill catalog plus 4 clearly marked demo student profiles (`isDemo: true`) and 6 demo doubts (`[Demo] ...`).

Seeded demo accounts authenticate through the exact same `bcrypt` + JWT login endpoint and are strictly optional—you can create fresh student accounts via `/signup` at any time.

---

## Security Safeguards

- Passwords are hashed with `bcryptjs` (never stored or returned in plaintext).
- Protected API routes verify signed JWTs and enforce resource ownership (users cannot edit other profiles, claim their own doubts, delete claimed doubts, or access sessions they are not participating in).
- Request claiming uses atomic `findOneAndUpdate` conditions; session completion uses atomic reward locking (`rewarded: false -> true`) so points are strictly computed server-side and cannot be duplicated or forged by clients.
- All user inputs are type-checked, bounded, and regex-escaped to prevent NoSQL operator injection and XSS.
