# eNest Developer Documentation

This document is the technical reference for the current eNest codebase. It is written for developers who need to understand the architecture, data flow, feature boundaries, and the safest places to extend the product.

Use [README.md](../README.md) for a product-level overview and local setup. Use this document when you need to work inside the codebase.

## 1. Project Summary

eNest is a frontend-first operations dashboard for service businesses. The application currently supports three runtime roles:

- `Admin`
- `Customer` (displayed in the UI as `Business`)
- `Employee`

The product is built as a single Next.js App Router application with a client-heavy dashboard shell. Most business logic runs in React components and local utility modules. Persistent state currently lives in browser `localStorage`.

The system already includes:

- role-aware login and session restoration
- admin, business, and employee dashboard variants
- business onboarding for first login
- department, account, employee, customer, service, expense, and report management
- multi-line service and payment transaction entry
- department-scoped services and department-linked bank accounts
- local subscription lifecycle management
- customer import from CSV, Excel, XML, text, and DOCX
- reducer-based state updates with migration support for legacy saved state

The system does not yet include:

- a backend API
- a database
- real authentication
- server-side permission enforcement
- multi-user synchronization across devices

## 2. Tech Stack

- Next.js `16.2.3`
- React `19.2.4`
- TypeScript
- Bootstrap `5.3.8`
- React Icons
- ESLint `9`
- Node test runner
- `xlsx` for spreadsheet parsing
- `mammoth` for DOCX parsing

Important repository rule:

Before changing framework behavior, routing, or App Router assumptions, read the local Next.js documentation under:

```text
node_modules/next/dist/docs/
```

This matters because the project is using a newer Next.js version than many older examples assume.

## 3. Runtime Architecture

### 3.1 Entry Points

- [app/layout.tsx](../app/layout.tsx)
  Wraps the app in `AppProvider` and loads global CSS and fonts.
- [app/page.tsx](../app/page.tsx)
  Restores the stored session, shows `LoginScreen` when signed out, and renders `Dashboard` when signed in.

### 3.2 Main Runtime Flow

1. `app/page.tsx` runs on the client.
2. `getStoredUser()` from [lib/auth-session.ts](../lib/auth-session.ts) checks the browser session.
3. If no session exists, [components/auth/LoginScreen.tsx](../components/auth/LoginScreen.tsx) is rendered.
4. If a session exists, [components/dashboard/Dashboard.tsx](../components/dashboard/Dashboard.tsx) renders the full workspace shell.
5. Dashboard reads global state from `useApp()`.
6. State is persisted back to `localStorage` by the provider in [lib/store.tsx](../lib/store.tsx).

### 3.3 Rendering Model

This is an App Router project, but the operational dashboard is currently a client application inside a single page route. The app behaves more like a desktop-style workspace than a route-per-feature web app.

Practical consequences:

- most navigation is tab-based, not route-based
- `Dashboard.tsx` is the orchestration layer for active workspace views
- forms and tables communicate through props and reducer dispatches
- persistence and access checks mostly happen in client code

## 4. Core File Map

### 4.1 App Layer

- [app/layout.tsx](../app/layout.tsx): root layout and provider wiring
- [app/page.tsx](../app/page.tsx): login-or-dashboard switch
- [app/globals.css](../app/globals.css): global styles and most dashboard styling

### 4.2 State and Business Logic

- [lib/store.tsx](../lib/store.tsx): types, empty initial state, reducer, normalization, migration, provider
- [lib/auth-session.ts](../lib/auth-session.ts): backend login response mapping and session storage
- [lib/platform-structure.ts](../lib/platform-structure.ts): module definitions, role labels, permission catalog, module access helpers
- [lib/dashboard-controller.ts](../lib/dashboard-controller.ts): permission-aware view/edit/delete helpers, search, transaction summary
- [lib/transaction-workflow.ts](../lib/transaction-workflow.ts): receipt and daily-closing helpers, status/amount calculations
- [lib/subscription.ts](../lib/subscription.ts): plan catalog, date math, access-state derivation
- [lib/customer-import.ts](../lib/customer-import.ts): file parsing and customer row extraction
- [lib/csv.ts](../lib/csv.ts): CSV escaping and generation helpers
- [lib/number-validation.ts](../lib/number-validation.ts): numeric parsing helpers

