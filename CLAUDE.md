# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
npm run dev          # Start Vite dev server on port 8080
npm run build        # Production build
npm run build:dev    # Development build
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run dev:watch    # Run dev server with file watcher
npm run cursor       # Open in Cursor and start dev:watch
npm run sync         # Run sync.sh script
```

## Architecture Overview

### Tech Stack
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite with SWC
- **UI Components**: shadcn/ui (Radix UI + Tailwind CSS)
- **Styling**: Tailwind CSS with custom theme support
- **State Management**: React Query (TanStack Query)
- **Routing**: React Router v6
- **Backend**: Supabase (PostgreSQL + Auth + Realtime)
- **Form Handling**: React Hook Form with Zod validation

### Project Structure
The application is a lead management/CRM system focused on SMB lead discovery and qualification:

- **`src/pages/`**: Route components (Index, AuthPage, NotFound)
- **`src/components/dashboard/`**: Core business components for lead management
  - `SearchPanel`: Natural language lead search interface
  - `VirtualizedLeadsTable`: Performance-optimized lead table with virtual scrolling
  - `LeadDetailPanel`: Detailed lead view with signals and actions
  - `BoardView`: Kanban-style lead pipeline view
  - `SavedSearchesTable`: Manage and reuse search queries
- **`src/components/ui/`**: Reusable shadcn components
- **`src/hooks/`**: Custom React hooks for business logic
  - `useLeadSearch`: Core search and lead management logic
  - `useAuth`: Supabase authentication wrapper
  - `useSearchState`: Search state management
- **`src/integrations/supabase/`**: Database client and types (auto-generated)

### Key Features & Implementation Details

**Authentication Flow**: 
- Managed via Supabase Auth with protected routes
- Auth check happens in Index.tsx using useAuth hook
- Redirects to /auth when not authenticated

**Lead Search System**:
- Natural language prompt parsed into DSL (Domain Specific Language)
- Search jobs tracked with progress states (parsing, queued, running, completed, failed)
- Results cached and managed through useLeadSearch hook
- Supports bulk operations on search results

**Data Model**:
- Lead entity contains business info, signals, scoring, tags, and notes
- Signals provide insights about lead quality with override capability
- Custom scoring profiles for lead qualification

**UI/UX Patterns**:
- Resizable panels for lead detail view
- Virtual scrolling for large datasets
- Theme support (light/dark mode) via ThemeProvider
- Toast notifications for user feedback
- Responsive table/board view switching

### Environment Configuration
- Uses Vite environment variables
- Supabase URL and keys are in `src/integrations/supabase/client.ts`
- TypeScript path alias: `@/` maps to `./src/`

### TypeScript Configuration
- Relaxed type checking (noImplicitAny: false, strictNullChecks: false)
- Allows JavaScript files
- Uses project references for app and node configs

### Testing
No test framework is currently configured. The project has a test setup file at `src/test/setup.ts` but no active tests.

## Lovable Platform Integration
This is a Lovable project with automatic deployment capabilities. Changes pushed to the repository are reflected in the Lovable platform at the project URL specified in README.md.