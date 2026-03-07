# OfferIQ - 3-Engine Real Estate Underwriter

## Overview

A comprehensive real estate deal underwriting application with three main engines for property valuation, offer calculation, and AI-powered negotiation planning. The app provides professional-grade analysis tools for wholesalers, flippers, and rental investors.

**Core Functionality:**
- **Underwriting Engine**: AVM blending (Zillow 45%, Redfin 35%, Other 20%), repair estimates, confidence scoring
- **Offer Calculation Engine**: Investor buy price, seller offer, 3-tier offer ladder (Fast Yes/Fair/Stretch with +/-8% adjustments), deal grading (A/B/C/D)
- **Offer Presentation Engine**: AI-powered negotiation plans using Tony Robbins 6 Human Needs and DISC profiling with ethical guardrails
- **User Management**: Replit Auth (OIDC) with login/logout, saved deals per user
- **Subscription Tiers**: Free Trial (3 deals, 2 AI), Basic $29/mo (10 deals, 5 AI/mo), Premium $79/mo (unlimited)
- **Saved Deals**: CRUD operations for deal analyses stored in PostgreSQL, accessible from /deals dashboard
- **Feedback System**: In-app feedback dialog (bug/feature/other) stored in PostgreSQL
- **Analytics Tracking**: Event-based analytics stored in analytics_events table
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
- **Error Boundary**: Global ErrorBoundary in App.tsx catches rendering errors with fallback UI

**Design Pattern**: 3-Engine Architecture with pure functions for calculations
- `client/src/lib/engines/underwriting.ts` - AVM blending, repair estimates, confidence scoring (with safeNum/safeDivide guards)
- `client/src/lib/engines/offer-calculation.ts` - Investor buy price, offer ladder, sensitivity analysis, deal grading (with NaN/Infinity guards)

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript compiled with tsx for development, esbuild for production
- **API Structure**: RESTful endpoints under `/api/` prefix
- **AI Integration**: OpenAI API (via Replit AI Integrations) for negotiation plan generation
- **Rate Limiting**: express-rate-limit with global (100/min), AI (10/min), and property lookup (20/min) limits
- **Structured Logging**: Request IDs, user IDs, error context for all API calls

**Key Endpoints (all AI/property/comps/presentation endpoints require auth):**
- `GET /api/health` - Health check endpoint (DB connectivity)
- `POST /api/property/valuation` - Fetch property details and RentCast AVM estimates (auth required)
- `POST /api/comps` - Fetch comparable sales data from RentCast AVM endpoint (auth required)
- `POST /api/ai/question` - AI analysis for interview questions (auth required)
- `POST /api/ai/negotiation` - AI negotiation plan generation (auth required)
- `POST /api/ai/presentation` - Generate AI-powered negotiation plan (auth required, tier-limited)
- `GET /api/deals` - List user's saved deals (auth required)
- `POST /api/deals` - Create saved deal (auth required, tier-limited)
- `PATCH /api/deals/:id` - Update saved deal (auth required)
- `DELETE /api/deals/:id` - Delete saved deal (auth required)
- `PATCH /api/deals/:id/archive` - Toggle archive/restore (auth required)
- `GET /api/subscription/usage` - Get user's tier limits and usage counts (auth required)
- `GET /api/preferences` - Get user preferences/working state (auth required)
- `PUT /api/preferences` - Save user preferences/working state (auth required)
- `POST /api/shares` - Create shared offer link (auth required)
- `GET /api/shares` - List user's shared links (auth required)
- `PATCH /api/shares/:code` - Deactivate a shared link (auth required)
- `GET /api/s/:code` - Public endpoint to fetch shared offer data (with OG tag injection for bots)
- `POST /api/presentations/save` - Save presentation PDF (auth required, tier-limited)
- `GET /api/presentations` - List user's own presentations (auth required, scoped)
- `POST /api/analytics/track` - Track usage events (auth required)
- `POST /api/feedback` - Submit feedback (auth required)
- `POST /api/parse-listing-url` - Parse listing URL for property details (auth required)
- `/api/login` - Replit Auth OIDC login
- `/api/logout` - Replit Auth OIDC logout
- `/api/auth/user` - Get current authenticated user

### Security
- All AI, property, and presentation endpoints require authentication
- Rate limiting: global (100 req/min), AI (10/min), property lookups (20/min)
- Subscription tier enforcement via `server/subscriptionGuard.ts` (deal save limits, AI presentation limits)
- Ownership checks on all deal/share CRUD operations (IDOR prevention)
- SSRF protection on listing URL parser (domain allowlist + redirect validation)
- Input length caps on all Zod schemas (2000 chars for textareas, 500 for addresses)

