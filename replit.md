# OfferIQ - 3-Engine Real Estate Underwriter

## Overview

A comprehensive real estate deal underwriting application with three main engines for property valuation, offer calculation, and AI-powered negotiation planning. The app provides professional-grade analysis tools for wholesalers, flippers, and rental investors.

**Core Functionality:**
- **Underwriting Engine**: AVM blending (Zillow 45%, Redfin 35%, Other 20%), repair estimates, confidence scoring
- **Offer Calculation Engine**: Investor buy price, seller offer, 3-tier offer ladder (Fast Yes/Fair/Stretch with ±8% adjustments), deal grading (A/B/C/D)
- **Offer Presentation Engine**: AI-powered negotiation plans using Tony Robbins 6 Human Needs and DISC profiling with ethical guardrails
- **User Management**: Replit Auth (OIDC) with login/logout, saved deals per user
- **Saved Deals**: CRUD operations for deal analyses stored in PostgreSQL, accessible from /deals dashboard
- localStorage autosave for all inputs (fallback when not logged in)
- JSON export and copy-to-clipboard functionality

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript, using Vite as the build tool
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: React useState for local state with localStorage persistence
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming

**Design Pattern**: 3-Engine Architecture with pure functions for calculations
- `client/src/lib/engines/underwriting.ts` - AVM blending, repair estimates, confidence scoring
- `client/src/lib/engines/offer-calculation.ts` - Investor buy price, offer ladder, sensitivity analysis, deal grading

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript compiled with tsx for development, esbuild for production
- **API Structure**: RESTful endpoints under `/api/` prefix
- **AI Integration**: OpenAI API (via Replit AI Integrations) for negotiation plan generation

**Key Endpoints:**
- `POST /api/property/valuation` - Fetch property details and RentCast AVM estimates
- `POST /api/comps` - Fetch comparable sales data from RentCast AVM endpoint
- `POST /api/ai/presentation` - Generate AI-powered negotiation plan with ethical guardrails
- `GET /api/deals` - List user's saved deals (auth required)
- `GET /api/deals/:id` - Get single saved deal (auth required)
- `POST /api/deals` - Create saved deal (auth required)
- `PATCH /api/deals/:id` - Update saved deal (auth required)
- `DELETE /api/deals/:id` - Delete saved deal (auth required)
- `PATCH /api/deals/:id/archive` - Toggle archive/restore (auth required)
- `/api/login` - Replit Auth OIDC login
- `/api/logout` - Replit Auth OIDC logout
- `/api/auth/user` - Get current authenticated user

### Data Storage
- **Client Persistence**: localStorage for all deal inputs, settings, and AI results (fallback)
- **Database**: PostgreSQL with Drizzle ORM for users, sessions, and saved deals
- **Schema Location**: `shared/schema.ts` re-exports from `shared/models/auth.ts` and `shared/models/savedDeals.ts`
- **Auth**: Replit Auth (OIDC) with passport, sessions stored in PostgreSQL

### Key Files
- `client/src/pages/deal-desk.tsx` - Main OfferIQ page with tabbed 3-engine layout
- `client/src/pages/saved-deals.tsx` - Saved deals dashboard with CRUD operations
- `client/src/pages/compare-deals.tsx` - Side-by-side deal comparison page
- `client/src/types.ts` - Complete type definitions for all engines (includes ComparableSale, CompsData)
- `client/src/components/underwriting-section.tsx` - Underwriting inputs/outputs UI with comps integration
- `client/src/components/comps-section.tsx` - Comparable sales display with sortable table and statistics
- `client/src/components/offer-calc-section.tsx` - Offer calculation with sliders and ladder
- `client/src/components/offer-presentation-section.tsx` - AI presentation generator

### Build Configuration
- Development: `tsx server/index.ts` with Vite middleware for HMR
- Production: esbuild bundles server code, Vite builds client to `dist/public`
- Path aliases: `@/` maps to client/src, `@shared/` maps to shared/

## Calculation Logic

### AVM Blending
- Zillow: 45% weight
- Redfin: 35% weight
- Other: 20% weight
- Values normalized if any input is 0

### Wholesale Formula
The wholesale calculation uses a specific formula:
```
Wholesale Price = (ARV × (1 - closingCostPct)) - (ARV × profitPct) - Repairs
```
- **ARV**: After Repair Value (manual input or from AVM blend)
- **closingCostPct**: 6-12% adjustable (default 8%)
- **profitPct**: 13-20% risk-based slider
- **Repairs**: Manual repairs estimate used directly (no contingency added)

Example: ARV $175k, profit 20%, closing 8%, repairs $75k = $51k wholesale price

### Offer Ladder
- Fast Yes: +8% above Fair price (for quick closes, motivated sellers)
- Fair: Baseline calculated offer
- Stretch: -8% below Fair price (for flexible sellers, distressed properties)

### Deal Grading
- A: High confidence (≥80%), high margin (≥30%), adequate buffers
- B: Medium confidence (≥60%), decent margin (≥20%)
- C: Lower confidence or margin
- D: Risky deal requiring careful consideration

### Comparable Sales Analysis
- Auto-fetched when property data is loaded
- Uses RentCast AVM endpoint's `comparables` array (up to 15 comps)
- Statistics: Avg $/Sqft, Median Price, Avg Price, Suggested ARV
- Sortable table by price, sqft, $/sqft, distance, sold date
- "Use Suggested ARV" button auto-populates Manual ARV field

### User-Submitted Comps
- Users can add their own comparable sales manually (address, price, sqft, beds/baths, sold date)
- Confidence slider (0-100%) weights user comps vs API comps for ARV calculation
- Blending formula: `blendedARV = (userARV × confidence%) + (apiARV × (100% - confidence%))`
- At 100% confidence, only user comps are used; at 0%, only API comps
- Sortable table, statistics (Avg $/SqFt, Avg Price, Your ARV)
- Data persisted to localStorage

### AI Ethical Guardrails
- DISC profiles presented as hypotheses, not diagnoses
- 6 Human Needs assessments include confirming questions
- No manipulation tactics, focus on win-win negotiations

### PDF Export & Sharing
- **Download PDF**: Generate and download presentation plan as PDF locally
- **Save & Share**: Upload PDF to Replit Object Storage and get a shareable link
- **Unique Links**: Each saved presentation gets a unique URL (`/api/presentations/:id/pdf`)
- **Library**: Uses jsPDF for client-side PDF generation
- **Storage**: PDFs stored in Replit Object Storage with in-memory metadata tracking

**Key Endpoints:**
- `POST /api/presentations/save` - Save presentation PDF to object storage, returns unique link
- `GET /api/presentations/:id/pdf` - Serve saved PDF by ID
- `GET /api/presentations/:id` - Get presentation metadata
- `GET /api/presentations` - List all saved presentations

## External Dependencies

### AI Services
- **OpenAI API**: Used through Replit AI Integrations
- Model: gpt-4o for negotiation plan generation
- Fallback: Stub responses when API keys are not configured

### Key npm Dependencies
- `drizzle-orm` / `drizzle-zod`: Database ORM and schema validation
- `zod`: Runtime type validation
- `wouter`: Client routing
- Radix UI primitives: Accessible component foundations
- `framer-motion`: Animations

### Design System
- Font families: Inter (UI text), Roboto Mono (numerical data)
- Professional SaaS styling per `design_guidelines.md`
- Component styling: shadcn/ui new-york style variant
