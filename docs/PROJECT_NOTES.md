# eNest Project Notes

## Project Type

eNest is a role-based service center and transaction management dashboard.

It is currently a frontend-first Next.js application with client-side state management and browser persistence.

## Main Roles

- `Admin`
- `Business User`
- `Employee`

## Current Login Model

- Login requests are verified through the backend login service.
- Business users are mapped from the business directory records.
- Employees are mapped from the employee records inside each business workspace.
- Sessions are stored in browser `localStorage`.

## Main Features Built So Far

- role-based login and dashboard access
- admin, business, and employee dashboard layouts
- business onboarding for first login
- customer management
- employee management
- department management
- account management
- service management
- expense management
- reports and history tracking
- notifications and quick actions
- subscription plan management

## Transaction Workflow

The transaction flow currently supports:

- customer search and autofill
- multiple services in one transaction entry flow
- service and payment table layout
- cash, UPI, bank, and card payment modes
- payment detail capture for non-cash transactions
- due amount calculation
- transaction filters
- transaction editing
- transaction receipt generation

## Department and Account Rules

- A department can link multiple bank accounts.
- One linked account can be marked as the default account.
- Non-cash transactions use the default account by default.
- If multiple linked accounts exist, the selected account can be changed during transaction entry.

## Service Rules

- Services are department-specific.
- Services are not shared across departments.
- Services can be created directly from the transaction form.
- Editing or deleting a service does not change old transaction logs or reports.

## Employee Rules

- Employees are assigned to a department.
- Employees cannot change their own department.
- Employee transactions are restricted to their assigned department only.
- Employee access is still controlled by granted permissions.

## Subscription Feature

Business users currently use the local subscription lifecycle system until the backend owns plan state.

Available plans:

- `1 Week Trial`
- `1 Month`
- `6 Months`
- `1 Year`
- `3 Years`
- `10 Years`

Subscription behavior:

- expired or cancelled plans deactivate normal business access
- business owners can still log in to renew or update plans
- employees are blocked when the business plan is inactive

## Business Onboarding Flow

First-time business users go through:

1. Welcome step
2. Department setup
3. Bank account setup
4. Service setup when allowed
5. Customer import step
6. Dashboard access

## Customer Import

Customer import currently supports:

- CSV
- Excel
- XML
- text-based data
- DOCX

Purpose:

- helps a business bring existing customer records into the workspace during onboarding

## Technical Architecture

- Framework: `Next.js 16`
- UI: `React 19`
- Language: `TypeScript`
- Styling: global CSS + Bootstrap
- Icons: `react-icons`
- State management: reducer + context
- persistence: browser `localStorage`

## Important Files

- [app/page.tsx](../app/page.tsx)
  Main entry page that decides between login and dashboard.

- [lib/store.tsx](../lib/store.tsx)
  Main app state, reducer logic, persistence, and normalization.

- [lib/platform-structure.ts](../lib/platform-structure.ts)
  Role, module, and permission structure.

- [lib/auth-session.ts](../lib/auth-session.ts)
  Backend login response mapping and session logic.

- [lib/subscription.ts](../lib/subscription.ts)
  Subscription plans and access-state logic.

- [components/dashboard/Dashboard.tsx](../components/dashboard/Dashboard.tsx)
  Main dashboard controller.

- [components/forms/ServiceForm.tsx](../components/forms/ServiceForm.tsx)
  Main transaction entry form.

## Testing

Current automated tests cover:

- auth session logic
- store migration
- dashboard controller helpers
- transaction workflow helpers
- CSV helpers
- customer import helpers
- number validation helpers

Run checks with:

```bash
npm run lint
npm test
npm run build
```

## Current Limitations

- no backend API yet
- no real database
- no production authentication
- no server-side permission enforcement
- data is stored only in the browser
- no multi-device synchronization

## Recommended Next Steps

- move state to backend APIs and a database
- move remaining client-side session mapping into real authentication
- split large dashboard logic into smaller feature modules
- add browser-level workflow testing
- improve production-ready reporting and exports

## Summary

eNest is already functioning as a strong prototype for a service operations dashboard. The current system includes business onboarding, subscription management, department/account control, transaction processing, and role-based access, while still leaving backend integration and production hardening for the next stage.
