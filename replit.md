# SignalLayerOS - GTM Intelligence System

## Overview
SignalLayerOS is an internal GTM intelligence system for AgentLayerOS. It helps identify high-intent SMB buyers, route them to the correct AI Employee, and generate sales intelligence AND content from the same signals.

**Not customer-facing** - this is an internal operating system.

## System Architecture

### Three Stages
1. **Signal Detection** - ICP-qualified pain discovery from research sources (Manus, etc.)
2. **Lead Scoring + Routing** - Score leads 1-5, route to best AI Employee
3. **Dual Output** - Export to Google Sheets for outreach + weekly content for ContentLayerOS

### Target ICP
- Founders, Operators, COOs, Heads of Ops, Revenue Owners
- 5-100 person companies (SMB)
- US-based
- Growing faster than systems
- Paying close to the money
- Exhausted by coordination + fragile human roles

### Pain Signals Detected
- Coordination overload (follow-ups, handoffs, dependency)
- Turnover/role fragility (rehiring, quitting, ghosting)
- Inbound friction (missed calls, slow responses)
- Revenue proximity (leads, deals, pipeline mentioned)

### Exclusions
- Enterprise procurement language
- Governance-first questions
- AI curiosity without pain
- Tool comparisons
- Meta-agent enthusiasm

## Tech Stack

### Frontend
- React + TypeScript
- Wouter for routing
- TanStack Query for data fetching
- Shadcn UI components
- Tailwind CSS with dark theme

### Backend
- Express.js
- In-memory storage (MemStorage)
- Zod validation

## Pages

| Path | Component | Description |
|------|-----------|-------------|
| `/` | Dashboard | Overview with stats, recent leads/signals |
| `/signals` | Signals | View all detected pain signals |
| `/leads` | Leads | Scored leads with AI Employee routing |
| `/content` | Content | Insights and weekly content runs |
| `/ingest` | Ingest | Upload research data (JSON or single form) |

## API Endpoints

### Stats
- `GET /api/stats` - System statistics

### Signals
- `GET /api/signals` - All signals
- `GET /api/signals/recent` - Recent signals (limit 10)
- `POST /api/signals` - Create single signal (auto-scores and routes)
- `POST /api/signals/bulk` - Bulk import signals

### External Ingestion (Automated)
- `POST /api/ingest/external` - Secure endpoint for automated signal ingestion
  - **Headers Required**:
    - `X-API-Key`: Must match `INGEST_API_KEY` secret
    - `X-Source`: Optional, defaults to "Manus"
  - **Body**: Same JSON schema as bulk import (`{ "signals": [...] }`)
  - **Features**:
    - API key authentication
    - Idempotency (skips duplicates based on name + pain quote)
    - Logs source for tracking
  - **Response**: `{ signalsCreated, duplicatesSkipped, leadsCreated, insightsCreated }`

### Leads
- `GET /api/leads` - All scored leads
- `GET /api/leads/recent` - Recent leads (limit 10)
- `POST /api/leads/export` - Export leads directly to Google Sheets
  - **Body**: `{ "spreadsheetId": "your-sheet-id" }`
  - Requires Google Sheets integration to be connected
  - Automatically adds headers on first export
  - Marks exported leads to avoid duplicates

### Vertical Intelligence
- `GET /api/verticals/rank` - Ranked industries by aggregated pain score
  - **Query params**: `?range=7d|30d` (optional, defaults to all time)
  - Groups leads by industry, calculates total/avg pain scores, counts Score 5 and 4+ leads
  - Returns top 10 industries sorted by totalPainScore DESC, tie-breaker countScore5 DESC
  - Includes dominant pain signal per industry

### Vertical Cluster Detection
- `GET /api/verticals/clusters` - Detect industries with rapidly increasing pain signals
  - **Cluster Criteria** (all must be met):
    - >= 5 leads in last 14 days (windowA)
    - Average score >= 3.5
    - At least 2 score-5 leads
    - Growth rate > 50% vs previous 14 days (windowB = 14-28 days ago)
  - **Growth Rate**: `(windowA - windowB) / max(windowB, 1)`
  - **ClusterStrength**:
    - High = avgScore > 4 AND score5Count >= 3
    - Medium = avgScore > 3.5
    - Emerging = growthRate > 1 but lower scores
  - Sorted by strength (High > Medium > Emerging), then avgScore DESC

### Focused Vertical
- `GET /api/verticals/focus` - Get current focused vertical
  - Returns `{ focusedVertical: string | null }`
- `POST /api/verticals/focus` - Set focused vertical for content generation
  - **Body**: `{ "industry": "Veterinary Clinics" }` (or null to clear)
  - Automatically injected into ContentLayerOS generation prompts as `[Vertical Focus: ...]` tag

### Content
- `GET /api/insights` - All content insights
- `GET /api/content-runs` - All weekly content runs
- `POST /api/content-runs/generate` - Generate weekly LinkedIn + X drafts (includes focused vertical tag if set)
- `POST /api/content-layer/ingest` - ContentLayerOS ingestion endpoint

## Lead Scoring Model

**Base**: Every qualified signal starts at 2

**Modifiers** (+1 each):
- Coordination overload detected
- Turnover/fragility detected
- Inbound friction detected
- Revenue proximity detected

**Score Meanings**:
- 5 = Emotionally obvious buyer
- 3-4 = Strong follow-up candidate
- 1-2 = Content insight only

## AI Employee Routing

8 AI Employees available for routing:
1. Inbound Revenue Agent
2. Appointment Reminder + Rescheduler
3. Lead Reactivation Agent
4. Outbound Prospector
5. Email Automation Specialist
6. Support Response Agent (Omni-Channel)
7. Call Feedback (MEDDIC) & Follow-Up Engine
8. Marketing Coordinator

**Tie-breakers**:
- Revenue-impacting agents win
- Inbound beats outbound
- Fastest relief wins

## Content Generation

### Insight Themes
- Coordination pain
- Turnover fatigue
- Inbound friction

### Post Angles
- Contrarian
- Story
- Lesson
- Quiet win

### Weekly Run
- Generates 2 LinkedIn drafts
- Generates 2 X (Twitter) drafts
- Preserves raw language
- Does not over-polish
- Content sounds inevitable, not promotional

## System Principles

- Signal detection is pain-based, not AI-based
- AI Employee language appears only in routing and recommendation
- No user-facing configuration
- Fewer, better leads > volume
- Relief > intelligence
- Reliability > novelty
- Execution > explanation

## File Structure

```
client/src/
├── components/
│   ├── app-sidebar.tsx      # Navigation sidebar
│   ├── theme-provider.tsx   # Dark/light theme
│   └── theme-toggle.tsx     # Theme switcher
├── pages/
│   ├── dashboard.tsx        # Main dashboard
│   ├── signals.tsx          # Signals view
│   ├── leads.tsx            # Leads view
│   ├── content.tsx          # Content insights
│   └── ingest.tsx           # Data ingestion
└── App.tsx                  # Main app with routing

server/
├── routes.ts               # API endpoints
├── storage.ts              # In-memory storage
└── scoring.ts              # Lead scoring + routing logic

shared/
└── schema.ts               # TypeScript types + Zod schemas
```
