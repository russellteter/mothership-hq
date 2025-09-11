# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a SMB Lead Finder application built with React, TypeScript, Vite, and Supabase. It's a Lovable-integrated project designed for finding and managing business leads with advanced search capabilities.

## Key Technologies

- **Frontend**: React 18 with TypeScript
- **Build Tool**: Vite
- **UI Framework**: shadcn/ui components with Tailwind CSS
- **Database/Backend**: Supabase (PostgreSQL with Edge Functions)
- **State Management**: React Query (TanStack Query)
- **Routing**: React Router v6
- **Forms**: React Hook Form with Zod validation

## Development Commands

```bash
# Install dependencies
npm install

# Start development server (port 8080)
npm run dev

# Build for production
npm run build

# Build for development mode
npm run build:dev

# Run linter
npm run lint

# Preview production build
npm run preview

# Development with file watching
npm run dev:watch

# Sync with Lovable
npm run sync

# Open in Cursor with watch mode
npm run cursor
```

## Project Architecture

### Core Application Structure

- **Entry Point**: `src/main.tsx` - Bootstraps the React app
- **Router**: `src/App.tsx` - Main app wrapper with routing, providers, and theme initialization
- **Pages**: Located in `src/pages/`
  - `Index.tsx` - Main dashboard with lead management interface
  - `AuthPage.tsx` - Authentication handling
  - `NotFound.tsx` - 404 page

### Key Features & Components

1. **Lead Management Dashboard** (`src/components/dashboard/`)
   - `LeadsTable.tsx` - Table view for leads
   - `BoardView.tsx` - Kanban-style board view
   - `ResizableLeadDetailDrawer.tsx` - Detailed lead information panel
   - `SearchPanel.tsx` - Advanced search interface with natural language processing

2. **Search System**
   - Natural language search parsing via Supabase Edge Function (`supabase/functions/parse-prompt/`)
   - Search DSL generation and execution
   - Saved searches with custom naming
   - Search history and analytics tracking

3. **Supabase Integration** (`src/integrations/supabase/`)
   - Client configuration with auth and real-time subscriptions
   - Edge Functions for:
     - Website analysis (`analyze-website`)
     - Lead insights generation (`generate-lead-insights`)
     - Search functionality (`search-leads`, `parse-prompt`)

### Data Flow

1. User enters natural language search → Parse via Edge Function → Generate DSL query
2. Execute search against database → Return ranked results with scoring
3. Results displayed in table/board view → User can interact with leads
4. Lead interactions (status changes, notes, tags) → Update database in real-time

### Custom Hooks (`src/hooks/`)

- `useLeadSearch` - Main search functionality and lead operations
- `useAuth` - Authentication state management
- `useSavedSearches` - Manage saved search queries
- `useAIInsights` - Generate AI-powered lead insights
- `useWebsiteAnalysis` - Analyze lead websites for additional data

## TypeScript Configuration

The project uses relaxed TypeScript settings for rapid development:
- `noImplicitAny: false`
- `strictNullChecks: false`
- `noUnusedLocals: false`
- `noUnusedParameters: false`

Path alias configured: `@/*` maps to `./src/*`

## Styling Approach

- Tailwind CSS for utility-first styling
- shadcn/ui components for consistent UI patterns
- CSS variables for theming (light/dark mode support)
- Component-level styles using Tailwind classes

## Database Schema

Key tables (in Supabase):
- `leads` - Business lead information
- `saved_searches` - User's saved search queries
- `search_jobs` - Search execution tracking
- `lead_interactions` - Notes, tags, and status changes

## Testing

No test framework is currently configured. Consider adding Vitest or Jest if tests are needed.

## Important Notes

- Development server runs on port 8080 (IPv6 enabled)
- Lovable integration for collaborative development
- Theme defaults to light mode on initial load
- All Supabase Edge Functions use Deno runtime
- Authentication required for all main app features