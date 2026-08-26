Date created: Aug 25, 2026
Date last modified: Aug 25, 2026 (TDD/Vitest update)

# Register, Login, and Logout - Technical PRD

## Overview/Problem

We are building a greenfield Quiz Maker application where multiple teachers collaborate to create a shared test bank of multiple-choice questions. Before teachers can contribute questions, the application needs a way for each teacher to create an account and sign in. Without user registration and authentication, there is no way to identify who created or owns content, and multiple teachers cannot safely share the same application.

This PRD covers Phase 1 only: user registration, login, and logout. MCQ creation and collaboration features are deferred to a later sprint.

---

## Hypothesis

We believe that providing basic username/password registration and login will enable multiple teachers to access the Quiz Maker and prepare the foundation for collaborative MCQ test bank creation in Phase 2.

---

## Scope

### In Scope

What will be built in this feature:

- Cloudflare D1 `users` table with a migration
- User service in `src/lib/` providing create, read, update, and delete operations for users
- HTTP POST API endpoints for register, login, and logout under `src/app/api/auth/`
- Password hashing at rest in the database (never store plaintext passwords)
- Client-side password hashing before transmission over HTTP POST on register and login
- Register page (`/register`), login page (`/login`), and MCQ stub page (`/mcqs`) as the post-auth destination
- Logout action that clears client-side state and redirects to the login page
- Vitest unit tests written test-first in every implementation phase (red → green)

### Out of Scope

What is explicitly not being built now but may be considered later:

- Social / OAuth login (Google, GitHub, etc.)
- JWT or other auth tokens
- Cookies or server-side session management
- MCQ CRUD, collaboration, or test-bank features
- Password reset or email verification
- Role-based access control (admin vs teacher)

### Cut

Things that were considered during planning but deliberately removed (and why):

- Session-based auth (cookies, server sessions) - Cut because Phase 1 is intentionally stateless and simple; sessions will be added in a future phase if needed
- Plaintext password storage - Cut for basic security; only hashed values are stored
- Server Actions as the primary mutation path - Cut in favor of explicit REST-style POST endpoints per this phase's spec (project rules generally prefer Server Actions; endpoints are the chosen approach here)
- bcrypt via native Node modules - Cut because Workers runtime constraints favor Web Crypto or a small Workers-compatible library; propose dependency before adding

---

## Technical Requirements

### Database Schema

The application uses Cloudflare D1 (SQLite). A single `users` table stores teacher accounts.

**Setup steps** (see `.cursor/rules/d1.mdc`):

