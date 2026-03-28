# HealthMoni — Vital Signs Monitoring & AI Health Assistant

HealthMoni is a real-time health monitoring application that tracks vital signs (Heart Rate, Temperature, and HRV) and provides intelligent insights using AI.

## 🚀 Key Features

- **Real-time Monitoring**: Connect and pair medical devices (via simulated Bluetooth/QR) for live vital sign tracking.
- **AI Health Assistant**: Chat with an AI assistant powered by **Cloudflare Workers AI** to discuss symptoms and health data.
- **Intelligent Reports**: Generate comprehensive health analysis reports (daily/weekly/monthly) and export them to PDF.
- **Smart Alerts**: Automated system to flag potential health concerns based on clinical thresholds.
- **Historical Analysis**: Visual charts and tables to track health trends over time.

## 🛠️ Technology Stack

- **Frontend**: Vite, React, TypeScript, Tailwind CSS, shadcn-ui, Framer Motion.
- **Backend & Auth**: Supabase.
- **AI Infrastructure**: Cloudflare Workers AI (Llama 3.1).
- **PDF Generation**: jsPDF & jsPDF-AutoTable.

## 📦 Getting Started

### 1. Installation
```sh
npm install
```

### 2. Environment Setup
Create a `.env` file in the root directory:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
```

### 3. Edge Functions Deployment
Deploy the AI logic to your Supabase project:
```sh
npx supabase secrets set CLOUDFLARE_ACCOUNT_ID=your_id
npx supabase secrets set CLOUDFLARE_API_TOKEN=your_token
npx supabase functions deploy chat generate-report symptom-analysis --project-ref your_project_ref
```

### 4. Run Development Server
```sh
npm run dev
```

## 🏗️ Architecture

- `src/components`: UI components built with shadcn/ui.
- `src/lib`: Core logic including `auth-context`, `device-context`, and AI streaming.
- `src/pages`: Main application routes.
- `supabase/functions`: Backend Edge Functions proxying AI requests to Cloudflare.

---
*Disclaimer: HealthMoni is for informational purposes only and does not constitute medical advice.*
