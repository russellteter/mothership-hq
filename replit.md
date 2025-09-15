# replit.md

## Overview

This is an SMB Lead Finder platform that helps sales teams discover, qualify, and manage small-to-medium business prospects. The application provides intelligent lead search capabilities using natural language queries, automatic lead scoring, and comprehensive lead management workflows. It's built as a React-based single-page application with a modern, responsive UI.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The application uses a modern React 18 architecture with TypeScript for type safety:

**Framework Choice**: React 18 with Vite as the build tool provides fast development experience and optimized production builds. SWC is used for compilation to improve build performance.

**Component Architecture**: Uses shadcn/ui components built on top of Radix UI primitives for accessible, composable UI components. The component library provides consistent styling with Tailwind CSS and supports both light and dark themes.

**State Management**: Implements React Query (TanStack Query) for server state management, providing caching, background updates, and optimistic updates. Local component state is managed with React hooks.

**Routing**: React Router v6 handles client-side routing with protected routes for authenticated users.

### UI Design System
**Styling**: Tailwind CSS with a custom design system defined in CSS variables. The theme supports both light and dark modes with automatic system preference detection.

**Typography**: Uses Geist font family for modern, professional appearance.

**Layout System**: Implements ResizablePanelGroup for adjustable layouts and virtualized tables for performance with large datasets.

### Data Management
**Search Pipeline**: Multi-step process that parses natural language queries into structured search parameters, executes searches, and caches results. Search state is managed through custom hooks with progress tracking.

**Lead Management**: Comprehensive lead data structure including business information, contact details, signals, and scoring. Supports bulk operations, filtering, and export functionality.

**Caching Strategy**: Implements client-side caching for search results with configurable TTL to reduce API calls and improve user experience.

### Performance Optimizations
**Virtual Scrolling**: Uses @tanstack/react-virtual for efficiently rendering large lists of leads without performance degradation.

**Debounced Inputs**: Search and filter inputs use debouncing to prevent excessive API calls during user input.

**Code Splitting**: Vite's built-in code splitting ensures optimal bundle sizes and lazy loading of components.

## External Dependencies

### Backend Services
**Supabase Integration**: PostgreSQL database with real-time subscriptions, authentication, and Edge Functions for serverless compute. Handles user authentication, data storage, and business logic execution.

**Google Places API**: Powers business discovery and location-based search functionality. Requires Google Cloud Platform setup with Places API (New) enabled.

**OpenAI API**: Provides natural language processing for search query parsing and AI insights generation. Used for converting conversational queries into structured search parameters.

### Third-Party UI Libraries
**Radix UI**: Provides accessible, unstyled UI primitives for components like dialogs, dropdowns, and form controls. Ensures ARIA compliance and keyboard navigation.

**Lucide React**: Icon library providing consistent, scalable SVG icons throughout the application.

**React Hook Form**: Form state management with Zod schema validation for type-safe form handling and validation.

### Development Tools
**TypeScript**: Provides static type checking and improved developer experience with comprehensive type definitions.

**ESLint**: Code linting with React-specific rules for maintaining code quality and consistency.

**Playwright**: End-to-end testing framework for automated browser testing across different environments.

### Build and Deployment
**Vite**: Modern build tool with hot module replacement, fast builds, and optimized production bundles.

**Tailwind CSS**: Utility-first CSS framework with PostCSS processing for responsive design and custom theming.

**Lovable Platform**: Deployment platform providing hosting, CI/CD, and environment management for the application.