1. Create the database: `npx wrangler d1 create quizmaker-db`
2. Add the `d1_databases` block to `wrangler.jsonc` with binding `DB`
3. Run `npm run cf-typegen` to type `env.DB`
4. Create migrations with `npx wrangler d1 migrations create quizmaker-db <description>`
5. Apply locally only: `npx wrangler d1 migrations apply quizmaker-db --local`

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_username ON users (username);
CREATE INDEX idx_users_email ON users (email);
```

**Column notes:**

| Column | Description |
|--------|-------------|
| `id` | Primary key; auto-generated UUID-like string |
| `first_name` | Teacher's first name |
| `last_name` | Teacher's last name |
| `username` | Unique login identifier; may equal email |
| `email` | Unique email address; may equal username |
| `password_hash` | Hashed password value; never plaintext |
| `created_at` | Record creation timestamp |

### API Endpoints

All endpoints are route handlers under `src/app/api/auth/`. Request bodies are validated with Zod before use. The user service (`src/lib/services/user-service.ts`) handles all D1 access.

#### POST /api/auth/register

Creates a new user account.

**Request Body:**

```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "username": "jsmith",
  "email": "jsmith@school.edu",
  "passwordHash": "client-hashed-password-value"
}
```

**Validation rules:**

- `firstName`: required, non-empty string
- `lastName`: required, non-empty string
- `username`: required, non-empty string, unique in database
- `email`: required, valid email format, unique in database
- `passwordHash`: required, non-empty string (already hashed on client)

**Response:**

- Success (201): `{ "success": true, "userId": "<id>", "redirectUrl": "/mcqs" }`
- Error (400): Validation error — `{ "success": false, "error": "Validation failed", "details": [...] }`
- Error (409): Duplicate username or email — `{ "success": false, "error": "Username or email already exists" }`
- Error (500): Server error — `{ "success": false, "error": "Internal server error" }`

#### POST /api/auth/login

Verifies user credentials and returns success for redirect.

**Request Body:**

```json
{
  "usernameOrEmail": "jsmith",
  "passwordHash": "client-hashed-password-value"
}
```

**Validation rules:**

- `usernameOrEmail`: required, non-empty string (matches username or email)
- `passwordHash`: required, non-empty string (already hashed on client)

**Response:**

- Success (200): `{ "success": true, "userId": "<id>", "redirectUrl": "/mcqs" }`
- Error (400): Validation error — `{ "success": false, "error": "Validation failed", "details": [...] }`
- Error (401): Invalid credentials — `{ "success": false, "error": "Invalid username or password" }`
- Error (500): Server error — `{ "success": false, "error": "Internal server error" }`

**Login logic:** Look up user by username or email. Compare submitted `passwordHash` to stored `password_hash` using a constant-time comparison.

#### POST /api/auth/logout

Handles logout. Because Phase 1 has no server-side sessions or tokens, this endpoint acknowledges logout and instructs the client to clear local state.

**Request Body:** none required

**Response:**

- Success (200): `{ "success": true, "redirectUrl": "/login" }`

**Client behavior:** Clear any client-side auth state (e.g. `localStorage` user reference if stored), then redirect to `/login`.

### User Interface Requirements

Use existing shadcn/ui components: `field`, `input`, `button`, `card` from `src/components/ui/`.

#### Register Page (`/register`)

- Form fields: first name, last name, username, email, password
- Client-side validation: all fields required; email must be valid format; password minimum length (recommend 8 characters)
- On submit: hash password client-side, POST to `/api/auth/register` with hash (not plaintext)
- On success: redirect to `/mcqs`
- On error: display error message via `FieldError`
- Link to login page for existing users

#### Login Page (`/login`)

- Form fields: username or email, password
- Client-side validation: both fields required
- On submit: hash password client-side, POST to `/api/auth/login` with hash (not plaintext)
- On success: redirect to `/mcqs`
- On error: display generic "Invalid username or password" message (do not reveal whether username exists)
- Link to register page for new users

#### MCQ Stub Page (`/mcqs`)

- Placeholder page for Sprint 2 MCQ features
- Display a heading such as "MCQ Test Bank" and brief stub text indicating this area will be built next
- Include a logout button/link that POSTs to `/api/auth/logout` and redirects to `/login`
- Optionally store minimal client-side user reference (e.g. userId in `localStorage`) after login/register for display purposes only — not for security

#### Home Page (`/`)

- Redirect unauthenticated visitors to `/login`, or provide links to register and login

---

## Testing Strategy

This feature is implemented using **test-driven development (TDD)** with **Vitest** as the unit testing framework. Conventions follow [`.cursor/skills/testing/SKILL.md`](.cursor/skills/testing/SKILL.md).

### Framework and Setup

Vitest is not installed in the starter. First-time setup (Phase 1) includes:

```bash
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/user-event jsdom vite-tsconfig-paths
```

Add `vitest.config.ts` at the repo root and scripts in `package.json`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

### TDD Workflow (Every Phase)

Each implementation phase follows **Red → Green → Refactor**:

1. **RED** — Write tests for the phase's behavior before implementation; run `npm run test` and confirm they fail
2. **GREEN** — Implement the minimum code to make tests pass
3. **Refactor** — Clean up while keeping tests green
4. **Verify** — Confirm phase exit criteria and relevant acceptance criteria

```mermaid
flowchart LR
    subgraph eachPhase [Each Phase]
        WriteTests["Write tests first RED"]
        RunTest["npm run test expect fail"]
        Implement["Implement feature"]
        RunGreen["npm run test GREEN"]
        Criteria["Verify acceptance criteria"]
        WriteTests --> RunTest --> Implement --> RunGreen --> Criteria
    end
