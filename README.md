# LeadPilot – Lead Generation & CRM Platform

LeadPilot is a lightweight, local Lead Generation and CRM platform tailored for freelance **PC Repair / IT Support Services** and **Website Design & Development Services** in **Madurai, Tamil Nadu, India** (and expandable across India).

It integrates headless **Playwright browser automation** with a modern **Next.js CRM dashboard** backed by **PostgreSQL** and **Prisma ORM**.

---

## 🚀 Key Features

### 1. Lead Discovery & Playwright Automation Control
- **Keyword Generator**: Pre-configured query builder for Madurai and Tamil Nadu cities (Chennai, Coimbatore, Trichy, Salem, etc.) covering IT support, computer repair, laptop services, and web development.
- **Custom Keywords**: Easily add, select, remove, or bulk-toggle keywords.
- **Full Lifecycle Controls**: **START**, **PAUSE**, **RESUME**, **STOP**, and **RETRY** directly from the web dashboard.
- **Fault-Tolerant Checkpoints**: Keyword-level checkpoints stored in PostgreSQL. Paused or interrupted jobs resume from the exact checkpoint without repeating completed searches.
- **Crash & Restart Recovery**: Background worker process tracks state and recovers gracefully if interrupted.
- **Live Monitoring**: Real-time progress bar, live discovery/duplicate/saved counters, and timestamped activity terminal.

### 2. Evidence-Based Lead Categorization
- Automatically classifies leads without making subjective assumptions:
  - 🔧 **PC Support Prospect**: Verified hardware, repair, and IT support category keywords.
  - 💻 **Website Development Prospect**: Established business with phone/location but no public website.
  - ✨ **Both Services**: Hardware/IT business that also lacks an online presence.
  - 🏢 **General Business**: Verified business with existing registered website.

### 3. Website Intelligence & Enrichment (Playwright Crawler)
- On-demand or automated crawling of business websites using Playwright:
  - Website availability (`ONLINE`, `UNREACHABLE`, `TIMEOUT`).
  - SSL/TLS security detection (`HTTPS Valid` vs `Insecure/HTTP`).
  - Homepage title extraction.
  - Automatic detection of `/about` and `/contact` page URLs.
  - Regex extraction of public business emails and direct phone numbers.

### 4. Full-Featured CRM Pipeline
- **Visual Kanban Board**: Manage deals through 7 stages:
  `New` $\rightarrow$ `Researched` $\rightarrow$ `Contacted` $\rightarrow$ `Interested` $\rightarrow$ `Follow-Up` $\rightarrow$ `Won` $\rightarrow$ `Lost`.
- **Communication Timeline**: Log phone calls, emails, client meetings, and notes with timestamps.
- **Follow-Up Scheduler**: Set next follow-up dates and track last contacted dates.
- **Lead Profile Editor**: Edit company information, address, phone, email, and notes.

### 5. CSV Import & Export with Deduplication
- **Intelligent CSV Import**: Automatically maps standard headers (`Business Name`, `Company`, `Phone`, `Mobile`, `Website`, `Category`, `City`, `Address`).
- **Deduplication Engine**: Automatically identifies duplicates by normalized phone number and website domain.
- **CSV Export**: One-click download of all leads or filtered subsets.

---

## 🛠 Technology Stack

- **Frontend**: Next.js 14 (App Router), React 18, Tailwind CSS, Lucide Icons.
- **Backend**: Node.js, TypeScript, REST API routes.
- **Database**: PostgreSQL with Prisma ORM.
- **Automation**: Playwright (Headless Chromium) with Page Object Model (`pom/gmap_pom.ts`).
- **Data Engine**: PapaParse for CSV import/export.

---

## 💻 Windows Setup & Installation Instructions

Follow these steps to run LeadPilot on your Windows PC:

