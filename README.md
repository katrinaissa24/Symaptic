# Symaptic

Shareable mind maps for teams. React + React Flow on the front, **Firebase** for login and
storage, and a single **Vercel** function that sends invite emails through **Resend**.

```
npm install
npm run dev        # http://localhost:5173
```

Without Firebase keys the app runs in **demo mode**: you pick any name and email, and maps are
saved in your browser only. That's handy for trying the editor. Follow the steps below to turn on real
accounts and sharing.

---

## 1. Firebase (login + database), about 10 minutes

1. Go to <https://console.firebase.google.com> → **Add project** (Analytics: off is fine).
2. **Project settings → Your apps → Web (`</>`)** → register an app → copy the config values into a
   new `.env` file (copy `.env.example`):
   ```
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_APP_ID=...
   ```
3. **Build → Authentication → Get started → Sign-in method**:
   - enable **Google**
   - enable **Email/Password**, then switch on **Email link (passwordless sign-in)** inside it
   - enable **Anonymous**. This lets people start mapping, or comment through a shared link, without signing up.
     Guests can sign in later and keep everything they made.
4. **Authentication → Settings → Authorized domains**: add your production domain later
   (e.g. `symaptic.vercel.app`). `localhost` is already there.
5. **Build → Firestore Database → Create database** (production mode, any region).
   Then open the **Rules** tab, paste the contents of [`firestore.rules`](firestore.rules) and **Publish**.

Restart `npm run dev`. You now have real accounts, saving, and live collaboration.

## 2. Resend (invite emails), about 5 minutes

1. Sign up at <https://resend.com> → **API Keys → Create** → copy it.
2. **Domains → Add domain** and add the DNS records it shows you.
   Until a domain is verified, Resend only delivers to *your own* email address.
3. You'll put `RESEND_API_KEY` and `EMAIL_FROM` (e.g. `Symaptic <invites@yourdomain.com>`) into Vercel.

## 3. Deploy on Vercel

1. Push this folder to GitHub, then **vercel.com → Add New → Project → import it**
   (the Vite preset is detected automatically).
2. **Settings → Environment Variables**: add all four `VITE_FIREBASE_*` values plus
   `RESEND_API_KEY`, `EMAIL_FROM` and `FIREBASE_PROJECT_ID` (same as `VITE_FIREBASE_PROJECT_ID`).
3. Deploy, then add the Vercel domain to Firebase's **Authorized domains** (step 1.4).

To test invite emails locally, run `npx vercel dev` instead of `npm run dev` (it serves `/api` too).

---

## How sharing works

| | |
|---|---|
| **Invite by email** | Owner adds emails with *Can view / comment / edit*. They get an email, and the map shows up under **Shared with me** once they sign in with that address (Google or magic link). |
| **Link sharing** | Off / view / comment / edit. Viewing needs no account; commenting and editing ask the visitor to sign in. |
| **Enforcement** | `firestore.rules` enforces roles on the server: editors can't change sharing settings, commenters can only touch comments. Emails are trusted only once verified. |
| **Invite API** | `api/invite.ts` verifies the caller's Firebase token and re-reads the map *as that user*, so only the owner can trigger emails, and only to people who already have access. No service-account key is needed. |
| **Presence** | Everyone with a map open appears in the top bar, with their live pointer and selection on the canvas. Each open tab writes one small document under `docs/{id}/presence/` (pointer updates are coalesced to 4 per second, a heartbeat every 20 s; entries older than 45 s are ignored). `firestore.rules` lets anyone who can read the map read presence and lets people write only their own entry. Re-publish the rules after upgrading. In demo mode presence works between tabs of the same browser. |

## Using the editor

Press **?** in the editor for the full list. The essentials:

| Action | How |
|---|---|
| Add a child / sibling idea | **Tab** / **Enter** on a selected idea, or the **+** buttons next to it (drag a + to place the idea or link it to another) |
| Edit text | **Double-click** or **F2**; **Mod+Enter** finishes, **Esc** cancels |
| New free idea | **N**, or double-click the canvas |
| Move a branch | Drag an idea; its children follow. Hold **Alt** to move it alone |
| Select many | Drag a box on the canvas, **Shift**-click, or **Mod+A** |
| Copy / paste / duplicate | **Mod+C** / **Mod+V** / **Mod+D** |
| Style | Select something and the **Style** panel opens (colour, fill, shape, border, text, branch) |
| Comment | **C** with an idea selected, or right-click → Comment |
| Context menu | Right-click an idea, branch, comment or the canvas (long-press on touch) |
| Tidy / Fit | **T** / **Shift+1**; zoom with the wheel, **Mod+±**, or the control in the corner |
| Pan | **Space**+drag, middle-drag, the Hand tool (**H**), or one finger on touch |
| Command palette | **Mod+K** |
| Undo / redo | **Mod+Z** / **Mod+Shift+Z** |

## Design system

Every colour, size, radius, shadow and duration is a CSS variable in
[`src/styles/tokens.css`](src/styles/tokens.css) (light and dark). Reusable primitives live in
`src/components/ui` (Button, Input, Select, Popover, Tooltip, Dialog, Menu, Slider, Segmented,
Toggle, Stepper, Toast, Avatar), built on Radix UI so keyboard and screen-reader behaviour is handled.
Icons are Lucide at one size and stroke width. The theme follows the system and can be switched in
the account menu.

Maps saved before the redesign keep their data untouched; `src/editor/compat.ts` maps their
legacy shapes, font sizes and branch widths to the current look when they're drawn.

The invite email cannot use CSS variables, so `npm run tokens` (run automatically by `npm run build`)
extracts the light-theme colours from `tokens.css` into `api/_tokens.json`, which the email reads.

## Performance tooling

```
npm run build && npx vite preview --port 4173 &
npm run perf -- --sizes 5,100,500 --label mine   # frame times, render counts, typing latency
npm run lighthouse -- --label mine               # Lighthouse over landing, My maps, editor
npm run smoke                                    # scripted interaction checks
node scripts/smoke-presence.mjs                  # two tabs: avatars, live cursor, remote selection
npm run lighthouse -- --preset mobile --label m  # slow 4G + 4× CPU slowdown
node scripts/axe.mjs                             # axe accessibility scan
node scripts/seed.mjs 500 > map.json             # a 500-idea map for manual testing
```

Results from the redesign are in [`scripts/results`](scripts/results).

## Project layout

```
src/
  pages/        Landing, Login, Dashboard (My maps), EditorPage, NotFound
  editor/       MapEditor (canvas), IdeaNode, CommentNode, Edges, EditorTopBar, Toolbar, Inspector,
                menus (context menus), CommandPalette, ShortcutsDialog, ops.ts (graph operations),
                layout.ts (tidy), snap.ts (alignment guides), viewport.ts, compat.ts, useMapDoc.ts (sync)
  components/   ui/ primitives, ShareDialog, AccountMenu, MapThumb, Toast, Skeleton
  lib/          firebase.ts, auth.tsx, store.ts (Firebase + local demo backends), palette.ts,
                templates.ts, theme.ts, types.ts
  styles/       tokens.css, base.css, ui.css, editor.css, chrome.css, pages.css, landing.css
api/invite.ts   Vercel function that sends invite emails via Resend
scripts/        seed, perf, lighthouse, axe, smoke and screenshot tooling; results/ holds the numbers
firestore.rules Security rules to paste into Firebase
```
