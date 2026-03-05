# Navox Network Graph

**Map your professional network. Find your side door.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org)
[![Based on](https://img.shields.io/badge/Research-The%20Invisible%20Network%20(2026)-blue)](https://navox.tech)

A privacy-first network graph tool that helps job seekers — especially new graduates, immigrants, refugees, and career changers — understand, visualize, and activate their professional network.

**Upload your LinkedIn connections CSV. No server. No login. No data leaves your browser.**

---

## What it does

| Feature | Description |
|---|---|
| **Network Graph** | Force-directed visualization of all 1st-degree connections, colored by role category and tie strength |
| **Gap Analysis** | Identifies deficits in bridging capital vs. ideal distribution — tells you *which types* of connections you're missing |
| **Company Search** | Type any company name to find your "side door" connections, ranked by activation priority |
| **Outreach Queue** | Ranked list of who to contact this week, with draft messages calibrated to tie strength |

---

## The science behind it

This tool is a direct implementation of research from **[The Invisible Network (Yousif, 2026)](https://navox.tech)**, which synthesizes:

- **Granovetter (1973, 1983)** — Weak ties theory: acquaintances, not close friends, provide non-redundant job information
- **Rajkumar et al. (2022, Science)** — Causal experiment on 20M LinkedIn users confirming weak ties drive job mobility
- **Ryan (2011, 2023)** — Immigrant professional network dynamics
- **LinkedIn Economic Graph (2025)** — 1.1B members, 67M companies

### Tie strength model (corrected)

The previous model scored connections purely by recency (connected yesterday = 1.0, connected a year ago = 0.0). This is **backwards** relative to weak-ties theory.

The new model uses three components:

| Component | Weight | Proxy |
|---|---|---|
| Relationship depth | 40% | Duration of connection (peaks at ~2 years) |
| Bridging potential | 35% | Role category (Recruiters, Leadership, Founders rank highest) |
| Recency signal | 25% | Connection within last 6 months |

**Activation priority** ranks weak ties in bridge roles highest — not strong ties — because weak ties provide non-redundant information and access to different professional clusters.

---

## Quick start

```bash
git clone https://github.com/navox-labs/network-graph.git
cd network-graph
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## How to get your LinkedIn data

1. LinkedIn → Settings → Data Privacy
2. "Get a copy of your data"
3. Select **Connections** only
4. Request archive → download when ready (up to 24h)
5. Upload `Connections.csv`

Your data is parsed entirely in the browser using [PapaParse](https://www.papaparse.com/). Nothing is sent to any server.

---

## Stack

- **Next.js 14** (App Router)
- **react-force-graph-2d** — canvas-based force graph (handles 1000+ nodes)
- **PapaParse** — CSV parsing in-browser
- **TypeScript** throughout
- No database. No auth. No backend.

---

## Project structure

```
navox-network/
├── app/
│   ├── page.tsx          # Main orchestration, state management
│   ├── layout.tsx        # Root layout
│   └── globals.css       # Design system (CSS variables)
├── components/
│   ├── UploadScreen.tsx  # CSV upload with drag-and-drop
│   ├── TopBar.tsx        # Navigation + live stats
│   ├── GraphView.tsx     # Force graph with filtering + tooltips
│   ├── GapPanel.tsx      # Bridging capital gap analysis
│   ├── CompanySearch.tsx # Company/role/name search
│   └── OutreachQueue.tsx # Ranked activation targets + draft messages
└── lib/
    └── tieStrength.ts    # Core model: tie strength, gap analysis, search
```

---

## The populations this is built for

This tool is specifically designed for job seekers who are told to "just network" without being given the tools to understand that they already have a network:

- **New graduates** — rich in peer connections, poor in bridge connections to hiring authority
- **New immigrants** — existing network geographically mislocated; co-ethnic over-reliance produces funneling effect
- **Refugees** — facing simultaneous credential recognition, employment gap, and name-bias challenges in ATS systems
- **Career changers** — deep professional network perceived as irrelevant to new field; rarely is

---

## License

MIT — see [LICENSE](LICENSE).

Also see **[navox-labs/agent](https://github.com/navox-labs/agent)** — autonomous AI agent that matches jobs to your profile, drafts outreach, and manages your pipeline.

Built by [Navox Labs](https://navox.tech). Research by Nahrin Yousif.
