# OfferIQ - 3-Engine Real Estate Underwriter

## Overview

A comprehensive real estate deal underwriting application with three main engines for property valuation, offer calculation, and AI-powered negotiation planning. The app provides professional-grade analysis tools for wholesalers, flippers, and rental investors.

**Core Functionality:**
- **Underwriting Engine**: AVM blending (Zillow 45%, Redfin 35%, Other 20%), repair estimates, confidence scoring
- **Offer Calculation Engine**: Investor buy price, seller offer, 3-tier offer ladder (Fast Yes/Fair/Stretch with ±8% adjustments), deal grading (A/B/C/D)
- **Offer Presentation Engine**: AI-powered negotiation plans using Tony Robbins 6 Human Needs and DISC profiling with ethical guardrails
- localStorage autosave for all inputs
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
- `POST /api/ai/presentation` - Generate AI-powered negotiation plan with ethical guardrails

### Data Storage
- **Client Persistence**: localStorage for all deal inputs, settings, and AI results
- **Database**: PostgreSQL with Drizzle ORM (available for future features)
- **Schema Location**: `shared/schema.ts` contains Drizzle table definitions and Zod validation schemas

### Key Files
- `client/src/pages/deal-desk.tsx` - Main OfferIQ page with tabbed 3-engine layout
- `client/src/types.ts` - Complete type definitions for all engines
- `client/src/components/underwriting-section.tsx` - Underwriting inputs/outputs UI
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

### AI Ethical Guardrails
- DISC profiles presented as hypotheses, not diagnoses
- 6 Human Needs assessments include confirming questions
- No manipulation tactics, focus on win-win negotiations

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