### Data Storage
- **Client Persistence**: localStorage for all deal inputs, settings, and AI results (fast fallback for guests)
- **Server Persistence**: PostgreSQL with Drizzle ORM for users, sessions, saved deals, saved presentations, user preferences, analytics, and feedback
- **Auto-save**: Logged-in users get debounced (3s) auto-save with retry logic (3 attempts with backoff) and status indicator
- **Schema Location**: `shared/schema.ts` re-exports from `shared/models/auth.ts`, `shared/models/savedDeals.ts`, `shared/models/savedPresentations.ts`, `shared/models/userPreferences.ts`, `shared/models/analytics.ts`, `shared/models/feedback.ts`
- **Auth**: Replit Auth (OIDC) with passport, sessions stored in PostgreSQL

### Key Files
- `client/src/pages/deal-desk.tsx` - Main OfferIQ page with tabbed 3-engine layout + onboarding modal
- `client/src/pages/saved-deals.tsx` - Saved deals dashboard with CRUD operations + rich empty states
- `client/src/pages/compare-deals.tsx` - Side-by-side deal comparison page + guidance empty state
- `client/src/pages/landing.tsx` - Marketing landing page with mobile hamburger nav
- `client/src/types.ts` - Complete type definitions for all engines
- `client/src/components/error-boundary.tsx` - Global error boundary with fallback UI
- `client/src/components/feedback-dialog.tsx` - Floating feedback button + dialog
- `client/src/components/underwriting-section.tsx` - Underwriting inputs/outputs UI with comps integration
- `client/src/components/comps-section.tsx` - Comparable sales display with responsive card/table layout
- `client/src/components/comps-map.tsx` - Google Maps view showing comp locations
- `client/src/components/offer-calc-section.tsx` - Offer calculation with sliders and ladder
- `client/src/components/offer-presentation-section.tsx` - AI presentation generator with premium badges
- `client/src/components/seller-presentation-section.tsx` - Seller-facing customizations with guidance empty state
- `client/src/pages/shared-offer.tsx` - Public seller-facing shared offer page (fully seller-focused: no investor metrics, margin, spread, or offer formula shown; includes seller-perspective Deal Grade, Apples-to-Apples comparison, and Deal Terms sections)
- `server/subscriptionGuard.ts` - Tier limit enforcement (deal saves, AI presentations)
- `capacitor.config.ts` - Capacitor iOS configuration (for App Store build on Mac)

### Build Configuration
- Development: `tsx server/index.ts` with Vite middleware for HMR
- Production: esbuild bundles server code, Vite builds client to `dist/public`
- Path aliases: `@/` maps to client/src, `@shared/` maps to shared/
- iOS: Capacitor configured with `com.offeriq.app` bundle ID, webDir `dist/public`

## Calculation Logic

### AVM Blending
- Zillow: 45% weight
- Redfin: 35% weight
- Other: 20% weight
- Values normalized if any input is 0
- Safety guards: safeNum(), safeDivide(), clamp() prevent NaN/Infinity

### Wholesale Formula
```
Wholesale Price = (ARV * (1 - closingCostPct)) - (ARV * profitPct) - Repairs
```

### Offer Ladder
- Fast Yes: +8% above Fair price
- Fair: Baseline calculated offer
- Stretch: -8% below Fair price

### Deal Grading
- A: High confidence (>=80%), high margin (>=30%)
- B: Medium confidence (>=60%), decent margin (>=20%)
- C: Lower confidence or margin
- D: Risky deal

### Comparable Sales Analysis
- Auto-fetched from RentCast (up to 15 comps)
- Mobile-responsive: card layout on screens <480px, table on larger
- Filters: distance (0.25-5mi), date range (1-24 months), property type
- Map View: Google Maps with subject (blue) and comp (green) pins

### Subscription Tier Limits
- Free Trial: 3 saved deals, 2 AI presentations total
- Basic ($29/mo): 10 saved deals, 5 AI presentations/month
- Premium ($79/mo): Unlimited saved deals and AI presentations
- Enforced server-side via subscriptionGuard.ts

### PDF Export & Sharing
- Download PDF: jsPDF client-side generation
- Save & Share: Upload to Replit Object Storage, unique URL
- Storage: Object Storage with metadata in saved_presentations table

## External Dependencies

### AI Services
- OpenAI API via Replit AI Integrations (gpt-4o)
- Rate limited to 10 requests/min
- Fallback stub responses when API keys not configured

### Key npm Dependencies
- `drizzle-orm` / `drizzle-zod`: Database ORM and schema validation
- `zod`: Runtime type validation
- `wouter`: Client routing
- `@react-google-maps/api`: Google Maps integration
- `express-rate-limit`: API rate limiting
- `@capacitor/core` / `@capacitor/cli` / `@capacitor/ios`: iOS app packaging
- Radix UI primitives: Accessible component foundations
- `framer-motion`: Animations

### Design System
- Font families: Inter (UI text), Roboto Mono (numerical data)
- Professional SaaS styling per `design_guidelines.md`
- Component styling: shadcn/ui new-york style variant
- Mobile-first: 44px touch targets, responsive grids, hamburger nav
