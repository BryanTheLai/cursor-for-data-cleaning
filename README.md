# RytFlow - Cursor for Financial Data Cleaning

The autonomous financial firewall for Ryt Bank. A excel data cleaning interface with Cursor-style Tab-to-fix UX and WhatsApp integration for missing field resolution.

## Tech Stack

- **Framework:** Next.js 15.5.6 (App Router)
- **Core Library:** React 18.3.1
- **Grid Engine:** TanStack Table v8 (Headless UI)
- **Language:** TypeScript (Strict mode)
- **UI Components:** Shadcn UI (Radix Primitives)
- **Styling:** Tailwind CSS
- **State Management:** Zustand
- **Positioning:** Floating UI
- **AI Models (Future):**
  - **Groq (llama-3.1-70b):** Speed Layer (Formatting)
  - **Anthropic (Claude 3.5 Sonnet):** Logic Layer (PDFs/Reasoning)
- **Integration (Future):** Twilio (WhatsApp API)

## Features

### Traffic Light Cell System
- ⚪ **White:** Clean data
- 🟡 **Yellow:** AI suggestion available - Press Tab to accept
- 🟠 **Orange:** Duplicate/history warning
- 🔴 **Red:** Critical issue (missing data, sanctions, mismatch)
- 🟣 **Purple:** Live update from WhatsApp
- 🟢 **Green Border:** Validated against external source

### Keyboard Shortcuts
- **Tab:** Accept suggestion and jump to next error
- **Escape:** Reject suggestion and close popover
- **Arrow Keys:** Navigate grid

### WhatsApp Integration
- Request missing data via WhatsApp
- Mobile-friendly verification form at `/verify/[uuid]`
- Real-time updates when data is received

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Environment Variables

Create a `.env.local` file in the root directory:

```bash
# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
DEMO_MODE=true  # Set to 'false' for production with real Twilio

# Supabase (Database + Realtime)
# Get from: https://supabase.com/dashboard/project/_/settings/api
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Twilio (WhatsApp) - Required for production
# Get from: https://console.twilio.com/
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886  # Sandbox number

# Groq (AI)
# Get from: https://console.groq.com/keys
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxx
```

### Twilio WhatsApp Setup

**Sandbox (Development):**
1. Sign up at [Twilio Console](https://console.twilio.com/)
2. Go to **Messaging > Try it out > Send a WhatsApp message**
3. Follow the sandbox setup - send "join <sandbox-code>" from your phone
4. Get your Account SID and Auth Token from the dashboard
5. The sandbox number is `whatsapp:+14155238886`

**Production:**
1. Apply for WhatsApp Business API via Twilio
2. Get a dedicated WhatsApp number
3. Update `TWILIO_WHATSAPP_NUMBER` in `.env.local`

**Webhook Configuration:**
1. In Twilio Console, go to **Messaging > Settings > WhatsApp Sandbox**
2. Set "When a message comes in" webhook URL to:
   ```
   https://your-domain.com/api/whatsapp/webhook
   ```
3. Method: `POST`

**Demo Mode:**
- Set `DEMO_MODE=true` to test without real Twilio
- WhatsApp requests are stored in memory
- Use the form link to simulate user responses

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Main grid page
│   ├── layout.tsx            # Root layout
│   ├── globals.css           # Global styles
│   └── verify/[uuid]/        # WhatsApp verification form
├── components/
│   ├── grid/                 # DataGrid, GridCell, AISuggestionPopover
│   ├── sidebar/              # Sidebar, LegendPanel, WhatsAppPanel, HistoryPanel
│   ├── header/               # Header component
│   └── ui/                   # Shadcn UI primitives
├── store/
│   └── useGridStore.ts       # Zustand store for grid state
├── data/
│   └── mockData.ts           # Seeded demo data
├── types/
│   └── index.ts              # TypeScript types
└── lib/
    └── utils.ts              # Utility functions
```

## Demo Scenarios

The mock data includes examples of all cell states:

1. **AI Fix (Yellow):** Names like "mr. ali ahmad" → "Ali Ahmad", amounts like "rm 5,000" → "5000.00"
2. **Duplicate (Orange):** Matching previous transactions in history
3. **Critical (Red):** Missing fields, sanctioned entities, high-value alerts
4. **Validated (Green):** Matched against PDF invoices
5. **Live Update (Purple):** Simulated WhatsApp replies

## Hackathon Tracks

1. **Cursor:** Best Project (Tab-to-fix UX)
2. **Anthropic:** Best Use of Claude (Complex Financial Reasoning)
3. **Vercel:** Speed/Performance (Next.js 15 + Server Actions)
4. **Ryt Bank:** Best Fintech Solution (Preventing Double Payments & Fraud)

## Future Enhancements

- [ ] Real Groq/Claude API integration
- [ ] PDF upload and OCR comparison
- [ ] Twilio WhatsApp webhook integration
- [ ] Vercel Postgres for persistence
- [ ] File upload (Excel/CSV parsing)
- [ ] Bulk payment submission

## License

MIT
