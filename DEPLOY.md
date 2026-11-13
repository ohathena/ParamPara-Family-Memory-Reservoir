# Deploying ParamPara for free

Total cost: **₹0 / month**. Setup time: about 30–40 minutes the first time.

| Piece | Service | Free plan (checked Nov 2026) |
|---|---|---|
| Database | MongoDB Atlas, Free cluster (M0) | 512 MB storage, about 100 operations/second. Plenty for thousands of memories (text is tiny, photos live in Cloudinary) |
| API (backend) | Render, free web service | 750 instance hours/month. **Sleeps after 15 min without traffic, takes about 1 minute to wake up** |
| Website (frontend) | Render, static site | Served from a CDN, does not sleep |
| Photo uploads (optional) | Cloudinary Free | 25 credits/month (1 credit = 1 GB storage or 1 GB bandwidth or 1,000 transformations), 10 MB per image |
| Reset-password email (optional) | Brevo Free | 300 emails/day through an HTTPS API, no own domain needed |

Why these choices:
- **Render blocks SMTP ports (25/465/587) on free services**, so Gmail/Nodemailer would silently fail. The app sends email through Brevo's HTTPS API instead, which works.
- **Vercel's free (Hobby) plan is for non-commercial, personal use only.** Since you want this business-ready, the website goes on a Render static site (or Cloudflare Pages, see the end), which allow commercial use.
- The app already handles the 1-minute wake-up: the website shows a "Waking up the server" banner instead of looking broken.

---

## 0. Before you start

1. Make sure it works locally: `cd backend && npm test` (all tests pass), `cd frontend && npm run build`.
2. Push the project to a **GitHub** repository (private is fine). The repo root must contain `render.yaml`, `backend/` and `frontend/`.
3. Check that no `.env` file is committed: `git ls-files | grep .env` should only show `.env.example` files.

## 1. MongoDB Atlas (database)

1. Sign up at <https://www.mongodb.com/cloud/atlas/register>, create a project, then **Create cluster → Free**. Pick a region close to your users (Mumbai `ap-south-1` if offered).
2. **Database Access → Add new database user.** Username e.g. `parampara`, click *Autogenerate secure password*, copy it somewhere safe. Role: *Read and write to any database*.
3. **Network Access → Add IP address → Allow access from anywhere (`0.0.0.0/0`).**
   Render's free plan has no fixed IP address, so this is needed. Your database is still protected by the strong password.
4. **Clusters → Connect → Drivers → Node.js.** Copy the connection string and:
   - put your password in place of `<db_password>`
   - add the database name `parampara` before the `?`

   ```
   mongodb+srv://parampara:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/parampara?retryWrites=true&w=majority&appName=Cluster0
   ```
   If the password has special characters (`@ : / ? #`), URL-encode them or generate one without them.

Atlas clusters are replica sets, so ParamPara's deletes (family, member, account) automatically run inside **transactions** there (all-or-nothing).

## 2. Cloudinary (optional, for photo uploads)

1. Sign up at <https://cloudinary.com/users/register_free>.
2. Dashboard → **Product environment credentials**: copy **Cloud name**, **API key** and **API secret**.
3. That is all. The server signs each upload; photos go straight from the browser to Cloudinary, are limited to 2000 px and stored under `parampara/<familyId>`.

Skip this and people can still paste photo links.

## 3. Brevo (optional, for "Forgot password" emails)

1. Sign up at <https://www.brevo.com>.
2. **Senders, domains & dedicated IPs → Senders → Add a sender.** Use an email you own (e.g. your Gmail) and verify it.
3. **SMTP & API → API keys → Generate a new API key.** Copy it (starts with `xkeysib-`).

Skip this and the "Forgot password?" link is hidden in production (users can still change their password from the account page).

> Tip: emails from a Gmail sender may land in spam. Once you buy a domain, verify it in Brevo (SPF/DKIM) and use `hello@yourdomain.com`.

## 4. Render (API + website)

