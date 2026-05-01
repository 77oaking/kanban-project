# FredoCloud Team Hub

A full-stack collaborative workspace for shared goals, real-time announcements, and a kanban of action items. Built end-to-end on Next.js 14, Express, PostgreSQL, and Socket.io for the **FredoCloud technical assessment**.

| | |
|---|---|
| **Live web app** | https://fredocloudteamhub.dev |
| **Live API** | https://kanban-project-production-aab6.up.railway.app |
| **API documentation (Swagger)** | https://kanban-project-production-aab6.up.railway.app/api/docs |
| **Health check** | https://kanban-project-production-aab6.up.railway.app/health |
| **GitHub repo** | https://github.com/77oaking/kanban-project |
| **Demo login** | `demo@fredocloud.test` / `Demo1234!` |

---

## Try it in 30 seconds

1. Open the live web app → https://fredocloudteamhub.dev
2. Click **Try the demo**, sign in with `demo@fredocloud.test` / `Demo1234!`
3. You land in a pre-seeded workspace ("FredoCloud HQ") with sample goals, milestones, action items, and a pinned announcement.
4. Open the same URL in a second browser tab to see the real-time presence dots, live socket updates, and collaborative goal-description editing.

---

## What's built

### Required features (assignment specification)

Every feature listed in the "What to Build" section of the assignment is implemented.

**Authentication**
- Email + password registration and login
- Protected routes — the dashboard is unreachable without a session
- User profile with Cloudinary avatar upload
- Logout, plus automatic refresh-token rotation in httpOnly cookies

**Workspaces**
- Create multiple workspaces and switch between them via the sidebar dropdown or the ⌘K palette
- Invite members by email (Admin or Member role); accept-invite flow lives at `/accept-invite?token=...`
- Each workspace has a name, description, and accent color that themes the UI

**Goals & Milestones**
- Create goals with title, owner, due date, and status (Not started / In progress / At risk / Completed)
- Nested milestones with a 0–100 progress slider and a completion checkbox
- An **overall progress bar** on every goal showing the average of milestone progress
- Per-goal activity feed — post text updates that other members see live

**Announcements**
- Admins (or members granted `canPostAnnouncement`) publish rich-text announcements via a Tiptap editor
- Six emoji reactions, threaded comments, and a **pin to top** flag
- Comments parse `@mentions` against workspace members and trigger an in-app notification (and an email if SMTP is configured)

**Action Items**
- Create with assignee, priority (Low/Medium/High/Urgent), due date, and status
- Optional link to a parent goal
- **Kanban board** with HTML5 drag-and-drop across four columns, plus a **list view** toggle
- Drag-reorders are persisted in a single bulk transaction

**Real-time & activity**
- Socket.io broadcasts new posts, reactions, status changes, and milestone edits to everyone in the workspace
- A **presence row** in the top bar shows which members are currently online (with avatars and a green dot)
- `@mention` parsing creates a notification record and pushes it via socket to that user's bell icon

**Analytics**
- Dashboard stat cards: total goals, items completed this week, overdue count, member count
- A 30-day **Recharts area chart** of action-item completions
- Goal-by-status progress bars
- **CSV export** of the full workspace (goals, items, announcements) at one click

---

### Advanced features (the difficult ones)

The assignment asks for **two**. I picked the two recommended ones and added a third as a stretch goal.

#### 1. Optimistic UI (advanced)

Every Zustand mutator follows the same shape: apply the change locally first, fire the API call, and roll back on error. This is wired across every interactive surface — reactions, status changes, kanban drags, pinning, milestone updates. The pattern is identical everywhere, which makes it auditable:

```js
// inside a Zustand store
update: async (id, patch) => {
  const prev = state.list;
  set({ list: prev.map(applyPatch(id, patch)) });   // 1. optimistic
  try {
    const { item } = await api.patch(...);
    set({ list: prev.map(applyServer(item)) });      // 2. reconcile
  } catch (err) {
    set({ list: prev });                             // 3. rollback
    toast.error(err.message);
  }
}
```

Concurrent edits from other users converge correctly because the realtime socket layer applies server-authoritative state on top.

Where to look: `apps/web/store/goals.js`, `actionItems.js`, `announcements.js`.

#### 2. Advanced RBAC (advanced)

A per-member permission matrix with **nine fine-grained flags**:

`canCreateGoal`, `canEditGoal`, `canDeleteGoal`, `canCreateActionItem`, `canPostAnnouncement`, `canPinAnnouncement`, `canInviteMember`, `canManageMembers`, `canExportData`.

The Permission table represents *explicit overrides*, not stored values. Resolution rule:

- **Admin** without an override row → all flags true
- **Admin** with an override row → flag follows the row (admin can be downgraded per-flag)
- **Member** without an override row → role defaults (e.g. `canCreateGoal=true`, `canPostAnnouncement=false`)
- **Member** with an override row → flag follows the row (members can be elevated per-flag)

Endpoints are protected by `requirePerm('canPostAnnouncement')` middleware so the policy is testable, and the resolved flags are returned to the client so the UI can hide buttons the user can't use. The Members page exposes the whole matrix to admins as a bank of checkboxes.

Where to look: `apps/api/src/middleware/workspace.js` (`resolvePermissions`), `apps/api/src/routes/members.js`, `apps/web/app/(app)/members/page.js`.

#### 3. Real-time collaborative editing (stretch)

When two users open the same goal, they see each other's edits to the description live, peer-by-peer through Socket.io. Last-writer-wins on the broadcast; persistence is explicit (Save button or blur). Not a full CRDT/OT engine, but the integration is real and visible.

Where to look: `apps/web/components/collaborative-description.jsx`, `apps/api/src/realtime/socket.js`.

---

### Bonus features (the easy ones — all six implemented)

| Bonus | Status | Implementation |
|---|---|---|
| **Dark / light theme** | ✅ | `next-themes` with system preference detection. Toggle in the topbar and inside the ⌘K palette. Tailwind class strategy. |
| **⌘K command palette** | ✅ | `cmdk`-powered palette opens with `⌘K` / `Ctrl+K`. Navigates between pages, switches workspaces, swaps theme, signs out. See `apps/web/components/command-palette.jsx`. |
| **OpenAPI / Swagger docs** | ✅ | Served at `/api/docs`. Every route file has `@openapi` JSDoc that `swagger-jsdoc` compiles. See the next section for how to use them. |
| **Email notifications** | ✅ | Nodemailer wraps any SMTP provider. Invitations and `@mention` comments email the recipient. **Falls back gracefully** to console-log if SMTP isn't configured, so dev never breaks. See `apps/api/src/services/email.js`. |
| **PWA — installable + offline shell** | ✅ | `next-pwa` with manifest, SVG icons (any/maskable), and runtime caching. API GETs use NetworkFirst with a 4-second timeout so offline users see last-known data. |
| **Tests (Jest + Supertest + RTL)** | ✅ | 25 backend tests + 9 frontend tests across 7 suites. Auth integration test mocks Prisma so it runs without a database. Covers auth flow, RBAC resolver, HTML sanitiser, email templates, format helpers, and React components. |

---

## How to use the API docs (Swagger)

Open https://kanban-project-production-aab6.up.railway.app/api/docs in your browser. You'll see the full Swagger UI listing every endpoint grouped by tag (Auth, Workspaces, Members, Goals, Announcements, Action items, Notifications, Analytics, Upload).

To call a protected endpoint from the docs page:

1. **Log in first** in another tab — open https://fredocloudteamhub.dev/login and sign in with the demo credentials. This sets `access_token` and `refresh_token` httpOnly cookies on `*.up.railway.app` and `fredocloudteamhub.dev`.
2. **Back in Swagger UI**, expand any endpoint under "Workspaces" or "Goals". Click **Try it out**.
3. Fill in path/body parameters. For workspace-scoped endpoints, the seeded workspace ID is `seed-workspace-1`.
4. Click **Execute**. The browser will send the request *with cookies*, so the auth middleware sees you as the demo user. The response section shows status, headers, and the JSON body.

If you'd rather call the API from cURL or Postman, copy the cURL command Swagger generates and add `--cookie` with the values from your browser's DevTools → Application → Cookies.

The raw OpenAPI 3.0 spec is also available as JSON at `/api/openapi.json` if you want to import it into Postman/Insomnia.

---

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| **Monorepo** | Turborepo | Shared scripts, parallel dev, build pipeline caching |
| **Frontend** | Next.js 14 (App Router, JS) | Modern React with server components and streaming |
| **Styling** | Tailwind CSS | Utility-first, dark-mode class strategy |
| **State** | Zustand | Lightweight, hooks-friendly, great for the optimistic-UI pattern |
| **Charts** | Recharts | Declarative, ResponsiveContainer just works |
| **Rich text** | Tiptap | ProseMirror-based, customizable, sane HTML output |
| **Command palette** | cmdk | Same library Linear/Vercel use; tiny |
| **Backend** | Node.js + Express 4 | Familiar, fast, well-supported |
| **ORM** | Prisma | Type-safe queries, migrations, Studio for inspection |
| **Database** | PostgreSQL 16 | Railway plugin |
| **Auth** | JWT in httpOnly cookies, refresh-token rotation | Resistant to XSS token theft, no localStorage |
| **Realtime** | Socket.io | Room-based broadcasts, cookie auth, presence map |
| **File storage** | Cloudinary | Free tier covers avatars + attachments |
| **Email** | Nodemailer | Works with any SMTP (Resend, Mailtrap, Gmail) |
| **API docs** | swagger-jsdoc + swagger-ui-express | OpenAPI 3 from JSDoc comments on routes |
| **Tests** | Jest + Supertest + React Testing Library | Backend integration via mocked Prisma; frontend RTL |
| **Hosting** | Railway (web + api + Postgres) | One project, separate services, automatic env injection |

