# 🩺 HealthMoni — Intelligent Vital Signs Monitoring

**HealthMoni** is a modern, production-ready health monitoring platform built with **React**, **Supabase**, and **Cloudflare Workers AI**. It provides real-time tracking of critical vitals with AI-driven analysis and reporting.

---

## 🚀 Key Features

### 📡 Real-time Vital Tracking
- Track **Heart Rate**, **Body Temperature**, and **HRV** (Heart Rate Variability) in real-time.
- Visual dashboards with interactive **Recharts** for historical trend analysis.
- Seamless device pairing and simulation.

### 🤖 AI Health Assistance
- **AI Chat**: Discuss your symptoms and vitals with an AI health assistant powered by **Cloudflare Workers AI (Llama 3.1)**.
- **Symptom Analyzer**: Get a technical breakdown of reported symptoms correlated with your live vitals data.
- **Smart Reports**: Generate comprehensive daily/weekly/monthly health summaries with one click.

### 📑 Professional Reporting
- Export detailed health analyses to **PDF format** with built-in vitals tables and insight summaries.
- Historical report storage integrated with **Supabase Database**.

---

## 🛠️ Technology Stack

| Part | Technology |
| :--- | :--- |
| **Frontend** | React, TypeScript, Vite, Tailwind CSS |
| **UI Components** | Radix UI, shadcn/ui, Framer Motion |
| **Backend & Auth** | Supabase (Authentication & PostgreSQL) |
| **AI Layer** | Cloudflare Workers AI via Supabase Edge Functions |
| **Visualization** | Recharts (Live charts) |
| **PDF Engine** | jsPDF & jsPDF-AutoTable |

---

## 📦 Setting Up Locally

### 1. Prerequisites
- Node.js (v18+)
- Supabase Project (Database & Auth)
- Cloudflare API Credentials (for AI features)

### 2. Installation
```bash
git clone https://github.com/b4d5hub/healthmoni.git
cd healthmoni
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root/dev-environment:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
```

### 4. Deploying Edge Functions
The AI features require standard Supabase Edge Functions. Deploy them using the Supabase CLI:
```bash
# Set your Cloudflare secrets in Supabase
npx supabase secrets set CLOUDFLARE_ACCOUNT_ID=xxxx --project-ref your_ref
npx supabase secrets set CLOUDFLARE_API_TOKEN=xxxx --project-ref your_ref

# Deploy the functions
npx supabase functions deploy chat generate-report symptom-analysis --project-ref your_ref
```

### 5. Running the App
```bash
npm run dev
```

---

## 🏗️ Project Structure

- `/src/pages` - Core application views (Landing, Dashboard, AI Reports, etc.)
- `/src/components` - Reusable UI elements and dashboard widgets.
- `/src/lib` - Context providers (`AuthContext`, `DeviceContext`) and streaming logic.
- `/supabase/functions` - Backend logic for AI integration.

---

## ⚠️ Medical Disclaimer
*HealthMoni is a proof-of-concept health monitoring tool intended for informational and educational purposes only. It is not a medical device and should not be used as a substitute for professional medical advice, diagnosis, or treatment.*
