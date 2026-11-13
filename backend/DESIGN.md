# ParamPara: design notes

## Architecture (modular monolith)

```
React (Vite, Tailwind)  --Axios + JWT-->  Express API  -->  Mongoose  -->  MongoDB Atlas
                                           |
        request id -> logging -> helmet -> compression -> CORS -> rate limit
                                           |
        route -> validate (zod) -> auth (JWT) -> controller -> service -> model
                                           |
                                      error handler  (one place that turns errors into safe JSON)
```

| Layer | Folder | Job |
|---|---|---|
| Config | `config/` | Read and check env variables once, connect DB |
| Routes | `routes/` | URLs + which middleware runs (one file per resource) |
| Validators | `validators/` | Zod schemas for body/query. Unknown fields are dropped (no mass assignment) |
| Middleware | `middleware/` | auth, validate, request id, errors |
| Controllers | `controllers/` | Read the request, call services, send the response. No business rules |
| Services | `services/` | Business rules: access control, tree building, invitations, filters, cascade delete |
| Models | `models/` | Mongoose schemas, indexes, enums (single source of truth for categories/relationship types) |

## Principles used
- **Separation of concerns**: HTTP stuff in controllers, rules in services, data shape in models.
- **Single source of truth**: access checks live in `accessService.getFamilyForUser`; enums live in models and validators import them.
- **Fail fast**: bad env values stop the server at start with a clear message.
- **Defense in depth**: validation, authentication, family-level authorization, rate limiting, security headers, safe errors.
- **Least privilege**: owner / collaborator roles; memory edit only by author or owner.
- **Idempotent and atomic where it matters**: invitation is claimed with one atomic update (no double use); collaborators use `$addToSet` / `$pull`.
- **Bounded everything**: page size capped, member list capped, timeline capped, body size capped, pending invitations capped, tree loop guard.
- **Observability**: request id on every response and in 500 errors, request logging, `/api/health` and `/api/health/ready`.
- **Graceful shutdown**: server stops taking requests, finishes current ones, closes DB.

## Data model
- User 1-N Family (owner); Family N-N User (collaborators)
- Family 1-N FamilyMember (a member does not need an account)
- FamilyMember N-N FamilyMember via Relationship (directional: "source is the `type` of target")
- Family 1-N Memory; Memory N-1 User (author); Memory N-N FamilyMember (people)
- Family 1-N Invitation (single use, carries a role, expires after 7 days, only a SHA-256 hash of the token is stored)
- Memory 1-N Comment (Comment N-1 User); Memory.commentCount is kept in sync
- Family 1-N Activity (feed entries with name snapshots, TTL 1 year)
- Family N-N User as viewers (`viewers`), editors stay in `collaborators` so v1 data needs no migration
- User.tokenVersion (session revocation), User.resetTokenHash/resetTokenExpires (hash only, 30 min)

Indexes: `Memory(family, category, eventDate)`, `Memory(family, eventDate)`, `Memory(family, people)`, `Relationship(source, target, type)` unique, `User(email)` unique, `Invitation(tokenHash)` unique, `Invitation(expiresAt)` TTL.

## Decisions and trade-offs
| Decision | Why | Trade-off |
|---|---|---|
| Modular monolith | Simple to run and explain, enough for this size | Needs splitting only if it grows a lot |
| JWT in `Authorization` header | Stateless, works with a separate frontend on another domain (cookies across domains are blocked by many browsers) | Token in `localStorage` can be read by an XSS bug. React escapes output and no HTML is rendered from user content, which keeps that risk low |
| Regex text search | Works for partial words | Scans only one family's memories (indexed by family). A text index would be better for huge archives |
| Cascade delete in code | Mongo has no foreign keys | Runs in a transaction when the database supports it (Atlas); on a single local mongod the order of steps keeps it safe |
| Tree computed on the server | Frontend stays light, rule is testable | Recomputed per request (cheap: family sized) |
| Link invitations | Works for people not yet registered | Anyone with the link can join until it is used or expires |
| `tokenVersion` checked on every request | Password change / reset / "log out everywhere" end old sessions at once | One user lookup per request (it was already done) |
| Email over HTTPS API, not SMTP | Free hosts block SMTP ports | Tied to one provider's API (Brevo or Resend, switchable by env) |
| Photos uploaded straight to Cloudinary with a server signature | Server never handles image bytes, stays fast on a free instance | Deleting a memory does not delete the Cloudinary file (cleanup job is a future step) |
| Roles as two arrays (`collaborators` = editors, `viewers`) | Old data keeps working without a migration | Field name `collaborators` now means "editors" |
| Activity names stored as copies | Feed reads well after renames/deletes, one query | A renamed user shows the old name on old entries |
