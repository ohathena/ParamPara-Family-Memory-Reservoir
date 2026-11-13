# ParamPara frontend

React + Vite + Tailwind CSS + React Router + Axios.

## Run
1. Start the backend first (`cd ../backend && npm run dev`, port 5000).
2. `npm install`
3. `npm run dev` -> open http://localhost:5173

In development, `/api` calls are proxied to `http://localhost:5000` (see `vite.config.js`).
For production, set `VITE_API_URL` (see `.env.example`) to your hosted backend URL + `/api`, then `npm run build`.

## Screens
Landing, Sign up, Log in, Dashboard (my families), Create/Edit family, Family page (members, relationships, collaborators),
Add/Edit member, Memory list (search, category filter, sort, pagination), Memory form, Memory detail.
