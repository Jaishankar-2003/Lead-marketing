# 📊 Local Business Lead Intelligence Dashboard

A modern, high-performance visualization and lead management dashboard for the automated **Business Discovery & Lead Qualification Pipeline**.

Designed as a dedicated, lightweight visualization layer that monitors and interprets generated pipeline files without modifying or interfering with the underlying Playwright scraping engine.

---

## 🌟 Key Features

* **Multi-File Dynamic Sync**: Dynamically discovers and syncs **ALL** lead datasets inside `output/` regardless of filename variations (e.g. `all_leads.json`, `all_leads_anna_med.json`, `all_leads_retail.json`, `qualified_leads_*.json`).
* **Instant One-Click SYNC**: Reads and validates all JSON and CSV files inside `output/`. Atomically refreshes metrics without hardcoded numbers, data appending, or page reloads.
* **Combined View + Per-File Filter**: View all discovered leads combined across multiple runs (e.g. 456 leads across medical clinics and preschools), or filter by specific source file (`all_leads.json`, `all_leads_anna_med.json`).
* **Separated Primary Datasets**:
  * **All Leads**: Searchable, filterable directory with 28 audit parameters, sorting, pagination, source file badges, and CSV export.
  * **Qualified Leads**: Commercial outreach interface prioritizing Web Design, PC Repair, and Network AMC prospects with click-to-call (`tel:`), click-to-email (`mailto:`), and one-click contact copying.
* **Triple-Track Opportunity Highlighting**: Visual indicators ranking leads across Web Design (0–100), PC Hardware (0–100), and Network AMC (0–100).
* **Comprehensive 8-Section Lead Drawer**: Deep inspection of technical DOM audits (viewport responsiveness, SSL security, response latency, legacy tags), social profiles, location status, and discovery source attribution.
* **Interactive Data Visualizations**: Recharts distributions for lead qualifications, website availability, engine yield, and commercial viability.
* **Dynamic Folder Switcher**: Modify the monitored output directory directly in the UI with safety checks and traversal protection.

---

## 🏗️ Architecture

```
dashboard/
├── backend/                  # Node.js + Express + TypeScript API
│   ├── src/
│   │   ├── services/         # Multi-file scanner, normalizer, in-memory cache, filtering
│   │   ├── routes/           # REST endpoints (/api/dashboard, /api/leads, /api/sync)
│   │   ├── types.ts          # Unified data models matching pipeline types
│   │   └── index.ts          # Unified server (serves API & pre-built frontend)
│   └── package.json
├── frontend/                 # React 18 + Vite + Tailwind + Recharts + Lucide
│   ├── src/
│   │   ├── components/       # Badges, StatCards, LeadTable, Drawer, Recharts
│   │   ├── pages/            # DashboardOverview, AllLeads, QualifiedLeads, Settings
│   │   └── services/         # Typed API client
│   └── package.json
└── README.md
```

---

## 🚀 Quick Start

### 1. Launch Unified Dashboard (Single Command)

The backend is configured to serve both the REST API and the pre-compiled frontend web application on port **3001**:

```bash
cd dashboard
npm start
```

Open your browser to:
👉 **`http://localhost:3001`**

---

### 2. Development Mode (with Hot Reloading)

If you wish to develop or modify the frontend with instant Vite HMR:

```bash
# Terminal 1: Start Backend API (Port 3001)
cd dashboard/backend
npm run dev

# Terminal 2: Start Frontend Dev Server (Port 5173 with proxy)
cd dashboard/frontend
npm run dev
```

Open your browser to:
👉 **`http://localhost:5173`**

---

## 🔄 Dynamic Multi-File Sync System

The dashboard automatically scans the configured directory and synchronizes **every** JSON and CSV file matching lead datasets:

| File Pattern | Description | Role |
| :--- | :--- | :--- |
| `all_leads*.json` / `*.csv` | All business discovery runs (e.g. `all_leads.json`, `all_leads_anna_med.json`) | Ingested into the **All Leads** collection |
| `qualified_leads*.json` / `*.csv` | Qualified sales prospects (e.g. `qualified_leads.json`, `qualified_leads_anna_med.json`) | Ingested into the **Qualified Leads** collection |

### Default Directory
```
/home/sri-jaya-shankaran/Downloads/demos/output/
```

### Changing the Output Directory
1. In the top navigation bar, click the folder path or the **Folder Edit** icon.
2. Enter any valid local directory path.
3. Click **Save & Reload**. The dashboard verifies the files, validates permissions, and instantly reloads your new dataset.
4. The **Settings & Sync** page provides a live health inspector showing every discovered file, its type, record count, file size, and timestamp.

---

## 📋 API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Backend service status and uptime |
| `GET` | `/api/dashboard` | Aggregated KPIs, charts, and sync status |
| `GET` | `/api/leads` | Paginated All Leads (with `search`, `area`, `category`, `datasetFile`, `websiteStatus`, `sortBy`, etc.) |
| `GET` | `/api/leads/qualified` | Paginated Qualified Leads (with `datasetFile`, `opportunityType`, etc.) |
| `GET` | `/api/leads/:id` | Full technical details for an individual business |
| `GET` | `/api/leads/export` | Download filtered records as CSV (`?qualifiedOnly=true&datasetFile=...`) |
| `GET` | `/api/config` | Current output path and list of all scanned files |
| `PUT` | `/api/config` | Change output directory path (body: `{ "outputDir": "..." }`) |
| `POST` | `/api/sync` | Re-scan directory, reload all files in-memory, return new KPIs |

---

## 🛠️ Data Normalization & Validation Strategy

1. **Multi-File Parity**: Scans all files in `output/`. For each base name (e.g. `all_leads_anna_med`), prefers JSON for the full object tree and validates against CSV.
2. **Per-File Tagging**: Each lead is tagged with `sourceFile` so you can view all leads combined OR filter down to a specific file run.
3. **Missing Field Unification**: `null`, `"N/A"`, and `"None"` are unified into clean null states so the UI displays fallback badges rather than breaking.
4. **Stale Data Preservation**: If a sync fails, previous valid in-memory data is retained, accompanied by a prominent **Stale Data Warning** banner.
5. **Zero Scraper Interference**: The scraping engine in `src/website-discovery/` is untouched and never triggered during synchronization.


npm run discover -- --category "Schools" --area "Anna Nagar" --city "Madurai"
npm run discover -- --category "Chartered Accountants" --area "Anna Nagar" --city "Madurai"  
