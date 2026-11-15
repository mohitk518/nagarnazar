# NagarNazar · नगर नज़र

**Your city, under watch. Every complaint tracked, every fix proven.**
**आपका शहर, आपकी नज़र। हर शिकायत ट्रैक, हर काम का सबूत।**

Team SANT — Mohit Katara (Team Lead) · Built for **RunUp Coders Hackathon 2026** (Round 2) · Formerly "Civic Tracker" · Pilot city: Ratlam, Madhya Pradesh

- **Live app:** https://nagarnazar.lovable.app
- **GitHub:** https://github.com/mohitk518/nagarnazar
- **What changed in this hackathon:** [New in RunUp Coders Hackathon 2026](#new-in-runup-coders-hackathon-2026)

---

## The problem

In small Indian cities, a pothole, an overflowing garbage point or a dead streetlight is usually reported by a phone call, a WhatsApp forward or a paper application. The citizen gets no reference number, no idea which department owns the problem, and no proof that anything was fixed. Officials, on the other hand, cannot see which wards keep complaining, which complaints are overdue, or where to send field workers first.

## The solution: Click → Route → Prove

1. **Click** — the citizen takes a photo. GPS location, ward and city are detected; the problem can also be spoken in Hindi or English.
2. **Route** — the complaint goes automatically to the right department with a deadline (SLA). Overdue complaints escalate.
3. **Prove** — a complaint is closed only with an after-repair photo. Anyone can open the public complaint page (or scan its QR poster) and see the before/after proof and the full timeline.

Target users: citizens, municipal officers / city admins and field workers in small Indian cities.

## Key features

**Citizens**
- Photo + GPS + voice complaint, step-by-step report flow, Hindi and English interface
- Duplicate warning (same category within ~300 m in the last 7 days)
- Public complaint page with a unique ID (e.g. `CT-142`), live status, deadline countdown, timeline, QR poster and before/after photos
- Upvote, "I have seen this too" verification, comments, rating, points and badges, polls
- Works offline for drafts and can be installed as an app
- Privacy page and self-service account deletion

**Officials and field workers**
- City-scoped admin panel (row-level security), ward-wise complaint view, worker assignment, field-worker job page
- After-repair photo required to resolve, merge duplicates, automatic escalation
- AI weekly/monthly reports, trend predictions, CSV/PDF export

**Planners / public**
- Live map with clusters and heatmap, public dashboard, accountability scores

## New in RunUp Coders Hackathon 2026

Everything below was built between 15 and 24 November 2026; the commit dates on GitHub are the record. Everything else in this README was **pre-existing** in the earlier Civic Tracker project (see [Project history & credits](#project-history--credits)).

- **Rebrand to NagarNazar** — new name, Hindi name, tagline, PWA manifest, meta tags, poster/share text and footer in both languages; old competition material removed.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, TanStack Start + TanStack Router, Vite |
| UI | Tailwind CSS 4, shadcn/ui (Radix UI), lucide-react, framer-motion, sonner |
| Data | TanStack Query, Supabase JS client |
| Maps | Leaflet, react-leaflet, Leaflet.markercluster, Leaflet.heat, OpenStreetMap |
| Charts | Recharts |
| Backend | Supabase (Postgres + row-level security, Auth, Storage, Realtime) on Lovable Cloud |
| Server logic | TanStack Start server routes in `src/routes/api/public/fn` and server functions in `src/lib/*.functions.ts` |
| AI | Google Gemini (2.5 Flash, 2.5 Flash-Lite, 3 Flash preview) through the Lovable AI Gateway, server-side only |

### Where AI (Gemini) is used

| Server function | What it does |
|---|---|
| `analyze-image` | Suggests a category from the complaint photo (the citizen must confirm it) |
| `generate-summary` | Short summary and priority check after submission |
| `analyze-sentiment` | Tone/urgency score |
| `voice-stt`, `voice-transcribe` | Speech to text (Hindi/Hinglish) and structuring a spoken complaint |
| `civic-chat` | Chat assistant that answers from live complaint data |
| `predict-trends`, `generate-admin-report` | Two-week forecasts and AI insights in admin reports |
| `whatsapp-webhook` | Test-mode WhatsApp intake |

## Architecture

```mermaid
flowchart LR
    U[Citizen / officer / worker\nphone browser or installed PWA] --> A[NagarNazar web app\nReact + TanStack Start]
    A -->|anon key + RLS| S[(Supabase\nPostgres · Auth · Storage · Realtime)]
    A --> F[Server functions\n/api/public/fn]
    F -->|service role, server only| S
    F --> G[Google Gemini\nvia Lovable AI Gateway]
    A --> M[Leaflet + OpenStreetMap]
```

## Run locally

Prerequisites: Node.js 20+ and Bun (or npm), a Supabase project, and a Lovable AI Gateway key for the Gemini features.

```bash
git clone https://github.com/mohitk518/nagarnazar.git
cd nagarnazar
bun install            # or: npm install
cp .env.example .env   # fill in your own values — never commit .env
bun run dev            # or: npm run dev
```

Other scripts:

```bash
bun run build    # production build
bun run test     # unit tests (Vitest)
bun run lint     # ESLint
```

Database: apply the SQL in `drizzle/migrations` to a fresh Supabase project. The Platform Super Admin is identified by `app_config.root_admin_user_id`, never by email.

### Configuration

| Variable | Where | Purpose |
|---|---|---|
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID` | Browser | Public project URL and publishable (anon) key |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` | Server | Backend access for server functions |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Used only on the server (e.g. account deletion). Never shipped to the browser |
| `LOVABLE_API_KEY` | Server only | Gemini through the Lovable AI Gateway |
| `TWILIO_API_KEY`, `TWILIO_FROM_NUMBER` | Server only | Optional real SMS |

No real keys are stored in this repository.

## Security and privacy

- Row-level security on every table; city admins only manage their own city.
- Phone/WhatsApp numbers are column-restricted and never public; anonymous reporting hides the reporter's name.
- Integrity triggers stop clients from faking status changes, points, escalations or audit logs; rate limits on reporting.
- Photos are stored in a private bucket and validated by real image bytes before they are served.
- See [SECURITY.md](SECURITY.md) and the pre-hackathon audit reports in [docs/](docs/).

## Project history & credits

NagarNazar is built on an earlier civic-complaint platform developed by Mohit Katara with Divyansh Mathur. The features listed under 'New in RunUp Coders Hackathon 2026' were developed during this hackathon.

The earlier project (named "Civic Tracker") already had: photo/GPS/voice complaints, duplicate warning, department routing with deadlines and escalation, worker assignment, public complaint pages with QR and before/after proof, map and heatmap, Gemini features, points/badges/polls, multi-city admin, Hindi/English, and the security work documented in `docs/`. Earlier versions of ward routing, offline drafts, the privacy page and AI retries also existed; what was added or rebuilt on top of them during the hackathon is listed in the "New in" section.

## AI assistance and libraries disclosure

- **In the product:** Google Gemini via the Lovable AI Gateway. AI results are suggestions that a citizen or official confirms.
- **Building the product:** code was written with AI assistance (Lovable and Claude), directed and reviewed by Team SANT.
- **Libraries/APIs:** listed in the tech stack above and in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Map data © OpenStreetMap contributors (ODbL).

## License

MIT — see [LICENSE](LICENSE).