```

### Conventions

- **Colocation**: Tests live beside source — `user-service.ts` tested by `user-service.test.ts`
- **Mocking**: Mock at module boundaries; never hit real D1, network, or external services in unit tests
- **Cloudflare bindings**: Mock `getCloudflareContext()` and supply a fake `env.DB` (see testing skill)
- **React**: Use `@testing-library/react` and `userEvent`; test client components only — extract Server Component logic into testable functions
- **Quality**: Assert observable behavior and failure paths; no hollow tests like `expect(true).toBe(true)`
- **Phase completion signal**: `npm run test` passes for that phase's tests plus listed acceptance criteria

### Test Scripts

| Command | Purpose |
|---------|---------|
| `npm run test` | Run full suite once (CI and phase exit check) |
| `npm run test:watch` | Watch mode for local TDD |

---

## Implementation Phases

### Phase 1: D1 Setup, Migration, and Test Harness - COMPLETED

**Objective**: Set up the Vitest test harness, create the D1 database, configure the binding, and apply the `users` table migration locally.

**TDD approach**: Write migration schema tests and a harness smoke test first (RED). Create the migration file and Vitest config to turn tests GREEN. Phase 1 does not integration-test real D1 — it validates migration SQL structure and establishes the test foundation for later phases.

**Tests first (RED)**:

| Test file | What it asserts |
|-----------|-----------------|
| `migrations/0001_create_users.test.ts` | Migration SQL defines `users` table with columns `id`, `first_name`, `last_name`, `username`, `email`, `password_hash`, `created_at` and indexes on `username`/`email` |
| `src/lib/__test__/setup.test.ts` | Vitest harness loads and runs (smoke test once config is wired) |

**Tasks**:

1. Install Vitest dev dependencies; add `vitest.config.ts` and `test` / `test:watch` scripts (per testing skill)
2. Write migration schema tests and harness smoke test (RED — confirm `npm run test` fails)
3. Run `npx wrangler d1 create quizmaker-db`
4. Add `d1_databases` block to `wrangler.jsonc` with binding `DB`
5. Run `npm run cf-typegen`
6. Create migration for `users` table matching test expectations
7. Apply migration locally: `npx wrangler d1 migrations apply quizmaker-db --local`
8. Confirm migration and harness tests turn GREEN

**Deliverables**:

- `vitest.config.ts` and `package.json` test scripts
- `migrations/0001_create_users.test.ts` and `src/lib/__test__/setup.test.ts`
- `wrangler.jsonc` updated with D1 binding
- `migrations/0001_create_users.sql` (or equivalent)
- Typed `env.DB` in `cloudflare-env.d.ts`

**Phase exit criteria**:

- `npm run test` passes for Phase 1 test files
- Migration applied locally
- D1 binding configured in `wrangler.jsonc`

### Phase 2: User Service - COMPLETED

**Objective**: Implement the user service with CRUD operations and password comparison.

**TDD approach**: Write all user service tests against a mocked D1 binding first (RED). Implement `user-service.ts` until tests pass (GREEN).

**Tests first (RED)** — `src/lib/services/user-service.test.ts`:

- `createUser` inserts and returns user with generated id
- `createUser` rejects duplicate username
- `createUser` rejects duplicate email
- `getUserByUsername` returns user or null
- `getUserByEmail` returns user or null
- `getUserById` returns user or null
- `updateUser` persists changes
- `deleteUser` removes record
- `verifyPasswordHash` returns true on match, false on mismatch (constant-time comparison)
- All D1 access mocked via `vi.mock` — no real database

**Tasks**:

1. Write `user-service.test.ts` with mocked D1 (RED)
2. Create `src/lib/services/user-service.ts`
3. Implement `createUser`, `getUserByUsername`, `getUserByEmail`, `getUserById`, `updateUser`, `deleteUser`
4. Implement `verifyPasswordHash` for login comparison
5. Use prepared statements with numbered placeholders (`?1`, `?2`)
6. Confirm all user service tests turn GREEN

**Deliverables**:

- `src/lib/services/user-service.test.ts` (all cases passing)
- `src/lib/services/user-service.ts` with full CRUD and login verification

**Phase exit criteria**:

- `npm run test` passes for user service tests
- Acceptance: user service provides create, read, update, and delete operations

### Phase 3: API Routes - PLANNED

**Objective**: Implement register, login, and logout endpoints with Zod validation.

**TDD approach**: Write route handler tests with mocked user service first (RED). Add `zod` and implement routes until tests pass (GREEN). Extract handler logic into testable functions if needed to avoid Next.js request plumbing in tests.

**Tests first (RED)**:

| Test file | Cases |
|-----------|-------|
| `src/app/api/auth/register/route.test.ts` | 201 on valid body; 400 on validation failure; 409 on duplicate username/email; never stores plaintext |
| `src/app/api/auth/login/route.test.ts` | 200 on valid credentials; 401 on wrong password; 401 on unknown user; 400 on invalid body |
| `src/app/api/auth/logout/route.test.ts` | 200 with `{ redirectUrl: "/login" }` |

Mock `user-service` and `getCloudflareContext()`.

**Tasks**:

1. Write route tests (RED)
2. Add `zod` dependency (propose to user before installing)
3. Create Zod schemas for register and login request bodies
4. Create `src/app/api/auth/register/route.ts`
5. Create `src/app/api/auth/login/route.ts`
6. Create `src/app/api/auth/logout/route.ts`
7. Confirm all route tests turn GREEN

**Deliverables**:

- `src/app/api/auth/register/route.test.ts`
- `src/app/api/auth/login/route.test.ts`
- `src/app/api/auth/logout/route.test.ts`
- Three working API route handlers under `src/app/api/auth/`

**Phase exit criteria**:

- `npm run test` passes for all API route tests
- Acceptance: all API endpoints validate input with Zod; registration rejects duplicates; login rejects invalid credentials

### Phase 4: UI Pages and Client Hashing - PLANNED

**Objective**: Build register, login, and MCQ stub pages with client-side password hashing.

**TDD approach**: Write tests for the hash utility and client form components first (RED). Implement pages and wire to API endpoints until tests pass (GREEN).

**Tests first (RED)**:

| Test file | Cases |
|-----------|-------|
| `src/lib/auth/hash-password.test.ts` | Same input produces same hash; different inputs produce different hashes; output is hex string |
| `src/app/register/register-form.test.tsx` | Renders fields; submits hashed password (mock `fetch`); shows validation errors |
| `src/app/login/login-form.test.tsx` | Renders fields; submits hashed password; shows generic error on 401 |
| `src/app/mcqs/logout-button.test.tsx` | Logout POST called; redirects to `/login` |

Use `@testing-library/react` and `userEvent`. Test client components only.

**Tasks**:

1. Write hash utility and component tests (RED)
2. Create shared client-side password hashing utility (`src/lib/auth/hash-password.ts`)
3. Create register form client component and `src/app/register/page.tsx`
4. Create login form client component and `src/app/login/page.tsx`
5. Create MCQ stub page with logout action at `src/app/mcqs/page.tsx`
6. Update home page with navigation to register/login
7. Confirm all UI tests turn GREEN

**Deliverables**:

- `src/lib/auth/hash-password.test.ts`
- `src/app/register/register-form.test.tsx`
- `src/app/login/login-form.test.tsx`
- `src/app/mcqs/logout-button.test.tsx`
- Register, login, and MCQ stub pages wired to API endpoints

**Phase exit criteria**:

- `npm run test` passes for hash utility and component tests
- Acceptance: passwords hashed client-side before POST; successful register/login redirect to `/mcqs`; logout redirects to `/login`

### Phase 5: Verification - PLANNED

**Objective**: Confirm the full test suite passes and the feature works end-to-end on the Workers runtime.

**TDD approach**: No new tests — run the complete suite and manual smoke tests to validate integration beyond unit test mocks.

**Tasks**:

1. Run `npm run test` — full suite must pass
2. Run `npm run lint`
3. Run `npm run build`
4. Run `npm run preview` and manually test register, login, logout, and redirect flows
5. Update PRD Current Status and mark acceptance criteria complete

**Deliverables**:

- Full test suite green (`npm run test`)
- Lint and build pass
- Manual smoke test documented in Current Status

**Phase exit criteria**:

- `npm run test`, `npm run lint`, and `npm run build` all pass
- Manual smoke test via `npm run preview` confirms redirect flows
- All acceptance criteria checked

---

## Technical Implementation Details

### Key Files

- `wrangler.jsonc` - D1 database binding configuration
- `migrations/0001_create_users.sql` - Users table schema
- `src/lib/services/user-service.ts` - User CRUD and password verification
- `src/lib/auth/hash-password.ts` - Shared password hashing utility (client and server compatible)
- `src/app/api/auth/register/route.ts` - Registration endpoint
- `src/app/api/auth/login/route.ts` - Login endpoint
- `src/app/api/auth/logout/route.ts` - Logout endpoint
- `src/app/register/page.tsx` - Registration page
- `src/app/login/page.tsx` - Login page
- `src/app/mcqs/page.tsx` - MCQ stub page (post-auth destination)

### Test Files

- `vitest.config.ts` - Vitest configuration at repo root
- `src/lib/__test__/setup.test.ts` - Harness smoke test (Phase 1)
- `migrations/0001_create_users.test.ts` - Migration schema validation (Phase 1)
- `src/lib/services/user-service.test.ts` - User service CRUD and password verification (Phase 2)
- `src/app/api/auth/register/route.test.ts` - Registration endpoint (Phase 3)
- `src/app/api/auth/login/route.test.ts` - Login endpoint (Phase 3)
- `src/app/api/auth/logout/route.test.ts` - Logout endpoint (Phase 3)
- `src/lib/auth/hash-password.test.ts` - Client-side hashing utility (Phase 4)
- `src/app/register/register-form.test.tsx` - Registration form component (Phase 4)
- `src/app/login/login-form.test.tsx` - Login form component (Phase 4)
- `src/app/mcqs/logout-button.test.tsx` - Logout button component (Phase 4)

Route handlers may export inner functions (e.g. `handleRegister(body)`) to keep tests free of Next.js request plumbing.

### Password Handling Flow

```mermaid
sequenceDiagram
    participant Browser
    participant API as API_Route
    participant UserSvc as UserService
    participant D1

    Browser->>Browser: Hash password client-side
    Browser->>API: POST register/login with passwordHash
    API->>UserSvc: createUser / verifyUser
    UserSvc->>D1: INSERT or SELECT password_hash
    UserSvc-->>API: Result
    API-->>Browser: Success redirect to /mcqs or error
