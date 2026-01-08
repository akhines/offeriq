# Deal Underwriter - Real Estate Deal Analysis

## Overview

A professional real estate deal underwriting web application that captures seller interview responses, performs automated calculations, and provides AI-powered negotiation recommendations. The app follows a two-column layout with seller interview questions on the left and underwriting outputs on the right.

**Core Functionality:**
- Standardized seller interview with ~20 configurable questions
- Per-question calculations and optional AI analysis
- Offer price recommendations with adjustable assignment fee slider
- AI-driven negotiation guidance based on Tony Robbins 6 Human Needs and DISC communication styles
- Export/copy deal summaries

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript, using Vite as the build tool
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: React Query (@tanstack/react-query) for server state, React useState for local state with localStorage persistence
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming (light/dark mode support)

**Design Pattern**: Question Module Architecture - each interview question is configured via a JSON-like config array (`questionsConfig` in shared/schema.ts) containing input type, validation rules, visibility conditions, derived calculations, and optional AI modules.

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript compiled with tsx for development, esbuild for production
- **API Structure**: RESTful endpoints under `/api/` prefix
- **AI Integration**: OpenAI API (via Replit AI Integrations) for question analysis and negotiation plan generation

**Key Endpoints:**
- `POST /api/ai/question` - Generate AI analysis for individual questions
- `POST /api/ai/negotiation` - Generate comprehensive negotiation plan

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM
- **Schema Location**: `shared/schema.ts` contains both Drizzle table definitions and Zod validation schemas
- **Current Tables**: users, conversations, messages (chat integration scaffolding)
- **Client Persistence**: localStorage for interview answers, assignment fee, and AI results

### Build Configuration
- Development: `tsx server/index.ts` with Vite middleware for HMR
- Production: esbuild bundles server code, Vite builds client to `dist/public`
- Path aliases: `@/` maps to client/src, `@shared/` maps to shared/

## External Dependencies

### AI Services
- **OpenAI API**: Used through Replit AI Integrations (environment variables: `AI_INTEGRATIONS_OPENAI_API_KEY`, `AI_INTEGRATIONS_OPENAI_BASE_URL`)
- Model: gpt-4o for text analysis, gpt-image-1 for image generation (optional)
- Fallback: Stub responses when API keys are not configured

### Database
- **PostgreSQL**: Connection via `DATABASE_URL` environment variable
- **Drizzle Kit**: Schema migrations via `drizzle-kit push`
- **connect-pg-simple**: Session storage (scaffolded)

### Key npm Dependencies
- `drizzle-orm` / `drizzle-zod`: Database ORM and schema validation
- `zod`: Runtime type validation
- `@tanstack/react-query`: Async state management
- `wouter`: Client routing
- Radix UI primitives: Accessible component foundations
- `p-limit` / `p-retry`: Batch processing utilities for LLM calls

### Design System
- Font families: Inter (UI text), Roboto Mono (numerical data)
- Material Design-inspired with SaaS refinements per `design_guidelines.md`
- Component styling: shadcn/ui new-york style variant