---

## Repository layout

```
fredocloud-team-hub/                ← Turborepo root
├─ apps/
│  ├─ api/                          ← Express + Prisma + Socket.io
│  │  ├─ prisma/schema.prisma       ← Data model
│  │  ├─ scripts/test.cjs           ← Hoist-safe Jest bootstrap
│  │  ├─ tests/                     ← Jest + Supertest test suites
│  │  └─ src/
│  │     ├─ index.js                ← HTTP + Socket.io bootstrap
│  │     ├─ app.js                  ← Express app + route mounts
│  │     ├─ realtime/socket.js      ← Sockets, presence, mentions, live edit
│  │     ├─ middleware/             ← auth, workspace+RBAC, validate, error
│  │     ├─ routes/                 ← auth, workspaces, members, goals,
│  │     │                              announcements, actionItems, stats,
│  │     │                              export, notifications, upload, invitations
│  │     ├─ services/               ← audit, email, email-templates
│  │     ├─ lib/                    ← prisma, jwt, cookies, cloudinary,
│  │     │                              swagger, sanitize, logger
│  │     └─ seed.js                 ← Idempotent demo data, self-healing
│  └─ web/                          ← Next.js 14 App Router (JS)
│     ├─ app/
│     │  ├─ (auth)/                 ← Login + register + auth layout
│     │  ├─ (app)/                  ← Protected shell: dashboard, goals,
│     │  │                              announcements, action-items, members,
│     │  │                              settings, profile
│     │  ├─ accept-invite/          ← Invitation acceptance (server + client)
│     │  ├─ layout.js               ← Theme + auth bootstrap
│     │  └─ page.js                 ← Public landing
│     ├─ components/                ← Sidebar, topbar, kanban-board,
│     │                                 rich-text-editor, command-palette,
│     │                                 collaborative-description, etc.
│     ├─ store/                     ← Zustand stores
│     ├─ tests/                     ← Jest + RTL suites
│     ├─ public/                    ← manifest.json, icons, favicon
│     └─ lib/                       ← api client, socket, format, cn
├─ turbo.json
├─ package.json (workspaces)
└─ README.md (this file)
```

---

## Local development

### Prerequisites

- Node.js **18.17+** (`node --version`)
- Git
- A PostgreSQL database — either a local install or a Railway Postgres plugin (its `DATABASE_PUBLIC_URL` works fine over the internet for dev)
- A Cloudinary account is **optional** — the app runs without it, only `/api/upload` returns 503

### Setup

```bash
git clone https://github.com/77oaking/kanban-project.git
cd kanban-project
npm install

# Backend env
cp apps/api/.env.example apps/api/.env
# Open apps/api/.env and fill in DATABASE_URL plus the JWT secrets.
# Generate secrets with:
#   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

# Frontend env
cp apps/web/.env.example apps/web/.env.local

# Migrate + seed the database
npm run db:migrate          # creates schema + generates Prisma client
npm run db:seed             # inserts the demo workspace + accounts

# Run everything
npm run dev
```

Visit `http://localhost:3000` (web) and `http://localhost:4000/api/docs` (Swagger).

### Useful scripts (run from the repo root)

| Command | What it does |
|---|---|
| `npm run dev` | Run web + api in parallel |
| `npm run build` | Build both apps |
| `npm run lint` | Lint both apps |
| `npm run test` | Run all Jest test suites (no DB required) |
| `npm run db:migrate` | `prisma migrate dev` |
| `npm run db:seed` | Re-seed the demo data (idempotent) |
| `npm run db:studio` | Open Prisma Studio in the browser |

---

## Running tests

There are 34 tests total across 7 suites. The backend integration tests **mock Prisma**, so the suite runs without a database.

```bash
# Everything (root)
npm run test

# Backend only
cd apps/api && npm test

# Frontend only
cd apps/web && npm test
```

Backend test files (`apps/api/tests/`):

- `auth.integration.test.js` — register, login, refresh-token rotation, `/me` endpoint, no-cookie 401
- `rbac.test.js` — admin defaults, member defaults, per-flag overrides
- `sanitize.test.js` — script-tag stripping, `on*` handler removal, `javascript:` URL rewriting, allow-list enforcement
- `email-templates.test.js` — invitation + mention HTML/text content, XSS escaping