### 4.3 Shell and Shared UI

- [components/dashboard/Dashboard.tsx](../components/dashboard/Dashboard.tsx): main workspace controller
- [components/layout/Sidebar.tsx](../components/layout/Sidebar.tsx): tab navigation
- [components/layout/Header.tsx](../components/layout/Header.tsx): heading, search, department selector, profile, notifications
- [components/layout/Footer.tsx](../components/layout/Footer.tsx): page footer
- [components/ui](../components/ui): reusable low-level controls and modal wrapper

### 4.4 Feature Components

- [components/dashboard](../components/dashboard): dashboard-specific cards, onboarding, quick actions, notifications
- [components/forms](../components/forms): modal and in-page forms
- [components/tables](../components/tables): list and reporting tables
- [components/auth](../components/auth): login screen

### 4.5 Tests

- [tests](../tests): focused tests for business logic and migration paths

## 5. Roles, Naming, and Access Model

### 5.1 Role Naming

The codebase uses these actual role values:

- `Admin`
- `Customer`
- `Employee`

In the UI, `Customer` is presented to users as `Business`. This is an important naming mismatch to remember when reading the code.

### 5.2 Module Definitions

Sidebar modules, labels, headings, and allowed roles are defined in [lib/platform-structure.ts](../lib/platform-structure.ts).

Important helpers in that file:

- `getSidebarModulesForSession()`
- `canAccessModuleForSession()`
- `canUseBusinessFeature()`
- `createCustomerPermissions()`
- `normalizeCustomerPermissions()`

### 5.3 Permission Model

Business and employee access is driven by `CustomerPermissions`, which is a flat boolean map keyed by permission id.

Examples:

- `customers.add`
- `customers.list`
- `services.access`
- `master.account_manage`
- `reports.service_report`

The permission catalog is grouped into sections in `customerPermissionSections`, but access checks are ultimately done with boolean lookups and helper functions.

### 5.4 Role Behavior

Admin:

- has a separate admin dashboard layout
- manages businesses, plan information, reports, reminders, and admin settings
- does not operate in business transaction mode

Business (`Customer`):

- owns a workspace tied to a specific business id
- can access modules based on granted permissions
- can onboard the business, manage subscription, departments, services, accounts, and employees

Employee:

- logs into a business workspace
- inherits business-level permissions, but with tighter action restrictions
- cannot delete records
- is locked to the assigned department
- cannot change their own department
- creates transactions only for their assigned department

## 6. State Architecture

### 6.1 Root State Shape

The root application state lives in [lib/store.tsx](../lib/store.tsx) as:

```ts
interface AppState {
  businesses: Business[];
  businessWorkspacesById: Record<string, BusinessWorkspace>;
  adminWorkspace: AdminWorkspace;
}
```

### 6.2 Business Directory vs Workspace

The split between `businesses` and `businessWorkspacesById` is central to the whole project.

`Business` stores directory and access metadata:

- name
- contact info
- login credentials
- permissions
- onboarding state
- subscription state
- business active/inactive state

`BusinessWorkspace` stores operational records for a single business:

- customers
- employees
- transactions
- notifications
- counters/departments
- accounts
- services
- expenses
- recent services
- history events
- reports

This separation lets the app treat the business directory as a tenant registry and each workspace as tenant-scoped data.

### 6.3 Admin Workspace

`adminWorkspace` stores admin-only records:

- notifications
- history events
- reports
- system addition options

### 6.4 Empty State and Workspace Creation

Important store helpers:

- `createEmptyBusinessWorkspace()`
- `createBusinessWorkspaceFromPermissions()`
- `getBusinessWorkspace()`
- `aggregateBusinessWorkspaces()`

New businesses get an empty workspace. Departments, accounts, services, customers, and employees are created by onboarding, backend imports, or normal user actions.

### 6.5 Persistence

The current storage key is:

```text
enest-app-state-v2
```

Legacy migration is supported from:

```text
enest-app-state-v1
```

State is written back to `localStorage` on every reducer update inside `AppProvider`.

### 6.6 Normalization

The store normalizes almost every loaded record before use:

- businesses
- customers
- employees
- counters/departments
- accounts
- transactions
- services
- expenses
- reports
- history events
- notifications

