# ParamPara · परम्परा

A private family record: build your family tree, save the stories behind old photos, recipes and traditions, and share them with relatives. MERN stack (MongoDB, Express, React, Node), no AI features.

```
parampara/
  backend/     Express API      (backend/README.md, backend/DESIGN.md)
  frontend/    React + Vite + Tailwind   (frontend/README.md)
  render.yaml  one-click deploy of API + website on Render (free)
  DEPLOY.md    step-by-step free hosting guide
```

## What it does (v2)
- **Families** with three roles: owner, editor (adds content), viewer (reads and comments, good for elders)
- **People** in the tree do not need accounts: nickname ("Dadi"), birth/death dates, birthplace, photo, bio, profile page
- **Family tree** drawn with connecting lines (couples side by side, children below), **timeline** by year
- **Memories** (stories, recipes, letters, photos...) tagged to people, with **comments**, search, filters, pagination
- **Photo uploads** straight to Cloudinary (optional) or photo links
- **Sharing**: single-use invite links (with role, WhatsApp share button) or add by email; change roles; remove access
- **Activity feed**, family stats, **JSON export** of the whole family
- **Accounts**: forgot/reset password by email, change password (logs out other devices), "log out everywhere", delete account

## Quick start
```bash
# 1) backend
cd backend
npm install
cp .env.example .env        # fill in MONGO_URI and JWT_SECRET
npm run seed                # optional demo data
npm run dev                 # http://localhost:5000   (API docs at /api-docs)

# 2) frontend (new terminal)
cd frontend
npm install
npm run dev                 # http://localhost:5173
```
Demo logins after `npm run seed` (password `password123`): `demo@parampara.com` (owner), `priya@parampara.com` (editor), `nanaji@parampara.com` (viewer).

`npm test` in `backend` runs 53 automated tests. Deploying: see [DEPLOY.md](DEPLOY.md).

Never commit or share your `.env` file (it holds your database password and JWT secret).