### 1. Prerequisites
1. **Node.js (v18 or v20+)**: Download from [nodejs.org](https://nodejs.org/) and install.
2. **PostgreSQL (v14+)**:
   - Download the Windows installer from [enterprisedb.com/downloads/postgres-postgresql-downloads](https://www.enterprisedb.com/downloads/postgres-postgresql-downloads).
   - During installation, note the superuser password (e.g. `postgres`).
   - Ensure the PostgreSQL service is running in Windows Services (`services.msc`).
   - Create a database named `leadpilot` using pgAdmin or Command Prompt:
     ```cmd
     psql -U postgres -c "CREATE DATABASE leadpilot;"
     ```

### 2. Project Installation
Open **PowerShell** or **Command Prompt** inside the project folder:
```powershell
# 1. Install dependencies
npm install

# 2. Install Playwright browser binaries
npx playwright install chromium

# 3. Configure .env file
# Create a .env file with your PostgreSQL connection:
# DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/leadpilot?schema=public"
```

### 3. Sync Database Schema
```powershell
npx prisma db push
```

### 4. Seed Initial Sample Leads (Optional)
```powershell
npx tsx prisma/seed.ts
```

### 5. Start the Application
```powershell
npm run dev
```

Open your browser at **[http://localhost:3000](http://localhost:3000)**.

---

## 🐧 Linux / macOS Setup

```bash
# 1. Install dependencies & Playwright browsers
npm install
npx playwright install chromium

# 2. Start PostgreSQL (initializes workspace database automatically)
npm run db:start
# or: ./scripts/db-start.sh

# 3. Sync database schema
npm run db:push

# 4. (Optional) Seed sample Madurai leads
npm run db:seed

# 5. Start development server
npm run dev

# (To stop PostgreSQL when done)
npm run db:stop
```

---

## 📖 How to Use LeadPilot

### 1. Discovery & Keyword Generation
1. Go to **Lead Discovery** from the sidebar.
2. Choose your target city (e.g. `Madurai`).
3. Select a category preset (`IT Support & PC Repair`, `Website Design & Development`, or `All Target Services`) or add custom keywords.
4. Check or uncheck individual keywords.
5. Click **START COLLECTION**.
6. Watch the live progress bar, discovered counters, and activity terminal.
7. Use **PAUSE**, **RESUME**, or **STOP** whenever needed.

### 2. Managing Leads in the CRM
1. Go to **All Leads** to view, search, and filter leads by city, category, website availability, or CRM status.
2. Click **Details** on any lead to open its profile.
3. Review the **Business Opportunity Analysis** badge explaining why the lead was classified as PC Support, Web Dev, or Both.
4. Click **Enrich Website** to trigger Playwright to crawl the company's site for emails, phone numbers, and HTTPS status.
5. Log outreach activities (Calls, Emails, Meetings) in the **Communication & Activity Log**.
6. Set the **Next Follow-Up Date** and update the deal stage.
7. Switch to the **CRM Pipeline** tab to drag/move deals across stages.

### 3. CSV Import & Export
- **Exporting**: Click **Export CSV** on the All Leads page to download all currently filtered leads.
- **Importing**: Click **Import CSV**, select any CSV file from a business directory or client list, and click **Run Import**. LeadPilot will parse the columns, skip existing phone/domain duplicates, and add the new leads directly into PostgreSQL.

### 4. Multi-Channel Lead Outreach & Gmail SMTP Setup
LeadPilot includes an integrated Outreach Hub (`/outreach`) supporting:
- **Individual & Bulk Email Campaigns**: Individualized emails per recipient (never CC/BCC) with dynamic placeholders (`{{businessName}}`, `{{contactName}}`, `{{city}}`, `{{website}}`, `{{email}}`, `{{phone}}`, `{{serviceName}}`), recipient audit (valid/missing/duplicate/invalid/opt-out), configurable batch size and delays, and Pause/Resume/Stop controls.
- **WhatsApp Click-to-Chat (`wa.me`)**: Auto-normalizes Indian 10-digit numbers to `+91` and provides both single-lead modals and a sequential guided bulk queue with explicit send confirmation.
- **Follow-Ups & Opt-Out Compliance**: Schedule follow-ups (`Pending` / `Overdue` / `Completed`) and honor one-click signed unsubscribe links (`/unsubscribe`) and manual Do-Not-Contact flags.

#### How to Configure Gmail SMTP (Google App Password)
1. Enable **2-Step Verification** on your Google Account (Google Account → Security).
2. Under **2-Step Verification → App passwords**, create a new App Password (for example, `LeadPilot`). Copy the generated 16-character password.
3. Add the following server-only variables to your `.env` file (do **not** commit `.env`):

```env
EMAIL_PROVIDER="gmail_smtp"
EMAIL_FROM="LeadPilot Team <yourname@gmail.com>"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="yourname@gmail.com"
SMTP_PASSWORD="your-16-char-google-app-password"
UNSUBSCRIBE_SECRET="replace-with-a-random-long-secret-string"
```

4. Restart the application server (`npm run dev` or `npm run start`).
5. Open **Outreach Hub → Gmail SMTP Settings** and click **Test SMTP Connection & Delivery** (optionally enter a test recipient address) to verify TLS authentication and delivery before launching campaigns.
6. If STARTTLS on port `587` is blocked by a firewall, LeadPilot can also use implicit TLS with `SMTP_PORT="465"` and `SMTP_SECURE="true"`.

> **Sending Limits Note:** Standard Gmail accounts enforce daily sending limits (typically ~500 emails/day for `@gmail.com` or higher for Google Workspace). Keep `batchSize` moderate (e.g., `10`) and configure intervals (e.g., `2500ms`+) to minimize throttling.

---

## ⚖️ Legal & Data Reuse Compliance

- **Google Maps Data Notice**: Bulk extraction from Google Maps is subject to Google Terms of Service (Section 3.2.3). LeadPilot provides this provider strictly for local personal research and private testing.
- **Authorized Sustainable Collection**: For commercial lead storage, LeadPilot provides:
  1. Direct company website enrichment via public web crawling adhering to rate limits and robots.txt.
  2. CSV import of authorized public directories and government registers (e.g., MCA/MSME public lists for Tamil Nadu).
  3. Pluggable directory providers.
- **Zero Bot Bypassing**: LeadPilot does not bypass CAPTCHAs, bot shields, or authentication barriers.

---

## 🧪 Verification & Testing

To run the complete automated end-to-end verification suite:

```bash
npm run test:e2e
# or: sucrase-node scripts/test-phase6-e2e.ts
```

This verifies:
- Dashboard metrics and REST API endpoints.
- Automation state machine (START $\rightarrow$ PAUSE $\rightarrow$ RESUME $\rightarrow$ STOP $\rightarrow$ RETRY).
- PostgreSQL checkpoint persistence and deduplication.
- CRM stage transitions and activity log timeline.
- Playwright website intelligence and enrichment crawler.
- CSV import with duplicate rejection and CSV export.
- Preservation of original Playwright POM and test specs.

only

# 2. Start PostgreSQL (initializes workspace database automatically)
npm run db:start
# or: ./scripts/db-start.sh

# 3. Sync database schema
npm run db:push

# 4. (Optional) Seed sample Madurai leads
npm run db:seed

# 5. Start development server
npm run dev

# (To stop PostgreSQL when done)
npm run db:stop