```

**Register flow:**

1. User enters password on register form
2. Client hashes password using Web Crypto (e.g. SHA-256) before sending
3. POST `/api/auth/register` with `passwordHash` and user fields
4. User service stores hash in `password_hash` column
5. Client redirects to `/mcqs`

**Login flow:**

1. User enters password on login form
2. Client hashes password using the same algorithm as registration
3. POST `/api/auth/login` with `usernameOrEmail` and `passwordHash`
4. User service looks up user and compares hashes with constant-time comparison
5. On match, client redirects to `/mcqs`

**Logout flow:**

1. User clicks logout on MCQ stub page
2. POST `/api/auth/logout`
3. Client clears any local auth state
4. Client redirects to `/login`

### Implementation Patterns

```typescript
// User service: prepared statement with numbered placeholders
const result = await db
  .prepare("SELECT * FROM users WHERE username = ?1 OR email = ?1")
  .bind(usernameOrEmail)
  .all<UserRow>();

const user = result.results[0];
```

```typescript
// Client-side password hashing (browser Web Crypto)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
```

```typescript
// Zod validation in route handler
const registerSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  username: z.string().min(1),
  email: z.string().email(),
  passwordHash: z.string().min(1),
});
```

### Important Notes

- D1 is only reachable from server code; never import the user service into `'use client'` components
- Always use prepared statements with bound parameters; never concatenate user input into SQL
- Prefer `all()` over `first()` for D1 queries (local vs remote consistency)
- Apply migrations locally only; never run `migrations apply --remote` without explicit user approval
- Client-side hashing reduces plaintext password exposure over the wire but is not a substitute for HTTPS in production
- Phase 1 has no persistent server-side auth; the MCQ stub page is not protected by middleware in this phase
- Propose `zod` as a new dependency before adding it to the project
- Propose Vitest dev dependencies before installing (see Testing Strategy)
- Follow TDD: write tests first in each phase; a phase is incomplete until `npm run test` passes for its tests

---

## Acceptance Criteria

- [x] Vitest harness configured (`vitest.config.ts`, `npm run test` works)
- [x] Each phase's unit tests pass (`npm run test` green before moving to the next phase)
- [ ] Tests cover happy paths and failure paths (validation, duplicates, invalid credentials)
- [ ] A teacher can register with first name, last name, username, email, and password
- [ ] Registration rejects duplicate usernames with a clear error
- [ ] Registration rejects duplicate emails with a clear error
- [ ] Passwords are hashed client-side before HTTP POST on register and login
- [ ] Only hashed passwords are stored in the database; plaintext is never persisted
- [ ] A teacher can log in with username or email plus password
- [ ] Login rejects invalid credentials with a generic error message
- [ ] Successful registration redirects to `/mcqs`
- [ ] Successful login redirects to `/mcqs`
- [ ] MCQ stub page displays placeholder content for Sprint 2
- [ ] Logout clears client-side state and redirects to `/login`
- [x] User service provides create, read, update, and delete operations
- [ ] All API endpoints validate input with Zod
- [ ] `npm run lint`, `npm run build`, and `npm run test` pass

---

## Success Metrics

| Metric | Target | How Measured |
|--------|--------|--------------|
| Unit test pass rate | 100% before each phase is marked complete | `npm run test` exit code 0 |
| Registration success rate | 100% for valid unique inputs during testing | Manual test: register 3 distinct users without error |
| Login success rate | 100% for registered users with correct password | Manual test: log in each registered user |
| Password security | 0 plaintext passwords in DB or request logs | Inspect D1 records and network payloads during testing |
| Redirect correctness | 100% redirect to `/mcqs` after register/login | Manual test of both flows |
| Logout correctness | 100% redirect to `/login` after logout | Manual test from MCQ stub page |

---

## Dependencies

### External Dependencies

- Cloudflare D1 - SQLite database for user storage
- Web Crypto API - Client-side password hashing (built into browsers and Workers)

### Internal Dependencies

- `@opennextjs/cloudflare` / `getCloudflareContext()` - Access D1 binding from route handlers
- `src/lib/services/user-service.ts` - Centralized user data access (to be created)
- shadcn/ui components (`field`, `input`, `button`, `card`) - Form UI

### Dependencies to Add (propose before installing)

- `vitest`, `@vitejs/plugin-react`, `@testing-library/react`, `@testing-library/user-event`, `jsdom`, `vite-tsconfig-paths` — unit test harness
- `zod` — Request body validation in API route handlers

### Environment Variables

- None required for Phase 1 (no secrets for basic auth without sessions)

---

## Risks and Mitigation

### Technical Risks

- **Risk**: No session management means no server-enforced auth on `/mcqs`; any user can navigate there directly
- **Mitigation**: Accept as Phase 1 limitation; document that route protection will be added when sessions are introduced in a future phase

- **Risk**: Client-side SHA-256 alone is weaker than server-side salted hashing (bcrypt/argon2)
- **Mitigation**: Accept for Phase 1 baseline; plan to add server-side salting or upgrade hashing algorithm in a future security pass

- **Risk**: D1 binding misconfiguration causes runtime errors on Workers
- **Mitigation**: Verify with `npm run preview` (Workers runtime) not just `npm run dev` (Node runtime)

- **Risk**: Unit tests mock D1 but real Workers runtime behaves differently
- **Mitigation**: Phase 5 manual smoke test via `npm run preview` complements unit tests; raise `@cloudflare/vitest-pool-workers` with user if Workers-runtime integration tests are needed later

### User Experience Risks

- **Risk**: Users expect to stay logged in across browser sessions but Phase 1 has no persistence
- **Mitigation**: Document limitation; add session/cookie auth in a future phase

- **Risk**: Duplicate username/email errors may confuse users during registration
- **Mitigation**: Return specific, actionable error messages for 409 conflicts

---

## Troubleshooting Guide

_To be populated during implementation as issues are discovered and resolved._

---

## Notes for AI Agents

When working with this PRD:

1. Start by reading the Overview and Hypothesis to understand intent
2. Use Scope (In/Out/Cut) to determine boundaries — do not build MCQ features, social login, tokens, or session management
3. **Follow TDD in every phase**: write tests first (RED), implement until green (GREEN), then refactor
4. Never skip writing tests at the start of a phase; confirm tests fail before implementing
5. Follow [`.cursor/skills/testing/SKILL.md`](.cursor/skills/testing/SKILL.md) for setup, mocking, and assertion quality
6. A phase is not complete until its tests pass and its acceptance criteria are satisfied
7. Update phase status markers as work progresses
8. Add implementation details under "Technical Implementation Details" as code is written
9. Mark acceptance criteria as complete when features work
10. Add troubleshooting entries when bugs are found and fixed
11. Keep all sections current — remove outdated information
12. Use code references format: `filepath:line-number` when citing code
13. Propose new dependencies (e.g. `zod`, Vitest packages) before adding them
14. Never apply D1 migrations to the remote database without explicit user approval

---

## Current Status

**Last Updated**: Aug 26, 2026
**Current Phase**: Phase 3 - API Routes
**Status**: PLANNED (Phase 2 complete — awaiting review)
**Next Steps**: Review Phase 2, then begin Phase 3 route tests (RED)
