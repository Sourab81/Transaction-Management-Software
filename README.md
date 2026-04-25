# eNest Transaction Management Software

eNest is a role-based service desk and transaction management dashboard built with Next.js, React, and TypeScript. The app currently focuses on day-to-day business operations such as customer handling, service billing, transaction processing, department-account mapping, reporting, and audit tracking.

The current implementation is a frontend-first prototype with client-side state management and browser persistence. It is designed to feel like a working operations product while the backend and production auth layers are still to come.

## Current Status

What is working right now:

- Single login screen for `Admin`, `Business`, and `Employee` users
- Role-aware dashboard and sidebar navigation
- Business directory and permission-aware workspace access
- Customer, employee, department, account, service, report, and expense management
- Transaction workflow with:
  - customer search and autofill
  - multi-service transaction entry
  - cash, UPI, bank, and card payment modes
  - payment-detail capture for non-cash flows
  - transaction editing, filtering, printing, and receipt export
- Department support for multiple linked bank accounts with a default transaction account
- History timeline, notifications, quick actions, and reporting helpers
- Local persistence with `localStorage`
- Legacy state migration utilities and automated test coverage for core logic

What is not implemented yet:

- Real backend or database
- Real API routes for CRUD operations
- Secure production authentication/authorization
- Server-side persistence

## Tech Stack

- Next.js 16.2.3
- React 19
- TypeScript
- Bootstrap 5
- React Icons
- ESLint
- Node test runner for unit/integration-style utility tests

## Product Overview

The app is organized around a single dashboard shell. After login, users land in the same main application but see different modules depending on role and permissions.

Core modules currently present in the codebase:

- Dashboard
- Transactions
- Customers
- Reminder
- Employees
- Departments
- Services
- Accounts
- Reports
- Expense
- History
- System Settings

Role and permission structure lives in [lib/platform-structure.ts](lib/platform-structure.ts).

## Key Workflows

### Transactions

The transaction workflow is one of the main areas of the app right now.

Current capabilities include:

- Search existing customers by name or phone
- Autofill customer details when a match is found
- Add one or multiple service rows in a single save flow
- Auto-calculate due amount from total and paid amount
- Handle `cash`, `upi`, `bank`, and `card` payment modes
- Capture payment metadata for non-cash transactions
- Link transactions to the selected department and department account
- Save separate transaction records for each service row
- Edit existing transactions later
- Filter, print, and download transaction receipts

### Departments and Accounts

Departments can now:

- Link multiple bank accounts
- Define one default account for non-cash posting
- Use the default account automatically during transactions
- Allow operators to switch the transaction account when multiple linked accounts exist

### Reporting and Operations

The dashboard also includes:

- summary cards
- quick actions
- notifications
- history timeline
- recent service activity
- day-closing/report helpers

## Architecture

This is an App Router project, but most of the business workflow currently runs on the client side.

High-level flow:

1. `app/layout.tsx` wraps the app with the global provider.
2. `app/page.tsx` checks the stored session.
3. If no session exists, `components/auth/LoginScreen.tsx` is shown.
4. After login, `components/dashboard/Dashboard.tsx` renders the main workspace.
5. Shared state is managed through `lib/store.tsx`.
6. The store persists to browser `localStorage`.

Important implementation notes:

- Session handling lives in [lib/auth-session.ts](lib/auth-session.ts)
- Global app state, reducer logic, and persistence live in [lib/store.tsx](lib/store.tsx)
- Dashboard orchestration lives in [components/dashboard/Dashboard.tsx](components/dashboard/Dashboard.tsx)
- Utility workflow logic such as receipts and day-closing summaries lives in [lib/transaction-workflow.ts](lib/transaction-workflow.ts)

## Login Access

All logins are verified through the backend login service. Business and employee records in local state are used only for session mapping:

- Business users come from the business directory records
- Employee users come from each business workspace

## Getting Started

### Requirements

- Node.js 20+ recommended
- npm

### Install

```bash
npm install
```

### Run the development server

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

### Production build

```bash
npm run build
npm run start
```

## Available Scripts

```bash
npm run dev
```

Starts the development server.

```bash
npm run build
```

Creates a production build.

```bash
npm run start
```

Runs the production build locally.

```bash
npm run lint
```

Runs ESLint.

```bash
npm test
```

Builds the test TypeScript config and runs the Node test suite.

## Testing

Current automated tests cover core utility and state logic, including:

- auth session helpers
- CSV helpers
- dashboard controller logic
- number parsing/validation
- store migration
- transaction workflow helpers

Test files live in [tests](tests).

## Project Structure

```text
app/
  globals.css
  layout.tsx
  page.tsx

components/
  auth/
  dashboard/
  forms/
  layout/
  tables/
  ui/

docs/
  DEVELOPER_DOCUMENTATION.md

lib/
  auth-session.ts
  csv.ts
  dashboard-controller.ts
  number-validation.ts
  platform-structure.ts
  store.tsx
  transaction-workflow.ts

tests/
```

## Important Folders

- `components/dashboard/`
  Main application shell, workspace sections, cards, quick actions, and notifications.

- `components/forms/`
  Operational forms such as account, customer, department, employee, expense, service, and transaction forms.

- `components/tables/`
  Listing and reporting tables used throughout the dashboard.

- `components/ui/`
  Shared low-level controls like buttons, inputs, selects, modals, and search helpers.

- `lib/`
  Application logic, role structure, state management, utilities, and session helpers.

- `docs/`
  Internal contributor/developer onboarding notes.

## Data and Persistence

At the moment, the app stores its state in browser `localStorage`.

That includes:

- businesses
- business workspaces
- customers
- employees
- transactions
- departments
- accounts
- services
- expenses
- reports
- notifications
- history events

There is also a migration path for older stored data, handled in `migrateLegacyState()` inside [lib/store.tsx](lib/store.tsx).

## Current Limitations

- This is not yet a backend-connected production system
- Data is browser-local, so changing browsers/devices will not share state
- Authentication uses backend login verification with client-side session mapping
- Permissions are enforced in the frontend application layer
- Some operational modules are already scaffolded while deeper business rules are still evolving

## Developer Notes

- This repo uses Next.js App Router
- Before making framework-level changes, read the local Next.js docs under `node_modules/next/dist/docs/`
- The codebase currently favors small reusable UI pieces with dashboard-level orchestration
- If you see a Turbopack workspace-root warning during build, it is related to multiple lockfiles in the wider workspace and not necessarily to app logic

## Next Steps

Likely next milestones for the project:

- move state from `localStorage` to a backend API + database
- add secure auth and role/session management
- expand reporting/export coverage
- harden permission enforcement on the server
- add more end-to-end and workflow-level testing
- refine operational UX for high-volume transaction entry
