# Nex AI — Multi-Model AI Chatbot PWA

Your favorite AI models — OpenAI, Anthropic, and OpenRouter — in one thoughtful, installable space. A fully functional progressive web app built with Next.js 16, React 19, Tailwind CSS 4, and Drizzle ORM.

## Features

- **Multi-model chat** — Switch between OpenAI (GPT-4o / 4.1), Anthropic (Claude Sonnet 4 / Haiku 4.5), and OpenRouter (GPT, Claude, Gemini) anytime
- **Bring your own key** — Paste an API key in Model settings (session only), or configure server-side keys via environment variables
- **Installable PWA** — Add to your home screen on Android/desktop Chrome; works offline as an app shell with a service worker
- **Conversation history** — Chats persist per browser in PostgreSQL
- **AI Assistants** — Translator, Writing Assistant, Code Companion, Life Coach presets
- **Explore page** — Handpicked feature cards and prompt starters
- **Voice input & read-aloud** — Speech recognition and speech synthesis
- **File attachments** — Attach text/code files (up to 40 KB) to your messages
- **Polished UI** — Warm dark theme, markdown rendering, responsive sidebar, toasts, offline banner

## Deploy in 3 steps (free)

This app has a backend (API routes + PostgreSQL), so it needs a serverless host — **Vercel** is the natural home for Next.js. GitHub Pages only serves static files and will not work here.

### 1. One-click deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FGshanak%2Fnex-ai-chatbot-pwa&env=DATABASE_URL&envDescription=PostgreSQL%20connection%20string%20from%20Neon)

### 2. Create a free PostgreSQL database

1. Go to [neon.tech](https://neon.tech) and sign up (free, ~1 minute)
2. Create a project and copy the **connection string**
3. In the Vercel deploy screen, paste it as the `DATABASE_URL` environment variable
4. Deploy

### 3. Create the database table

After deploying, run the migration once from your machine:

```bash
git clone https://github.com/Gshanak/nex-ai-chatbot-pwa.git
cd nex-ai-chatbot-pwa
npm install
DATABASE_URL="your-neon-connection-string" npx drizzle-kit push
```

That's it — your PWA is live. Open the URL on your phone, tap the browser menu, and choose **Add to Home screen** to install it.

## Local development

```bash
npm install
cp .env.example .env.local      # add your DATABASE_URL
npx drizzle-kit push            # create the conversations table
npm run dev                     # http://localhost:3000
```

## API keys

Either set them server-side (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `OPENROUTER_API_KEY` in Vercel project settings), or just open the app → Settings → Models & connection → paste your key. Keys pasted in the UI are kept only for the current browser session and are sent directly to your chosen provider.

## Project structure

```
├── public/
│   ├── manifest.webmanifest    # PWA manifest
│   ├── sw.js                   # Service worker (app-shell caching)
│   ├── icons/                  # App icons (192 / 512 / maskable)
│   └── images/                 # Feature card images
├── src/
│   ├── app/
│   │   ├── api/chat/route.ts           # Chat proxy (OpenAI/Anthropic/OpenRouter)
│   │   ├── api/conversations/route.ts  # History list & delete
│   │   ├── api/health/route.ts         # Health check
│   │   ├── layout.tsx          # Root layout with PWA metadata
│   │   ├── page.tsx            # Full app UI
│   │   └── globals.css         # Theme & styles
│   ├── db/                     # Drizzle ORM schema & client
│   └── lib/                    # Model catalog & session
├── drizzle.config.json
└── package.json
```

## Tech stack

- Next.js 16 (App Router) · React 19 · TypeScript
- Tailwind CSS 4 · lucide-react · react-markdown
- Drizzle ORM + PostgreSQL (pg)
- Vanilla service worker + web app manifest (PWA)
