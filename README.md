# Symaptic

Colourful, shareable mind maps. React + React Flow on the front, **Firebase** for login and
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
| **Invite by email** | Owner adds emails with *Can view / comment / edit*. They get a branded email, and the map shows up under **Shared with me** once they sign in with that address (Google or magic link). |
| **Link sharing** | Off / view / comment / edit. Viewing needs no account; commenting and editing ask the visitor to sign in. |
| **Enforcement** | `firestore.rules` enforces roles on the server: editors can't change sharing settings, commenters can only touch comments. Emails are trusted only once verified. |
| **Invite API** | `api/invite.ts` verifies the caller's Firebase token and re-reads the map *as that user*, so only the owner can trigger emails, and only to people who already have access. No service-account key is needed. |

## Using the editor

| Action | How |
|---|---|
| Radial menu | **Right-click** an idea, a branch, a comment, or empty canvas |
| Grow an idea | Hover it and **click a +**, or **drag the +** to place it (drop it on another idea to link them) |
| Child / sibling | **Tab** / **Enter** |
| Edit text | **Double-click**, **F2** or **Space** |
| New free idea | Double-click empty canvas |
| Move a branch | Drag an idea; its children follow. Hold **Alt** to move it alone |
| Style | Select something and the style panel opens (colour, 10 shapes, fill, text size, border, branch thickness/curve/dash/arrow) |
| Comment | Right-click → Comment, or the dock button. It appears as a thought bubble |
| Tidy / Fit | Dock buttons |
| Undo / redo | ⌘Z / ⇧⌘Z |
| Delete | Delete / Backspace (removes the whole branch) |

## Project layout

```
src/
  pages/        Landing, Login, Dashboard, EditorPage
  editor/       MapEditor (canvas), IdeaNode, CommentNode, Edges, RadialMenu (+ colour wheel),
                Inspector (style panel), ops.ts (graph operations), layout.ts (tidy), useMapDoc.ts (sync)
  components/   ShareDialog, Logo
  lib/          firebase.ts, auth.tsx, store.ts (Firebase + local demo backends), palette.ts, types.ts
api/invite.ts   Vercel function that sends invite emails via Resend
firestore.rules Security rules to paste into Firebase
```
