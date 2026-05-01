# FredoCloud Team Hub

A full-stack collaborative workspace for shared goals, real-time announcements, and a kanban of action items. Built as a technical assessment for **FredoCloud**.

> **Live URLs**
> - Web: `https://your-web.up.railway.app` *(replace after deploying)*
> - API: `https://your-api.up.railway.app`
> - API docs (Swagger): `https://your-api.up.railway.app/api/docs`
>
> **Demo login** &mdash; `demo@fredocloud.test` / `Demo1234!`

---

## Project overview

A monorepo with two deployable apps:

| Path | Service | Stack |
|------|---------|-------|
| `apps/web` | Next.js 14 frontend (App Router, JS) | Tailwind, Zustand, Recharts, Tiptap, Socket.io-client, cmdk |
| `apps/api` | Express REST + Socket.io backend | Prisma, PostgreSQL, JWT (httpOnly cookies), Cloudinary, Zod, Swagger |

The two services share a single Postgres database and communicate over HTTP + WebSockets. Auth is JWT in **httpOnly cookies** (access + refresh, with rotation on each refresh). Realtime is Socket.io, authenticated via the same access cookie.

### Feature checklist (assignment requirements)

- [x] **Auth** &mdash; email/password register & login, protected routes, profile + Cloudinary avatar upload, logout, refresh-token rotation.
- [x] **Workspaces** &mdash; create, switch, invite by email, Admin/Member roles, name/description/accent color.
- [x] **Goals & Milestones** &mdash; goals with title/owner/dueDate/status, nested milestones with progress %, per-goal activity feed.
- [x] **Announcements** &mdash; rich-text editor (Tiptap), emoji reactions, comments, pinning.
- [x] **Action Items** &mdash; assignee, priority, due date, status, link to parent goal, **Kanban board** + **list view** toggle.
- [x] **Real-time** &mdash; Socket.io broadcasts new posts, reactions, status changes; **online presence** in the topbar; **@mention** in comments triggers in-app notifications.
- [x] **Analytics** &mdash; dashboard stats (totals, completed-this-week, overdue), Recharts area chart, **CSV export** of the workspace.

### Advanced features (assignment asks for 2 &mdash; 2 + 1 stretch are implemented)

1. **Optimistic UI** &mdash; reactions, status changes, kanban drags, and pinning all update Zustand state immediately and roll back on server error. See `apps/web/store/*` &mdash; every mutator follows the pattern `set(optimistic) → api.x() → set(server) | set(rollback)`.
2. **Advanced RBAC** &mdash; per-member permission matrix with 9 fine-grained flags (`canCreateGoal`, `canPostAnnouncement`, `canPinAnnouncement`, `canInviteMember`, `canManageMembers`, &hellip;). Backend enforces with `requirePerm(...)` middleware; the Members page exposes the matrix to admins. See `apps/api/src/middleware/workspace.js` and the `Permission` model in the Prisma schema.
3. *(stretch)* **Real-time collaborative editing** on the goal description &mdash; multiple users editing a goal see each other's changes live via Socket.io. Last-writer-wins on the broadcast; persistence is explicit (Save button or blur).

### Bonus features

- [x] **Dark / light theme** &mdash; `next-themes` with system preference detection.
- [x] **Keyboard shortcuts** &mdash; `⌘K` / `Ctrl+K` opens a `cmdk` command palette for navigation, workspace switching, theme, and sign-out.
- [x] **OpenAPI / Swagger** &mdash; served at `/api/docs` via `swagger-jsdoc` + `swagger-ui-express`.
- [x] **Email notifications** &mdash; Nodemailer wraps any SMTP provider (Resend / Mailtrap / Gmail). Invitations and `@mention` notifications email the recipient. **Falls back gracefully when SMTP is not configured** &mdash; the call no-ops and logs the email payload to the server console, so local dev never breaks.
- [x] **PWA** &mdash; installable web app via `next-pwa` with a manifest, SVG icons, runtime caching for assets and API GETs (`NetworkFirst` with a 4s timeout, so the app degrades to last-known data when offline).
- [x] **Tests** &mdash; Jest + Supertest for the backend (auth integration test with mocked Prisma, plus unit tests for the sanitiser, RBAC permission resolver, and email templates) and React Testing Library on the frontend (login form, format helpers, priority badge).

---

## Architecture

