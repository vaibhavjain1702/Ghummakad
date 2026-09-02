# Ghummakad — AI Travel Itinerary Planner

A pure-Python, AI-powered travel itinerary planner that generates optimized, constraint-safe day-wise trip plans using **fuzzy logic**, **CSP**, **A\*** state-space search, **genetic mutation**, and the **Gemini API** — served by **FastAPI** with a vanilla-JS frontend.

> ℹ️ This project was migrated from React + TypeScript to a pure Python backend with full behavioral parity (identical algorithms, prompts, and output shapes).

---

## 🌟 Overview

Enter a destination, dates, budget, interests, pace, and must-visit places — get back:

- Day-by-day itineraries with timed activities and transport legs
- Flight & hotel recommendations (full-trip mode)
- Budget- and time-feasible schedules
- Transparent AI reasoning: constraint analysis, search strategy, fuzzy-logic parameters, state-vector knowledge-base signature, and genetic-algorithm status
- One-click "remix" that mutates a day's genotype into an alternate variant

---

## 🧠 Key AI Components (`planner.py`)

- **Fuzzy Logic Personalization** — converts user pace (Relaxed / Moderate / Fast-paced) into scheduling parameters: max activities/day, downtime %, average activity duration, and travel buffer.
- **Constraint Satisfaction Problem (CSP) Solver** — validates budget (total vs daily), time windows, must-visit inclusion, and interest filtering; produces a violations report.
- **A\* State-Space Search** — optimizes each day's activity ordering with Haversine distances; prunes infeasible branches and selects the highest-utility goal node.
- **Genetic Mutation Engine** — replaces ~40% of a day's activities with same-category alternatives to produce remix variants.
- **State-Vector Hash** — deterministic 32-bit hash signature of each itinerary ("knowledge base" fingerprint).

## 🤖 Gemini Pipeline (`gemini_service.py`)

Calls `gemini-3.6-flash` via the `google-genai` SDK with a strict JSON schema to fetch one flight recommendation, one hotel recommendation, and 25–35 raw candidate activities, then assembles the final itinerary through the planner pipeline.

## 🗂 Data Layer (`models.py`)

Pydantic models mirroring the original TypeScript types: user preferences, flights, hotels, activities, itinerary days, and agent reasoning.

## 🖥 Frontend (`templates/index.html` + `static/`)

Vanilla JavaScript + Tailwind CDN single page — form, loading spinner, reasoning panel, flight/hotel cards, day cards, and remix controls. No build step required.

---

## 📦 Setup

```bash
git clone https://github.com/vaibhavjain1702/Ghummakad.git
cd Ghummakad
python3 -m pip install -r requirements.txt
```

## 🔑 Configuration

Create a `.env` file in the project root:

```
GEMINI_API_KEY=your_google_ai_studio_key
```

Get a key from [Google AI Studio](https://aistudio.google.com/apikey).

## ▶️ Run

```bash
python3 main.py
# or equivalently:
uvicorn main:app --host 0.0.0.0 --port 3000
```

Then open **http://localhost:3000**

---

## 🔌 API Endpoints

| Method | Path            | Description                                                        |
|--------|-----------------|--------------------------------------------------------------------|
| GET    | `/`             | Serves the web UI (Jinja2 template)                                |
| POST   | `/api/generate` | Generates a full itinerary from user preferences (JSON body)       |
| POST   | `/api/remix`    | Mutates an existing itinerary day into an alternate variant        |

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  FastAPI (main.py) — port 3000                              │
│  ├─ GET  /              → Jinja2 template (templates/)      │
│  ├─ POST /api/generate  → gemini_service.generate_itinerary │
│  └─ POST /api/remix     → gemini_service.mutate_itinerary   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  gemini_service.py — Gemini 3.6-flash + JSON schema         │
│  ├─ Fuzzy logic (planner.apply_fuzzy_logic)                 │
│  ├─ CSP solver (planner.CSPSolver)                          │
│  ├─ A* search (planner.StateSpaceSearch)                    │
│  ├─ Genetic mutation (planner.mutate_activities)            │
│  └─ State-vector hash (planner.generate_state_vector)       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  models.py — Pydantic data layer (camelCase ↔ snake_case)   │
└─────────────────────────────────────────────────────────────┘
```

---

## 📝 License

MIT — see [LICENSE](LICENSE) if present.

---

## 🏗 Architecture

```
TravelPlanner/
├── main.py               # FastAPI app: routes, Jinja2 templating, uvicorn entrypoint
├── models.py             # Pydantic data layer (preferences, itinerary, reasoning)
├── planner.py            # Fuzzy logic · CSP solver · A* search · mutation · state vector
├── gemini_service.py     # Gemini API pipeline (flight/hotel/activities → itinerary)
├── requirements.txt      # fastapi, uvicorn, google-genai, pydantic, jinja2, ...
├── templates/
│   └── index.html        # Web UI shell (Tailwind CDN)
└── static/
    ├── app.js            # Form handling, API calls, state management
    └── ui.js             # Rendering: itinerary, reasoning panel, cards
```

Request flow: **UI → FastAPI → gemini_service (Gemini fetch) → planner (fuzzy → CSP filter → per-day A* → assembly) → JSON response → vanilla-JS renderer**