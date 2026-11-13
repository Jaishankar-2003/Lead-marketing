# 🚀 Scaled Local Business Discovery & Lead Generation System

An enterprise-grade, local, automated business lead generation and website audit system built with **Playwright** and **TypeScript**.

Engineered specifically for IT service providers offering:
- **Website Design & Development**
- **PC Repair & Workstation Maintenance**
- **Computer Networking, Wi-Fi & CCTV**
- **Annual Maintenance Contracts (AMC)**

---

## 🌟 Architecture & Discovery Enhancements

### 1. Intelligent Category Expansion
Instead of searching a single generic keyword like `"Retail shops"` (which caps results at 20–40), the engine automatically breaks down the category into 12+ commercial subcategories:
- Supermarkets & Departmental Stores
- Grocery & Provision Stores
- Clothing & Garment Stores
- Textile & Saree Showrooms
- Mobile Phone & Accessories Stores
- Electronics & Gadget Stores
- Computer & Laptop Dealers
- Hardware, Paints & Sanitary Stores
- Pharmacies & Medical Stores
- Furniture & Interior Showrooms
- Footwear & Shoe Showrooms
- Electrical Goods & Lighting

### 2. Geographical Micro-Grid Search
Subdivides the target locality into high-density commercial street grids:
- *Anna Nagar, Madurai*: 80 Feet Road, Kuruvikaran Salai, Sathamangalam, Ambika Theater Road, Melur Main Road, Housing Board Colony.
- Cross-queries each grid independently, multiplying discovery coverage by 5x–10x.

### 3. Search Provider Tracking Unwrapper (Fixes 0-Result Bug)
- **Bing Search**: Unwraps Bing's `https://www.bing.com/ck/a?...` base64 click-tracking redirects so destination domains are captured instead of discarded.
- **Google Search**: Unwraps `/url?q=...` redirects and handles modern organic DOM layouts.
- **DuckDuckGo**: Resolves browser lifecycle issues to prevent premature page terminations.
- **OpenStreetMap Overpass API**: Integrates public, free POI queries with strict timeouts.
- **Google Maps**: Continuous feed scroll with accurate category parsing (eliminates the `"category: Open"` bug).

### 4. Location Verification & Strict Filtering
Validates whether a discovered business actually belongs to the target neighborhood:
- `EXACT_AREA_MATCH`: Located directly within the target area or its recognized streets.
- `NEARBY_AREA_MATCH`: Located in an adjacent neighborhood (e.g. Sathamangalam, KK Nagar, Gomathipuram).
- `CITY_ONLY_MATCH`: Located elsewhere in the city (e.g. Simmakkal, Goripalayam).
- `LOCATION_UNVERIFIED`: Inconclusive address details.

### 5. Multi-Source Deduplication & Attribution
When multiple search providers discover the same business, their attributes are merged and all contributing sources are preserved:
- `sources: ["Google Maps", "Bing Search", "Justdial"]`

### 6. Evidence-Based Website Verification
- `VERIFIED_NO_WEBSITE`: Business was discovered on platforms that record websites (Google Maps, Justdial), but website is confirmed absent (Prime Web Dev lead!).
- `WEBSITE_FOUND`: Official website loaded and verified (200–399 HTTP).
- `WEBSITE_BROKEN`: Fatal error response (404, 500, or DNS failure).
- `WEBSITE_UNAVAILABLE`: Connection timeout or temporary network glitch (not classified as broken without evidence).
- `NEEDS_VERIFICATION`: Missing verification data.

### 7. Triple-Track Lead Scoring Engine (0–100)
1. **Website Dev Score**: Evaluates new website design opportunities (no website, broken site, non-mobile viewport, no SSL, outdated copyright).
2. **PC Repair Score**: Evaluates workstation repair needs (POS billing PCs, barcode printers, accounting workstations).
3. **Networking & AMC Score**: Evaluates multi-PC LAN, server setup, Wi-Fi, and annual maintenance contracts (supermarkets, schools, clinics, CA offices).

---

## 🛠️ Usage

### Default Command (Retail shops in Anna Nagar, Madurai)
```bash
npm run discover -- --category "Retail shops" --area "Anna Nagar" --city "Madurai" --country "India"
```

### Other Categories
```bash
# Healthcare & Medical Clinics
npm run discover -- --category "Clinics" --area "Anna Nagar" --city "Madurai"

# Schools & Coaching Institutes
npm run discover -- --category "Schools" --area "Anna Nagar" --city "Madurai"

# Professional Offices (CA, Legal, Logistics)
npm run discover -- --category "Offices" --area "Anna Nagar" --city "Madurai"

# Fast Scan (skips deep website auditing)
npm run discover -- --category "Retail shops" --quick
```

---

## 📁 Output Artifacts Saved

| File | Purpose |
|---|---|
| [`output/all_leads.csv`](file:///C:/Users/Ram%20prathees/Desktop/demos/output/all_leads.csv) | All discovered businesses with complete 28 columns |
| [`output/all_leads.json`](file:///C:/Users/Ram%20prathees/Desktop/demos/output/all_leads.json) | Complete hierarchical JSON dataset |
| [`output/qualified_leads.csv`](file:///C:/Users/Ram%20prathees/Desktop/demos/output/qualified_leads.csv) | High-value prospects meeting score criteria |
| [`output/qualified_leads.json`](file:///C:/Users/Ram%20prathees/Desktop/demos/output/qualified_leads.json) | Qualified leads in JSON format |
| [`output/websites.txt`](file:///C:/Users/Ram%20prathees/Desktop/demos/output/websites.txt) | Pure list of unique verified website URLs |

---

## 🔒 100% Free & Local
- No paid APIs, no proxies.
- Runs locally on your Windows PC via Playwright Chromium.

# Fast scan (skips deep website auditing for ultra-fast discovery):
npm run discover -- --category "Retail shops" --quick

# Specify number of expanded subcategories (default: 8):
npm run discover -- --category "Retail shops" --subcategories 12

# Run for other high-potential client sectors:
npm run discover -- --category "Clinics" --area "Anna Nagar" --city "Madurai"
npm run discover -- --category "Schools" --area "Anna Nagar" --city "Madurai"
npm run discover -- --category "Chartered Accountants" --area "Anna Nagar" --city "Madurai"