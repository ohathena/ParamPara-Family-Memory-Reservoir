# ParamPara frontend

React 19 + Vite + Tailwind CSS 4 + React Router + Axios. No UI or icon library: icons are inline SVG.

## Run
1. Start the backend first (`cd ../backend && npm run dev`, port 5000).
2. `npm install`
3. `npm run dev` -> open http://localhost:5173

In development, `/api` calls are proxied to `http://localhost:5000` (see `vite.config.js`).
For production, set `VITE_API_URL` to your hosted backend URL + `/api`, then `npm run build` (see `../DEPLOY.md`).

## Design (v2)
A family ledger (*bahi*): white paper, kumkum red for actions, indigo ink for text, a marigold thread for lineage lines.
Tokens live in `src/index.css` (`@theme`). Display type is Rozha One (self-hosted via @fontsource, Latin ~18 kB; the Devanagari
file only downloads on pages that show Devanagari text). Body text uses the system font, so nothing else is downloaded.

## Structure
- `components/ui.jsx` – icons, avatar (photo or initials), tags, layout with mobile menu and "server waking up" banner
- `components/LineageTree.jsx` – the tree: groups couples, orders children under parents, measures card positions and draws the lines
- `components/PhotoInput.jsx` – signed upload to Cloudinary, or paste a link
- `components/Confirm.jsx` – accessible confirm dialog (`<dialog>`), replaces `window.confirm`
- `components/ErrorBoundary.jsx` – one crashed page does not blank the app; asks to reload after a new deploy
- `ConfigContext.jsx` – which optional server features are on (uploads, reset email)
- `pages/*` – each page is lazy loaded; the main bundle is ~108 kB gzipped, pages are 1–3 kB each

## Behaviour worth knowing
- Memory list filters live in the URL (shareable, back button works)
- Viewers never see add/edit buttons; the server enforces the same rules
- Images from Cloudinary are requested at the size they are shown (thumbnails in lists)
- A request that takes more than 4 s shows the wake-up banner (free hosting sleeps when idle)
- Respects reduced motion; the only animation is the landing tree drawing its lines once