This is important because the app supports:

- old saved state
- missing optional fields
- permission alias normalization
- subscription state recalculation
- transaction status cleanup
- department/account compatibility fallbacks

### 6.7 Reducer Actions

The reducer in `lib/store.tsx` is the main write path.

Action groups:

- business directory: `ADD_BUSINESS`, `UPDATE_BUSINESS`, `DELETE_BUSINESS`
- workspace records: `ADD_*`, `UPDATE_*`, `DELETE_*`
- admin records: report/history/notification/addition actions
- notification dismissal

A few reducer behaviors matter more than they first appear:

- adding or updating transactions changes account and department balances
- deleting a transaction reverses posted balances
- deleting an account also cleans linked/default department account references
- updating a business re-normalizes its workspace against the business permissions

## 7. Authentication and Session Model

Authentication is currently backend-verified at login, with client-side session mapping implemented in [lib/auth-session.ts](../lib/auth-session.ts).

Sources of login accounts:

- backend login responses
- active business directory records for local session mapping
- active employee records in accessible business workspaces for local session mapping

Session behavior:

- the selected user is stored in `localStorage`
- session restoration validates against current available users
- stale sessions are automatically cleared

Subscription-aware login behavior:

- expired or cancelled businesses can still allow owner login for renewal
- employees are blocked when the business subscription is expired or cancelled
- manually inactive businesses block both owner and employee login

## 8. Subscription System

The subscription model is defined in [lib/subscription.ts](../lib/subscription.ts).

### 8.1 Available Plans

- `trial-1-week`
- `month-1`
- `month-6`
- `year-1`
- `year-3`
- `year-10`

### 8.2 Stored Subscription Shape

Each business may store:

- `planId`
- `startDate`
- `endDate`
- `status`
- `cancelledAt`
- `updatedAt`

### 8.3 Derived Access State

`getBusinessAccessState()` turns raw business status plus subscription data into a runtime access decision:

- active or inactive business status
- subscription lock state
- business-owner login eligibility
- employee login eligibility

### 8.4 UI Usage

Subscriptions affect:

- business creation/editing
- business dashboard `Your Plan` area
- business plan-management modal
- admin renewal watch
- admin plan transaction view
- login availability

## 9. Dashboard Architecture

[components/dashboard/Dashboard.tsx](../components/dashboard/Dashboard.tsx) is the highest-complexity file in the project. It is both a workspace shell and an orchestration layer.

### 9.1 Responsibilities

`Dashboard.tsx` currently handles:

- active tab state
- active modal state
- selected business workspace
- selected department
- search term
- record filters
- transaction draft/edit flows
- permission gating
- summary cards
- role-specific page composition
- dispatching store actions
- rendering module tables and forms

### 9.2 Role-Specific Dashboards

Admin dashboard:

- admin workspace
- business directory summary
- plan/subscription summary
- renewal watch
- plan-management actions
- subscription transaction table
- admin notifications

Business dashboard:

- minimal top layout
- plan section near the top
- operational overview and quick actions
- transaction history
- service snapshot and recent activity placed lower on the page

Employee dashboard:

- reuses the shared business-style shell
- department selector is locked or replaced with an unassigned state
- access is filtered by employee permissions and assigned department

### 9.3 Shell Components

- `Header`: search, department chooser, notifications, logout
- `Sidebar`: permission-aware tab navigation
- `Footer`: bottom shell element
- `ActionModal`: wrapper for modal interactions

## 10. Onboarding Flow

First-login business onboarding is implemented in [components/dashboard/BusinessOnboarding.tsx](../components/dashboard/BusinessOnboarding.tsx).

Steps:

1. welcome / business name
2. departments
3. accounts
4. services when business permissions allow it
5. customer import
6. dashboard completion

Stored onboarding fields on `Business`:

- `onboardingCompleted`
- `onboardingStep`

Implementation notes:

- the onboarding flow creates real department/account records from submitted values
- the customer import step can be skipped
- onboarding is enforced through the dashboard before normal workspace access

## 11. Transaction and Payment Workflow

The transaction workflow is one of the most important feature areas and is split between UI and utility logic.

### 11.1 Main UI Files

