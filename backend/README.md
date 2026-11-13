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
