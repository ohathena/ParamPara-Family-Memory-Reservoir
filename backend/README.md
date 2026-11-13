# ParamPara backend

Express + MongoDB (Mongoose) + JWT + bcrypt.

## Setup
1. `npm install`
2. Copy `.env.example` to `.env` and fill in `MONGO_URI` (MongoDB Atlas connection string) and `JWT_SECRET` (any long random string).
   - Atlas: create a free cluster, add a database user, allow your IP under Network Access, copy the connection string.
3. `npm run dev` (or `npm start`)
4. Check `http://localhost:5000/api/health`

## Test in Postman
Import `postman/ParamPara.postman_collection.json` and run the whole collection in order (Runner). It registers two users, and checks success + failure cases (validation, 401, 403, 404, 409).

## Endpoints (all except register/login/health need `Authorization: Bearer <token>`)
- Auth: `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- Families: `POST/GET /api/families`, `GET/PATCH/DELETE /api/families/:id`, `POST /api/families/:id/collaborators` (body: `{email}`), `DELETE /api/families/:id/collaborators/:userId`
- Members: `POST/GET /api/families/:id/members`, `GET/PATCH/DELETE /api/members/:id`
- Relationships: `POST /api/relationships`, `GET /api/members/:id/relationships`, `PATCH/DELETE /api/relationships/:id`
- Memories: `POST/GET /api/memories`, `GET/PATCH/DELETE /api/memories/:id`
  - List filters: `family` (required), `category`, `author`, `from`, `to`, `q`, `sort` (newest|oldest|event), `page`, `limit` (max 50)

## Model relationships
- User 1—N Family (as owner); Family N—N User (collaborators)
- Family 1—N FamilyMember (a member need not have an account)
- FamilyMember N—N FamilyMember through Relationship (directional: source is the `type` of target; no automatic reverse record)
- Family 1—N Memory; Memory N—1 User (author); Memory N—N FamilyMember (people)

## Access rules
Owner and collaborators can read/add data in a family. Only the owner can edit/delete the family and manage collaborators. Memories can be edited/deleted by their author or the family owner.

## API docs (Swagger)
Start the server and open `http://localhost:5000/api-docs`. Log in through `/api/auth/login`, click **Authorize**, paste the token, then try any endpoint.

## Automated tests
`npm test` runs `tests/*.test.js` (Jest + Supertest, 53 tests) against a temporary in-memory MongoDB, so your Atlas data is not touched.
The first run downloads a MongoDB binary, so it needs internet. It covers auth, 401/403/404/409 cases, relationship rules,
memory CRUD, filters, pagination, and cleanup when members are deleted.

## Demo data (development only)
`npm run seed` creates 3 demo users (`demo@`, `priya@`, `nanaji@parampara.com`, password `password123`: owner, editor, viewer) with a family of 7 people, relationships, 6 memories and comments.
Re-running it replaces the old demo data.

## What is new in v1.1
- Layered structure (routes -> validators -> controllers -> services -> models), see `DESIGN.md`
- zod request validation, env validation, request ids, logging, compression, graceful shutdown, health checks
- Link invitations (`POST /api/families/:id/invitations`, `GET/POST /api/invitations/:token[/accept]`), leave family
- Family views: `/stats`, `/relationships`, `/tree`, `/timeline`
- Account: `PATCH /api/auth/me`, `POST /api/auth/change-password`
- Memories can be filtered by `person`

## Using your own test database
`TEST_MONGO_URI=mongodb://127.0.0.1:27017/parampara_test npm test` runs the tests against that database (it is wiped!), instead of downloading an in-memory one.

## What is new in v2.0
- **Roles**: owner / editor / viewer. Viewers read and comment only. `PATCH /api/families/:id/collaborators/:userId` `{role}` changes a role; invitations and add-by-email take a `role`
- **Sessions**: tokens carry a version; changing the password, resetting it, or `POST /api/auth/logout-all` ends all other sessions
- **Password reset**: `POST /api/auth/forgot-password`, `POST /api/auth/reset-password` (emailed single-use link, 30 min, only a hash stored). Email goes over HTTPS (Brevo/Resend) because free hosts block SMTP; without config, the link is printed in the dev console
- **Delete account**: `DELETE /api/auth/me` `{password}`; owned families are deleted, joined families are left, written memories stay
- **Comments**: `GET/POST /api/memories/:id/comments`, `DELETE /api/comments/:id`; `commentCount` kept on each memory
- **Activity feed**: `GET /api/families/:id/activity?limit=&before=` (auto-expires after a year)
- **Export**: `GET /api/families/:id/export` (owner) downloads the whole family as JSON
- **Photo uploads**: `POST /api/uploads/signature` `{family}` returns a signed Cloudinary upload (folder, formats, max size locked by the signature)
- **Members**: nickname, gender, death date, birthplace, photo; `GET /api/members/:id` also returns relationships and memory count
- **Relationships**: mirrored duplicates ("A parent of B" + "B child of A") and contradictions (parent + spouse) are refused
- **Transactions**: multi-step deletes run in a MongoDB transaction on Atlas (replica set), and fall back safely on a single local mongod
- `GET /api/config` tells the frontend which optional features are on; family list returns role and counts in 3 queries total
- Tests: `npm test` now runs Jest with `--experimental-vm-modules` (needed by the MongoDB 7 driver inside Jest)

## Production notes
Set `NODE_ENV=production`, a `JWT_SECRET` of 32+ characters, `CLIENT_URL` to your frontend address, and `TRUST_PROXY=true` when hosted behind a proxy (Render, Railway). Optional: `EMAIL_*` and `CLOUDINARY_*` (see `.env.example`). Full guide: `../DEPLOY.md`.
Never commit or zip `.env`.