```
fredocloud-team-hub/                ← Turborepo root
├─ apps/
│  ├─ api/                          ← Express + Prisma + Socket.io
│  │  ├─ prisma/schema.prisma       ← Data model
│  │  └─ src/
│  │     ├─ index.js                ← Server bootstrap (HTTP + Socket.io)
│  │     ├─ app.js                  ← Express app + route mounts
│  │     ├─ realtime/socket.js      ← Sockets, presence, mentions, live edit
│  │     ├─ middleware/             ← auth, workspace+RBAC, validate, error
│  │     ├─ routes/                 ← auth, workspaces, members, goals,
│  │     │                             announcements, action items, stats,
│  │     │                             export, notifications, upload, invitations
│  │     ├─ services/audit.js       ← Append-only audit log writer
│  │     ├─ lib/                    ← prisma, jwt, cookies, cloudinary, swagger
│  │     └─ seed.js                 ← Idempotent demo data
│  └─ web/                          ← Next.js 14 App Router (JS)
│     ├─ app/
│     │  ├─ (auth)/                 ← Login + register + auth layout
│     │  ├─ (app)/                  ← Protected shell: dashboard, goals,
│     │  │                             announcements, action-items, members,
│     │  │                             settings, profile
│     │  ├─ accept-invite/          ← Invitation acceptance flow
│     │  ├─ layout.js               ← Theme + auth bootstrap
│     │  └─ page.js                 ← Public landing
│     ├─ components/                ← UI components (sidebar, topbar,
│     │                               kanban-board, rich-text-editor,
│     │                               collaborative-description, command-palette…)
│     ├─ store/                     ← Zustand stores (auth, workspace,
│     │                               goals, action-items, announcements,
│     │                               notifications, ui)
│     └─ lib/                       ← api client, socket, format helpers
├─ turbo.json
└─ package.json (workspaces)
```

### Auth flow

1. POST `/api/auth/register` or `/api/auth/login` creates a `User` and writes two cookies:
   - `access_token` &mdash; signed with `JWT_ACCESS_SECRET`, 15 minutes.
   - `refresh_token` &mdash; signed with `JWT_REFRESH_SECRET`, 7 days, also stored hashed in the `RefreshToken` table.
2. Every API call sends both cookies (`credentials: 'include'`).
3. On a 401 the client transparently calls `/api/auth/refresh` once. The server validates the hash in the DB, **revokes** the old token, issues a new pair, and stores the new hash. Replays of an old refresh token are rejected.
4. Logout revokes the refresh token and clears the cookies.

In production both cookies are `Secure; SameSite=None` so the Railway frontend on `*.up.railway.app` can talk to the API on a different `*.up.railway.app` subdomain.

### Realtime layer

