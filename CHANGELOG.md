# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Frontend - Mutation Detail & Edit Page Redesign

#### New Shared Utilities

- Added `apps/web/src/lib/format.ts` with shared `formatDuration`, `formatFileSize`, and `getRuleTypeLabel` functions, eliminating duplication across dashboard and mutation pages
- Added `apps/web/src/components/status-badge.tsx` with a shared `StatusBadge` component supporting `compact` mode for dashboard and full labels for detail views
- Added `apps/web/src/hooks/use-clipboard.ts` with a shared `useClipboard` hook providing copy-to-clipboard with auto-reset feedback

#### Mutation Detail Page (`/mutations/$mutationId`)

- Redesigned page layout using `Layout` component props for header, title, and action buttons
- Added metadata bar with creation date, last updated time, version badge, and rule count
- Replaced inline transformation rules rendering with Card-based layout
- Added Output Format card displaying delimiter, encoding, and header settings
- Replaced raw loading spinner with Skeleton-based loading state
- Replaced raw error div with `Alert` component
- Added proper not-found empty state with icon, description, and back button
- Extracted `RunHistory` into its own component at `apps/web/src/components/mutations/run-history.tsx`

#### Mutation Edit Page (`/mutations/$mutationId/edit`)

- Removed 14 `console.log`/`console.error` statements used for debugging
- Replaced `alert()` calls with `toast.error()` and `toast.warning()` from Sonner
- Removed `setTimeout` hack for webhook value initialization (form `reset()` already handles loading guard)
- Changed `interface FormData` to `type FormData` per project conventions
- Replaced loading spinner with Skeleton-based loading state matching edit page layout
- Replaced raw error div with `Alert` component
- Added proper not-found empty state with icon and description
- Removed double Card wrapper around `MutationSidebar`
- Replaced `border-t` action bar divider with `Separator` component

#### MutationSidebar Component

- Full rewrite: collapsed 5 stacked card-like divs into a single `Card` with `Tabs`
- Added tabbed code examples (cURL, JavaScript, Python) reducing vertical space
- Added `showConfig` prop to conditionally display JSON configuration section
- Integrated `useClipboard` hook for copy button feedback
- Added `ScrollArea` for horizontal overflow in code blocks
- Condensed API key notice into a compact banner

#### Dashboard

- Updated `apps/web/src/components/dashboard/latest-runs.tsx` to use shared `StatusBadge`, `formatDuration`, and `formatFileSize` imports instead of local duplicates

#### API Client

- Removed debug `console.log` statements from `apps/web/src/api/mutations.ts`

### Frontend - Dashboard Redesign

- Redesigned dashboard page using shadcn Card primitives with proper loading skeletons
- Added usage quota visualization with Progress bars
- Improved latest runs display with shared components
- Enhanced information hierarchy and visual consistency

### Bug Fixes

- Fixed usage quota dashboard data shape mismatch between API response and frontend expectations
- Fixed saving a configuration not persisting correctly