Frontend test files (`apps/web/tests/`):

- `login-page.test.jsx` — login form renders, demo email prefilled, password input is editable
- `priority-badge.test.jsx` — renders priority label, distinct styles per priority
- `format.test.js` — date formatter, overdue checker, relative-time formatter

---

## Environment variables

### Backend — `apps/api/.env`

| Var | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | Postgres connection string. Railway injects this. |
| `JWT_ACCESS_SECRET` | yes | 48+ random bytes recommended. |
| `JWT_REFRESH_SECRET` | yes | Must differ from access secret. |
| `JWT_ACCESS_TTL` | no | Default `15m`. |
| `JWT_REFRESH_TTL` | no | Default `7d`. |
| `CLIENT_URL` | yes | Comma-separated origins for CORS. |
| `CLOUDINARY_CLOUD_NAME` / `_API_KEY` / `_API_SECRET` | optional | If absent, `/api/upload` returns 503. |
| `SMTP_HOST` / `_PORT` / `_USER` / `_PASS` / `_FROM` | optional | If absent, emails log to console instead of sending. |
| `PORT` | no | Default `4000`. |
| `NODE_ENV` | no | `production` enables `Secure; SameSite=None` cookies. |
| `DEMO_EMAIL` / `DEMO_PASSWORD` | no | Override the seeded demo account. |

### Frontend — `apps/web/.env.local`

| Var | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | yes | Public API base URL. |
| `NEXT_PUBLIC_SOCKET_URL` | yes | Usually identical to the API URL. |

---

## Deployment (Railway)

The deployed copy lives in a single Railway project with three services: a Postgres plugin, the API service (`apps/api`), and the web service (`apps/web`).

1. Create a new Railway project → "+ New → Database → Add PostgreSQL".
2. "+ New → GitHub repo" → set root directory to `apps/api`. Add env vars: the JWT secrets, Cloudinary credentials (optional), and `CLIENT_URL=https://fredocloudteamhub.dev`. Railway injects `DATABASE_URL` automatically. Generate a public domain.
3. "+ New → GitHub repo" again → set root directory to `apps/web`. Add `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_SOCKET_URL` pointing at the API's public domain.
4. The API's `start` script runs `prisma migrate deploy`, then seeds the demo data if the user table is empty, then starts the server. So a fresh deployment leaves you with a working demo account.

The custom domain `fredocloudteamhub.dev` is mapped to the web service via Railway's Settings → Domains.

---

## Auth & realtime details

**Auth flow.** Register/login writes two cookies: `access_token` (signed with `JWT_ACCESS_SECRET`, 15 minutes) and `refresh_token` (7 days, also stored hashed in the `RefreshToken` table). On a 401 the client transparently calls `/api/auth/refresh` once. The server validates the hash in the DB, **revokes** the old token, and issues a new pair. Each token includes a random `jti` so two tokens issued in the same second are still distinct.

**Realtime.** Socket.io connections authenticate by reading the `access_token` cookie on the WebSocket upgrade. After connection, the client emits `workspace:join` with the active workspace ID; the server verifies membership and joins the socket to a `workspace:<id>` room. Mutations on the API broadcast to that room; the web client merges events into Zustand stores. Online presence is maintained server-side and emitted as `presence:update`.

---

## Known limitations

- **Single-instance presence.** The presence map lives in process memory. Horizontally scaling the API would require swapping in `socket.io-redis-adapter`.
- **Real-time collab editing is plain-text + last-writer-wins.** True OT/CRDT was out of scope; the live preview and peer cursors demonstrate the integration but concurrent edits to the same character range can clobber each other.
- **Sanitiser is hand-rolled.** Announcement HTML is filtered with a small allow-list. A hardening pass would swap to DOMPurify on the server.
- **Test coverage is meaningful, not exhaustive.** The highest-risk surfaces (auth, RBAC, sanitiser, email templates) are tested. Per-CRUD-endpoint integration tests would be next.
- **Audit log has no UI.** Rows are written to `AuditLog` for every mutation, but the timeline UI was deprioritized — that would have been the audit-log-as-an-advanced-feature option.
- **PWA offline mode is degraded read.** API GETs are cached NetworkFirst with a stale fallback. Write-while-offline queueing is not implemented.

---

## Contact

Questions about this submission?

- **Candidate:** Azman (`978aho@gmail.com`)
- **Repo:** https://github.com/77oaking/kanban-project
- **For the FredoCloud team:** `hiring@fredocloud.com` — subject `[Technical Assessment]`

Thanks for reviewing.