- [components/forms/ServiceForm.tsx](../components/forms/ServiceForm.tsx)
- [components/forms/TransactionEditForm.tsx](../components/forms/TransactionEditForm.tsx)
- [components/tables/TransactionTable.tsx](../components/tables/TransactionTable.tsx)
- [lib/transaction-workflow.ts](../lib/transaction-workflow.ts)

### 11.2 Supported Behaviors

- customer search and autofill
- multiple services in a single submission flow
- per-line total, paid, and due amount handling
- `cash`, `upi`, `bank`, and `card` payment modes
- mode-specific payment-detail capture
- transaction account selection for non-cash flows
- transaction filtering
- transaction editing
- receipt text generation
- daily closing summary generation

### 11.3 Payment Detail Rules

Cash:

- no extra payment detail payload

UPI:

- transaction id
- UTR number

Card:

- transaction id
- card type
- card network
- last four digits

Bank:

- transfer type
- transaction reference number
- sender account holder name
- sender bank name
- sender account number

### 11.4 Important Persistence Rule

Transactions store their own service and payment snapshots. This is intentional. Services can later be edited or deleted from the live catalog without mutating historical transactions, logs, or reports.

### 11.5 Accounting Side Effects

When transactions are added, updated, or deleted, the reducer updates:

- linked account balances
- department balances
- recent service activity

## 12. Departments, Accounts, and Services

### 12.1 Departments

The `Counter` type is used as the department record.

A department can:

- link multiple account ids
- choose one default account
- track opening and current balances

Key helpers in [lib/store.tsx](../lib/store.tsx):

- `getDepartmentLinkedAccountIds()`
- `getDepartmentDefaultAccountId()`
- `getDepartmentLinkedAccounts()`
- `getDepartmentDefaultAccount()`

### 12.2 Accounts

Accounts are business-bank records with opening/current balances. They are used for non-cash posting and are affected by transaction reducer updates.

### 12.3 Services

Services are department-scoped. They are not shared across departments.

Important business rules:

- service creation requires a department
- inline service creation is available from the transaction form
- editing or deleting a service only affects the live service catalog
- past transactions and reports keep their own saved values

### 12.4 Employee Department Locking

Employees are assigned to a department. Once assigned:

- they cannot switch departments in the UI
- their transactions are restricted to that department
- their service actions are also scoped to that department

## 13. Customer Import

Customer import logic lives in [lib/customer-import.ts](../lib/customer-import.ts).

Supported import sources:

- CSV and plain text
- Excel via `xlsx`
- XML
- DOCX via `mammoth`

Current limitations:

- legacy `.doc` files are not supported directly
- import logic is best-effort parsing, not schema-perfect ETL

The onboarding flow uses this feature to import existing customer data before the business starts normal dashboard usage.

## 14. Search, Notifications, Reports, and History

### 14.1 Search

`getSearchMatches()` in [lib/dashboard-controller.ts](../lib/dashboard-controller.ts) performs permission-aware global matching across:

- services
- customers
- transactions

### 14.2 Notifications

Notifications exist in both admin and business workspaces. The dashboard renders them through `NotificationCenter`.

### 14.3 Reports

Reports are stored either:

- in a business workspace
- in `adminWorkspace`

The app also derives daily-closing summaries for report-style views.

### 14.4 History

History events record operational actions for timeline-style review. Admin and business workspaces each maintain their own history arrays.

## 15. Component Organization

### 15.1 `components/auth`

- login entry UI only

### 15.2 `components/dashboard`

- dashboard-only cards and sections
- onboarding flow
- quick actions
- notification center
- welcome hero
- top-level orchestration

### 15.3 `components/forms`

Contains most create/edit flows:

- business
- subscription plan
- customer
- employee
- department
- account
- service catalog editor
- service and payment transaction form
- transaction edit form
- expense

### 15.4 `components/tables`

Contains display tables for:

- accounts
- departments
- customers
- customer payments
- customer outstanding
- employees
- expenses
- services
- recent services
- counters
- reports
- history
- business subscription transactions
- transactions

### 15.5 `components/ui`

Shared primitives:

- buttons
- inputs
- selects
- search bar
- modal wrapper
- department dropdown

## 16. Testing Strategy

The project uses the Node test runner with a dedicated test TypeScript build.

