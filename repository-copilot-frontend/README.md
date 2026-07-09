# Repository Copilot — Frontend

A production-grade frontend for an AI-powered GitHub repository assistant. Built to sit in front of
an existing FastAPI backend without touching its endpoints or business logic.

This app talks to exactly three backend routes, unchanged:

- `POST /clone` — `{ url }` → `{ session_id, repo_name }`
- `POST /chat` — `{ session_id, question }` → `{ answer }`
- `GET /sessions` — → `[{ id, repo_name, url }]`

## Stack

React 18 · Vite · TypeScript · TailwindCSS · Radix primitives (shadcn-style) · React Query · Axios ·
React Markdown + remark-gfm + rehype-highlight · Framer Motion · React Router · Lucide icons.

## Getting started

```bash
npm install
cp .env.example .env   # point VITE_API_BASE_URL at your FastAPI backend if not proxying
npm run dev
```

By default, `vite.config.ts` proxies `/api/*` to `http://localhost:8000` in development, so a local
FastAPI server started with `uvicorn main:app --reload` needs no extra configuration.

For production, set `VITE_API_BASE_URL` to your deployed backend origin and run `npm run build`.

## Design notes

The visual identity leans into the subject: a dark, IDE-adjacent palette (`ink` / `panel` / `elevated`)
with a violet primary accent, an amber "build" accent, and git-inspired green/red semantic colors.
Headings use Space Grotesk, UI text uses Inter, and anything referencing code, repo names, or session
IDs uses JetBrains Mono. The sidebar's repository cards carry the app's signature element: a small
language-color dot plus a deterministic "commit rhythm" sparkline, echoing GitHub's own contribution
graph without copying it literally.

## Project structure

```
src/
  components/
    Sidebar/          Sidebar, RepositoryCard
    TopBar/            Breadcrumb-style session header
    ChatWindow/        ChatWindow, ChatMessage, MessageInput, TypingIndicator
    RepositoryInput/   Clone URL input
    LoadingScreen/      Staged indexing progress
    ModelSelector/      Future-ready model dropdown (only GPT-4.1 wired up)
    SettingsDialog/     Settings + About modal
    ThemeToggle/         Dark/light switch
    RightPanel/          Repository information panel
    ui/                  Button, Dialog, Select, Switch, Tooltip, Skeleton
  hooks/
    useSessions.ts        GET /sessions on load
    useCloneRepository.ts POST /clone + staged progress simulation
    useChat.ts             POST /chat + per-session history + simulated streaming
  services/api.ts         Axios client + endpoint wrappers + error classification
  lib/store.tsx           App-wide state: sessions, active session, chat histories, theme, UI flags
  types/                  Chat.ts, Session.ts, Repository.ts
  pages/Home.tsx          Assembles sidebar + center panel + right panel
```

## Notes on backend contract

- Chat history is not exposed by `GET /sessions`, so this frontend keeps per-session message history
  client-side (persisted to `localStorage`) and replays it when you switch repositories. Reloading the
  page keeps history; a fresh backend session naturally starts empty.
- The backend returns a single JSON answer rather than a token stream, so the "streaming" effect in the
  chat is a client-side reveal of the completed answer, matching the brief's explicit allowance to
  simulate streaming when the backend doesn't provide it.
- The five-stage clone progress ("Cloning Repository…" → "Repository Ready") is cosmetic and timer-driven
  while the real `POST /clone` request is in flight, then reconciles with the actual response the moment
  it returns — no fake data is shown once a result exists.