1. Sign up at <https://render.com> with GitHub.
2. **New → Blueprint → choose your repository.** Render reads `render.yaml` and shows two services: `parampara-api` and `parampara-web`.
3. It asks for the values marked `sync: false`. Fill in:

   | Variable | Value |
   |---|---|
   | `MONGO_URI` | the Atlas string from step 1 |
   | `CLIENT_URL` | `https://parampara-web.onrender.com` (website address, see note) |
   | `VITE_API_URL` | `https://parampara-api.onrender.com/api` (API address **+ `/api`**) |
   | `EMAIL_PROVIDER` | `brevo` (or leave empty) |
   | `EMAIL_API_KEY` | Brevo API key (or empty) |
   | `MAIL_FROM` | the verified Brevo sender email (or empty) |
   | `CLOUDINARY_CLOUD_NAME` / `_API_KEY` / `_API_SECRET` | from step 2 (or empty) |

   `JWT_SECRET` is generated for you. `NODE_ENV=production` and `TRUST_PROXY=true` are already set.

   **Note on addresses:** Render names services `https://<service-name>.onrender.com`. If that name is taken, it adds a suffix (e.g. `parampara-api-x7k2.onrender.com`). After the first deploy, open each service, copy its real address, and fix `CLIENT_URL` (on the API) and `VITE_API_URL` (on the website) under **Environment**. Changing `VITE_API_URL` needs a redeploy of the website (**Manual Deploy → Clear build cache & deploy**), because it is baked in at build time.

4. Click **Apply**. The first build takes a few minutes.
5. Check:
   - `https://parampara-api.onrender.com/api/health` → `{"success":true,...,"version":"2.0.0"}`
   - `https://parampara-api.onrender.com/api/health/ready` → `"database":"connected"`
   - `https://parampara-api.onrender.com/api/config` → shows which optional features are on
   - Open the website, sign up, create a family.

### If something fails
| Symptom | Fix |
|---|---|
| API logs: `MongoServerSelectionError` / `bad auth` | Wrong password in `MONGO_URI`, or `0.0.0.0/0` missing in Atlas Network Access |
| API logs: `JWT_SECRET must be at least 32 characters` | You overwrote the generated secret. Use `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| Website loads but every request fails, browser console says CORS | `CLIENT_URL` on the API does not exactly match the website address (no trailing slash) |
| Website calls `/api/...` on its own address and gets 404 | `VITE_API_URL` was empty during the build. Set it and redeploy with cleared cache |
| Refreshing a page like `/families/...` shows "Not found" | The rewrite rule is missing. It is in `render.yaml`; for a manually created static site add Redirects/Rewrites: `/*` → `/index.html`, action *Rewrite* |
| Reset email never arrives | Check the API logs for `reset email failed`. Usually the sender is not verified in Brevo |

## 5. Keep the API awake (optional)

The free API sleeps after 15 minutes idle; the first visitor then waits about a minute. To avoid that:
1. Sign up at a free uptime monitor (e.g. UptimeRobot or cron-job.org).
2. Monitor `https://parampara-api.onrender.com/api/health` every **10 minutes**.

One always-on service uses about 720 of the 750 free hours a month, so this works for **one** free service only. Bonus: you get an email if the site goes down.

## 6. Custom domain (optional)

Buy a domain (e.g. `parampara.in`). In Render, open `parampara-web` → **Settings → Custom Domains**, add `parampara.in` and `www.parampara.in`, and create the DNS records it shows. Optionally add `api.parampara.in` to `parampara-api`. Then update:
- `CLIENT_URL` on the API → `https://parampara.in` (comma-separate to allow several: `https://parampara.in,https://www.parampara.in`)
- `VITE_API_URL` on the website → `https://api.parampara.in/api`, then redeploy it.

## 7. After launch

- **Backups:** the free cluster has limited backup options. Owners can download any family from **Sharing → Download archive**. For your own safety, run a weekly `mongodump` (MongoDB Database Tools) against the Atlas URI.
- **Logs:** Render → `parampara-api` → Logs. Every error shows a request id; users see the same id, so you can match their report to a log line.
- **API docs:** `https://parampara-api.onrender.com/api-docs`.
- **Updates:** push to GitHub; both services redeploy automatically (`autoDeploy: true`). The website only rebuilds when `frontend/` changes.
- **When to pay:** if the 1-minute wake-up hurts, move only the API to Render's paid instance (no sleep). If the database nears 512 MB, upgrade Atlas. Nothing in the code has to change.

## Alternative: website on Cloudflare Pages

Cloudflare Pages' free plan also allows commercial sites. Create a project from your repo with:
- Root directory: `frontend`
- Build command: `npm run build`, output directory: `dist`
- Environment variable: `VITE_API_URL=https://parampara-api.onrender.com/api`

With no `404.html` in the build, Pages already serves `index.html` for unknown paths, so page refreshes work. Then put the Pages address in `CLIENT_URL` on the API. Delete `parampara-web` from Render if you go this way.