Run all tests:

```bash
npm test
```

Current test coverage focuses on logic that is both reusable and easy to regress:

- [tests/auth-session.test.ts](../tests/auth-session.test.ts): available user discovery and subscription-aware login behavior
- [tests/csv.test.ts](../tests/csv.test.ts): CSV escaping and output generation
- [tests/customer-import.test.ts](../tests/customer-import.test.ts): import parsing behavior
- [tests/dashboard-controller.test.ts](../tests/dashboard-controller.test.ts): permission-aware dashboard logic
- [tests/number-validation.test.ts](../tests/number-validation.test.ts): numeric parsing helpers
- [tests/store-migration.test.ts](../tests/store-migration.test.ts): legacy state migration
- [tests/transaction-workflow.test.ts](../tests/transaction-workflow.test.ts): transaction receipt and summary logic

There are currently no full end-to-end browser tests.

## 17. Local Development Workflow

Install dependencies:

```bash
npm install
```

Start development:

```bash
npm run dev
```

Run lint:

```bash
npm run lint
```

Run production build:

```bash
npm run build
```

Run tests:

```bash
npm test
```

## 18. How To Extend the Project Safely

### 18.1 Add a New Dashboard Module

1. Add or update the module definition in [lib/platform-structure.ts](../lib/platform-structure.ts).
2. Make sure the sidebar visibility rules match the intended role/permission behavior.
3. Add heading/description support if needed.
4. Add the new tab rendering branch in [components/dashboard/Dashboard.tsx](../components/dashboard/Dashboard.tsx).
5. Build or reuse the table/form components for the module.
6. Wire reducer actions in [lib/store.tsx](../lib/store.tsx) if the module persists new state.
7. Add tests for any new helper logic.

### 18.2 Add a New Persisted Record Type

1. Define the TypeScript interface in `lib/store.tsx`.
2. Add it to `BusinessWorkspace` or `AdminWorkspace`.
3. Update workspace creation and normalization.
4. Add reducer actions.
5. Update migration logic if old saved state needs compatibility.
6. Render it through a form/table pair in the dashboard.

### 18.3 Add a New Permission

1. Add it to `customerPermissionSections` in [lib/platform-structure.ts](../lib/platform-structure.ts).
2. Update access helpers like `canUseBusinessFeature()`.
3. Apply the permission in dashboard/controller rendering and action guards.
4. Verify business and employee paths separately.

### 18.4 Change Transaction Logic

Check all of these before merging:

- `ServiceForm.tsx`
- `TransactionEditForm.tsx`
- `TransactionTable.tsx`
- `lib/transaction-workflow.ts`
- reducer balance side effects in `lib/store.tsx`
- department/account helpers
- receipt output
- relevant tests

## 19. Known Constraints and Operational Notes

- The app is intentionally frontend-first and not production secure.
- `localStorage` is the source of truth for now.
- Data is browser-local and not shared between machines.
- Business and employee access control is enforced in the client.
- The dashboard file is large and mixes orchestration with rendering.
- Many metrics shown on dashboard cards are still static placeholders.
- The build may show a non-blocking Next.js warning about multiple lockfiles in the wider workspace.

## 20. Recommended Refactoring Directions

The codebase is usable, but these are the most valuable technical next steps:

- move persistence to an API and database
- move remaining client-side session mapping into real session/auth infrastructure
- split `Dashboard.tsx` into role-specific controllers or hooks
- move reducer action creators into feature modules
- add browser-based integration tests for onboarding and transactions
- introduce route-level separation for larger admin/business surfaces if the product keeps growing

## 21. Quick Reference

If you are new to the repo, start here in order:

1. [README.md](../README.md)
2. [app/page.tsx](../app/page.tsx)
3. [lib/store.tsx](../lib/store.tsx)
4. [lib/platform-structure.ts](../lib/platform-structure.ts)
5. [components/dashboard/Dashboard.tsx](../components/dashboard/Dashboard.tsx)
6. [components/forms/ServiceForm.tsx](../components/forms/ServiceForm.tsx)
7. [lib/subscription.ts](../lib/subscription.ts)

That path gives the fastest understanding of how the app boots, stores data, gates access, and performs its main transaction workflow.