- Sockets authenticate by reading the `access_token` cookie on the upgrade request &mdash; no separate token negotiation.
- After `connection`, the client emits `workspace:join` with the active workspace id; the server verifies membership and joins the socket to a `workspace:<id>` room.
- Mutations on the API broadcast to the room (`broadcast(workspaceId, event, payload)`); the web client merges them into the Zustand stores.
- Online presence is maintained server-side in an in-memory `Map<workspaceId, Set<userId>>` and emitted as `presence:update` events. (For multi-instance deployments you'd swap this for the Redis adapter.)
- `@mentions` in comments are parsed server-side and create `Notification` rows + per-user `notification:new` events.

### Optimistic UI pattern

Every Zustand store mutator follows the same shape:

```js
update: async (id, patch) => {
  const prev = state.list;
  set({ list: prev.map(applyPatch(id, patch)) });   // optimistic
  try {
    const { item } = await api.patch(...);
    set({ list: prev.map(applyServer(item)) });      // reconcile
  } catch (err) {
    set({ list: prev });                             // rollback
    toast.error(err.message);
  }
}
```

Reactions toggle, kanban drags reorder in a single transaction, and goal status transitions all reflect instantly. The realtime listeners apply server-authoritative state on top, so two users dragging concurrently converge.

### RBAC

`Membership.role` is the coarse axis (`ADMIN` / `MEMBER`). `Permission` is a 1-to-1 child carrying the fine-grained flags. Resolution rule (`apps/api/src/middleware/workspace.js`):

- An ADMIN's flag is `true` unless the `Permission` row explicitly overrides it to `false`.
- A MEMBER falls back to the per-flag default in the schema.

Endpoints guard with `requirePerm('canPostAnnouncement')` etc. so the whole matrix is testable and serializable to the client (which uses it to hide buttons).

---

## Local development

### Prerequisites

- Node.js **18.17+**
- PostgreSQL (local install **or** a Railway dev DB)
- A Cloudinary account (free tier is fine) for avatars / attachments. The app **runs without it** &mdash; just upload endpoints will return `503`.

### Setup

```bash
# 1. Clone and install workspace deps
git clone <repo-url> fredocloud-team-hub
cd fredocloud-team-hub
npm install

# 2. Configure the API
cp apps/api/.env.example apps/api/.env
# edit apps/api/.env:
#   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/fredocloud
#   JWT_ACCESS_SECRET=$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")
#   JWT_REFRESH_SECRET=$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")
#   CLOUDINARY_CLOUD_NAME=...
#   CLOUDINARY_API_KEY=...
#   CLOUDINARY_API_SECRET=...

# 3. Configure the web app
cp apps/web/.env.example apps/web/.env.local

# 4. Migrate + seed
npm run db:migrate    # creates the schema
npm run db:seed       # inserts the demo workspace + accounts

# 5. Run everything
npm run dev
```

`npm run dev` runs both apps via Turbo. The web app is on `http://localhost:3000`, the API on `http://localhost:4000`, Swagger on `http://localhost:4000/api/docs`.

### Useful root scripts

| Command | What it does |
|---|---|
| `npm run dev` | Run web + api in parallel (Turbo) |
| `npm run build` | Build both apps |
| `npm run lint` | Lint both apps |
| `npm run test` | Run Jest test suites (backend + frontend) |
| `npm run db:migrate` | `prisma migrate dev` against the API |
| `npm run db:seed` | Seed the demo account + sample workspace |
| `npm run db:studio` | Prisma Studio |

### Running tests

Backend tests use Jest + Supertest. Prisma is mocked in the integration test, so **no database is required** to run them.

```bash
cd apps/api && npm test
# or from the repo root:
npm run test
```

Frontend tests use Jest + React Testing Library against the Next.js component tree.

```bash
cd apps/web && npm test
```

---

## Deploying to Railway

1. **Create a Railway project** &mdash; from the dashboard, "New Project → Empty Project".
2. **Add a Postgres plugin** &mdash; click "+ New → Database → PostgreSQL". Railway auto-injects `DATABASE_URL` into any service in the project that references it.
3. **Add the API service** &mdash; "+ New → GitHub repo → this repo". Set:
   - **Root directory**: `apps/api`
   - **Build / Start**: pulled from `apps/api/railway.json` (Nixpacks).
   - **Variables**:
     ```
     DATABASE_URL=<from Postgres plugin>
     JWT_ACCESS_SECRET=<random 48 bytes>
     JWT_REFRESH_SECRET=<random 48 bytes>
     CLOUDINARY_CLOUD_NAME=...
     CLOUDINARY_API_KEY=...
     CLOUDINARY_API_SECRET=...
     CLIENT_URL=https://your-web.up.railway.app
     NODE_ENV=production
     ```
   - Generate a public domain &mdash; copy it; this is your API URL.
4. **Add the web service** &mdash; "+ New → GitHub repo → this repo" again. Set:
   - **Root directory**: `apps/web`
   - **Variables**:
     ```
     NEXT_PUBLIC_API_URL=https://your-api.up.railway.app
     NEXT_PUBLIC_SOCKET_URL=https://your-api.up.railway.app
     ```
   - Generate a public domain.
5. **Update the API's `CLIENT_URL`** to match the web service's domain (CORS + cookie SameSite).
6. **Trigger a deploy.** The API's `start` script runs `prisma migrate deploy` and seeds an empty database with the demo account, so first boot leaves you with a working login.

---

## Environment variables

### Backend (`apps/api/.env`)

| Var | Required | Notes |
|-----|---|---|
| `DATABASE_URL` | yes | Postgres connection string. Railway injects automatically. |
| `JWT_ACCESS_SECRET` | yes | 48+ bytes recommended. |
| `JWT_REFRESH_SECRET` | yes | Must differ from access secret. |
| `JWT_ACCESS_TTL` | no | Default `15m`. |
| `JWT_REFRESH_TTL` | no | Default `7d`. |
| `CLIENT_URL` | yes | Comma-separated origins for CORS. |
| `CLOUDINARY_CLOUD_NAME` / `_API_KEY` / `_API_SECRET` | optional | If absent, `/api/upload` returns `503`. |
| `PORT` | no | Default `4000`; Railway injects. |
| `NODE_ENV` | no | `production` enables `Secure; SameSite=None` cookies. |
| `DEMO_EMAIL` / `DEMO_PASSWORD` | no | Override the seeded demo account. |

### Frontend (`apps/web/.env.local`)

| Var | Required | Notes |
|-----|---|---|
| `NEXT_PUBLIC_API_URL` | yes | E.g. `https://your-api.up.railway.app`. |
| `NEXT_PUBLIC_SOCKET_URL` | yes | Usually identical to `NEXT_PUBLIC_API_URL`. |

---

## Known limitations

- **Single-instance presence.** The presence map lives in process memory, so horizontally scaling the API would require swapping in `socket.io-redis-adapter` and a shared store.
- **Real-time collab editing is plain-text + last-writer-wins.** True OT/CRDT was out of scope for the time budget; the live preview & cursor signal demonstrates the integration, but concurrent edits can clobber each other on conflicting edits to the same character range.
- **Sanitiser is hand-rolled.** Announcement HTML is sanitized with a small allow-list (no DOMPurify/jsdom). Adequate for trusted workspace members, but a hardening pass would swap to DOMPurify on the server.
- **Test coverage is meaningful, not exhaustive.** The backend tests cover auth flow, RBAC, sanitiser, email templates &mdash; the highest-risk surfaces. We didn't write integration tests for every CRUD endpoint; those would be next.
- **Audit log has no UI.** Rows are written but not surfaced &mdash; the timeline UI is what audit-log-as-an-advanced-feature would have been.
- **PWA offline mode is degraded read.** API GETs are `NetworkFirst` with a stale fallback, so offline users see their last view. Write-while-offline queueing is not implemented.

---

## Repository hygiene

- Conventional commits throughout (`feat: …`, `fix: …`, `chore: …`, `docs: …`).
- `.env*` files are gitignored; only `.env.example` is committed.
- `apps/web/jsconfig.json` defines the `@/*` import alias used everywhere.
- Prettier config at the root; a single `npm run lint` lints both apps.

---

## Contact

Questions? `hiring@fredocloud.com` &mdash; subject `[Technical Assessment]`.
