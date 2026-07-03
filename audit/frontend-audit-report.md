# eNest Frontend Audit Report

Audit scope: frontend-only review of the current Next.js 16 + TypeScript codebase. No source code was changed for this audit.

Notes:

- `components/modals/` does not exist in this workspace. Modal implementations are currently under `components/ui/`, `components/ui/state/`, and `components/dashboard/CustomerPaymentModal.tsx`.
- The working tree already contains many unrelated modified/untracked files. This report reflects the current filesystem state at audit time.
- Some report items reference recently added local-only Color Master files; those are frontend-only and not backed by a PHP endpoint.

## 1. API Route Inventory

| Route File | Methods | Backend Endpoint | Description | Error Handling |
|---|---:|---|---|---|
| `app/api/accounts/route.ts` | GET, POST | `getAccounts`, `createAccount`, `deleteAccount` | Lists accounts; creates/deletes accounts through action payloads. | Yes; validates payload/action, try/catch around backend calls. |
| `app/api/auth/login/route.ts` | POST | none directly; uses `loginWithCredentials` | Backward-compatible login route. | Yes; maps `LoginApiError` and generic errors. |
| `app/api/auth/logout/route.ts` | POST | none | Clears auth cookies. | Minimal; no try/catch because operation is local cookie mutation. |
| `app/api/business-users/route.ts` | GET, POST | `getUsers`, `createUserByAdmin` | Admin business-user list/create; POST also checks duplicates via `getUsers`. | Yes; validates payload and catches backend errors. |
| `app/api/customer-balance/route.ts` | POST | `getCustomerBalance`, `payCustomerBalance` | Lists balance rows and records customer balance payments. | Yes; validates action/payload and catches backend errors. |
| `app/api/customer-outstanding/route.ts` | POST | `getCustomerOutstanding`, fallback `getCustomerBalance` | Lists customer outstanding rows, with fallback for missing backend endpoint. | Yes; catches 404/501 fallback and generic errors. |
| `app/api/customer-payments/route.ts` | POST | `getCustomerPayments` | Lists customer payment ledger rows. | Yes; validates JSON and catches backend errors. |
| `app/api/customers/route.ts` | GET, POST | `getCustomers`, `createCustomer`, `updateCustomer`, `deleteCustomer` | Lists and mutates customers. | Yes; validates action/payload and catches backend errors. Contains debug logging. |
| `app/api/dashboard-summary/route.ts` | GET | env `NEXT_PUBLIC_API_DASHBOARD_SUMMARY_PATH` | Loads dashboard summary via configured backend path. | Yes; returns 500 when env is missing and backend status on backend errors. |
| `app/api/departments/route.ts` | GET, POST | `getCounters`, `createCounter` | Lists departments/counters and creates/updates department data through create endpoint. | Yes. |
| `app/api/employees/route.ts` | GET, POST | `getEmployees`, `createEmployee`, `updateEmployee`, `deleteEmployee` | Lists and mutates employees. | Yes; validates action/payload. Contains debug logging. |
| `app/api/expense-categories/route.ts` | GET, POST | `expense-types?status=1&page_no=1&limit=500`, `createExpenseType`, `updateExpenseType`, `changeExpenseTypeStatus` | Compatibility route for expense categories. | Yes. |
| `app/api/expense-types/route.ts` | GET, POST | `expense-types?status=1&page_no=1&limit=500`, `createExpenseType`, `updateExpenseType`, `changeExpenseTypeStatus` | Current expense type route. | Yes. Contains debug logging. |
| `app/api/expenses/route.ts` | POST | `getExpenses`, `createExpense`, `updateExpense`, `deleteExpense` | Lists and mutates expenses through action payloads. | Yes. |
| `app/api/expenses/[expenseId]/route.ts` | PUT, DELETE | `updateExpense`, `deleteExpense` | REST-style update/delete for one expense. | Yes. |
| `app/api/inventory/route.ts` | GET, POST | GET: built inventory query; POST: `createInventory`, `updateInventory`, `deleteInventory` | Lists and mutates inventory. | Yes. |
| `app/api/login/route.ts` | POST | none directly; uses `loginWithCredentials` | Legacy login route. | Yes. |
| `app/api/reports/route.ts` | GET | env `NEXT_PUBLIC_API_REPORTS_PATH` | Loads reports via configured backend path. | Yes, but env is not present in `.env.local`. |
| `app/api/roles/route.ts` | GET, POST | `getRoles`, `createRoleByAdmin`, `updateRoleByAdmin`, `deleteRoleByAdmin` | Lists and mutates role templates. | Yes. |
| `app/api/transactions/route.ts` | GET, POST | `getTransactions`, `createTransaction`, `updateTransaction`, `deleteTransaction`, `payTransaction` | Lists, creates, updates, deletes, and pays transactions. | Yes. |
| `app/api/transactions/[id]/route.ts` | GET | `transactions/{id}` | Detail endpoint proxy for transaction view/edit. | Yes. |
| `app/api/userapi/customerPaymentList/route.ts` | GET | `userapi/customerPaymentList?customer_id=...&page=...` plus optional dates/limit | Customer payment list endpoint. | Yes. |
| `app/api/userapi/customerSearch/route.ts` | GET | `userapi/customerSearch?q=...` | Customer autocomplete for payment list. | Yes. |
| `app/api/userapi/dashboardStats/route.ts` | GET | `userapi/dashboardStats` | Old-dashboard stats for cards/charts. | Yes, logs status and returns fallback JSON on failure. |

## 2. Data Flow Analysis

### 2.1 Customer Payment: Outstanding Pay button

Status: Pass with cleanup issues.

Flow:

1. `CustomerOutstandingTable` renders Pay action and calls `onPay(row)`.
2. `CustomersTab` stores the selected balance row in `payingBalance`.
3. `CustomersTab` renders `CustomerPaymentModal` with customer id/name/code/current/today balance.
4. Modal validates amount/date/customer/account when applicable.
5. Modal preview calculates `newBalance = currentBalance + paymentAmount`.
6. Submit calls `handleCustomerBalancePayment`.
7. `Dashboard.handleCustomerBalancePayment` calls `payCustomerBalance`.
8. `lib/api/customerBalance.ts` posts to `/api/customer-balance` with `action: 'pay'`.
9. `app/api/customer-balance/route.ts` forwards to PHP backend `payCustomerBalance`.
10. Success calls reload functions and closes modal.

Checks:

- Payment amount is sent as `paymentAmount: numericAmount`. Positive payment remains positive.
- Balance preview is correct for owed balances: `currentBalance + payment`.
- UI refresh: payment success calls modal `onSuccess`; Outstanding path refreshes selected/current outstanding data and `Dashboard.handleCustomerBalancePayment` also reloads balances/accounts/departments.
- Today's Balance is displayed read-only from `target.todayBalance`; it is not predicted on the frontend.

Issues:

- `CustomerPaymentModal.tsx` still displays mojibake rupee text (`â‚¹`) in `formatCurrency`, `formatPaymentAmount`, and preview strings. Functionally correct, visually wrong.
- Negative payment support exists but the label always says `Payment Received` and uses green `+₹abs(amount)` even for negative reversals. That conflicts with earlier negative-payment requirement.

### 2.2 Add Transaction: ServiceForm submission

Status: Mostly pass.

Flow:

1. Submit opens confirmation via `isSaveConfirmationOpen`.
2. Confirm runs existing validation/submission path.
3. Existing validations include customer, department, inventory/stock, remarks, rows, customer creation flow.
4. Transaction call goes to `createTransaction`/`updateTransaction`.
5. API function calls `/api/transactions`.
6. Next route forwards to backend `createTransaction`/`updateTransaction`.
7. On success, add mode calls `resetForm()` and `router.refresh()`.

Checks:

- Confirmation wrapper is present.
- Add page resets after success via `resetForm()`.
- `resetForm()` clears selected customer, draft customer, rows, current row, payment fields, notes/remarks, stock error, confirmation state, and dirty state.
- `router.refresh()` is called after reset in add mode.
- Customer list reload is triggered when a new customer is created through `onCustomersChanged`.

Issues:

- Customer balance refresh after transaction submit depends on parent callbacks/revalidation. `ServiceForm` itself does not directly call `reloadCustomerBalance`.
- Update/edit flow still does navigation behavior (`router.push('/transactions/list')` branch may exist depending mode); verify expected behavior for edit mode separately.

### 2.3 Customer Search: Customer Payment List

Status: Pass.

Flow:

1. User types into `CustomerPaymentListTab`.
2. Search effect enforces `searchTerm.length >= 3`.
3. Debounce is `400ms`.
4. `searchCustomers` calls `/api/userapi/customerSearch?q=...`.
5. Dropdown renders `name / code / phone`.
6. Selecting customer sets selected state, page 1, and empties old page.
7. Ledger effect calls `getCustomerPaymentPage(selectedCustomer.id, page, limit, dateFrom, dateTo)`.
8. Pagination state drives page and limit reloads.

Checks:

- Minimum 3 characters enforced.
- Debounce is correct at 400ms.
- Selection triggers payment list load because `selectedCustomer` is in the ledger effect dependency list.
- Pagination works with `page`, `limit`, date filters, and `reloadToken`.
- Page size persists to localStorage key `customer_payments_page_size`.

Issues:

- Page size options here are `[10,20,50,100,500]`, while the later global pagination requirement specified `[10,25,50,100]`. This page intentionally differs from the global standard.

### 2.4 Dashboard Stats

Status: Pass with weak fallback surfacing.

Flow:

1. `DashboardTab` calls `useDashboardStats(true)`.
2. Hook calls `/api/userapi/dashboardStats`.
3. Route forwards to `userapi/dashboardStats`.
4. Hook maps `stat_cards`, `amounts_pie`, `top_services`, `top_users`.
5. `DashboardStatsSection` renders stat cards, pie chart, top services bar, top users bar.

Checks:

- `.env.local` contains `NEXT_PUBLIC_API_DASHBOARD_SUMMARY_PATH=userapi/dashboardStats`.
- `/api/userapi/dashboardStats` route exists.
- All required hook fields are mapped.
- All four UI sections exist.

Issues:

- `useDashboardStats` ignores the route-level `success: false` case if the response is still JSON with `data` missing; it maps null/fallback without surfacing an error strongly.
- `DashboardTab` appears to call `useDashboardStats(true)` unconditionally; rendering is gated for non-admin, but the API may still fire for Admin depending code path.

### 2.5 Customer Outstanding List

Status: Partial pass.

Flow:

1. `Dashboard` calls `useCustomerOutstanding(shouldLoadCustomerOutstandingApi, undefined, outstandingPage, outstandingLimit)`.
2. Hook posts to `/api/customer-outstanding`.
3. Next route calls `getCustomerOutstanding`, falling back to `getCustomerBalance` on 404/501.
4. Mapper maps rows and pagination.
5. Dashboard passes rows to `CustomersTab`, then `CustomerOutstandingTable`.

Checks:

- `useCustomerOutstanding` accepts `page` and `limit`.
- It does not pass date filters.
- Current Balance renders positive values with `+`.
- Today's Balance renders signed due/advance and positive values with `+`.
- Remark column is removed/commented from rendered columns.
- Customer name color is applied from `row.color`.

Issue:

- The requested filter logic says show if `currentBalanceStatus != 0 OR todayBalance != 0`. Current `Dashboard.tsx` sets `const nonZeroCustomerOutstandingRows = customerOutstandingRows;`, so no zero filtering is applied at all. If backend returns clear rows, they will be displayed.

## 3. Type Safety Issues

### High severity

1. `components/tables/ServicesTable.tsx:79`
   - Current: `(service as any).addedByName`.
   - Should be typed on `Service`/inventory row and accessed as `service.addedByName`.

2. `components/common/ReusableListTable.tsx:69`
   - Current: `record as Record<string, unknown>`.
   - Should use a generic row constraint or a safe accessor helper.

3. API response parsing uses many `as unknown`/`as Record<string, unknown>` assertions in auth/API/mappers.
   - Examples: `lib/hooks/useDashboardStats.ts:44-49`, `lib/api/client.ts:23`, `lib/api/backendFetch.ts:55`.
   - Safer approach: shared `isRecord`, `readRecordValue`, and typed mapper functions.

### Medium severity

1. `CustomersTable.tsx:50,59,99`
   - Casts directory records to role/customer subtypes.
   - Use discriminated union helpers (`isBusinessCustomer`, `isBusiness`) instead.

2. `ServiceForm.tsx:1039,1048`
   - `removedRow.childId as string` assumes childId is present.
   - Should narrow with `typeof removedRow.childId === 'string'`.

3. `store.tsx` has extensive migration casts:
   - `normalizeBusinessCustomer(customer as Partial<BusinessCustomer>...)`
   - `normalizeTransaction(transaction as Partial<Transaction>...)`
   - Acceptable for migration boundary, but should remain isolated.

### Interface checks

- `BusinessCustomer` has: `id`, `name`, `phone`, `email`, `dob`, `address`, `remark`, `color`, `status`, `customerCode`, `joinedDate`, `addedDate`, `updatedDate`.
- `BusinessCustomer` also now has `colorId`.
- `CustomerBalance` has: `id`, `customerId`, `customerCode`, `customerName`, `phoneNo`, `currentBalanceStatus`, `todayBalance`, `todayBalanceStatus`, `color`.
- `Service` has `addedByName?: string | null`.

### Mapper field risks

- `customer-balance-mapper.ts` correctly includes `phone` and `phone_no`.
- `transaction-mapper.ts` includes broad field aliases; some are speculative (`transaction_child`, `child_rows`, etc.). This is acceptable as defensive mapping but should be documented against actual PHP responses.
- `dashboard-summary-mapper.ts` uses `summaryRecord as UnknownRecord`; safe enough if payload shape is validated first, but currently relies on fallback empty record.

## 4. Permission System Issues

### `module-actions.ts`

- Business owner (`role === 'Customer'`) is intentionally allowed full manage access for business modules without permission gate. This matches existing comment and behavior.
- Employee path checks `employeeManageableModules` and then delegates to `canUseBusinessFeature` for permission-backed modules. This is correct in principle.
- New/extra master module `colors` is currently included in manageable/deletable sets and permission maps, but it is frontend-local. If Color Master becomes backend-backed, add a real permission flag.

### `feature-access.ts`

- Customers `edit` returns true when `customers_add` or `customers_list` is enabled. That is permissive. If list-only employees should not edit, this is a bug.
- Business owners do not go through `feature-access` for add/edit in `module-actions.ts`; they are allowed by role-level branch. That is intentional.

### `session-access.ts`

- `safeBaseModules` in `module-permissions.ts` includes `dashboard` and `profile`.
- `canAccessModuleForSession` correctly allows these for non-admin business contexts.

### `Dashboard.tsx`

- `shouldLoadEmployeesApi` is set near line 590. It should be reviewed carefully: employee profile and profile-page needs can require employees even outside the Employee tab.
- `canEditCustomerRecords = canPerformModuleAction('customers', 'edit')` is correctly centralized.

### `Sidebar.tsx`

- Current `MASTER_MODULE_IDS` is `['departments', 'services', 'accounts', 'colors']`, not the older requested `['departments', 'services', 'accounts']`.
- These are excluded from main nav and grouped under Master.
- Master auto-expands when `activeTab` is any master id or when path is `/expenses/categories`.

## 5. Hooks & State Issues

| Hook | Loading | Error | Cleanup | Enabled Guard | Notes |
|---|---:|---:|---:|---:|---|
| `useAccounts` | Yes | Yes | Via `useApiCollection` cancellation flag | Yes | Good. |
| `useApiCollection` | Yes | Yes | cancellation flag | Yes | No AbortController; prevents state update after unmount but request still runs. |
| `useApiResource` | Yes | Yes | cancellation flag | Yes | Same as above. |
| `useBackendBusinesses` | Yes | Yes | cancellation flag | Yes | Paginated and localStorage page size. |
| `useCustomerBalance` | Yes | Yes | via collection hook | Yes | Hardcodes limit 10; may not load all balances. |
| `useCustomerColors` | Yes | Yes | Not needed; localStorage only | No explicit enabled | Frontend-only local state. |
| `useCustomerOutstanding` | Yes | Yes | cancellation flag | Yes | Accepts page and limit; does not pass dates. |
| `useCustomerPayments` | Yes | Yes | via collection hook | Yes | Hardcoded limit 10. |
| `useCustomers` | Yes | Yes | cancellation flag | Yes | Server pagination; uses persistent page size. |
| `useDashboardStats` | Yes | Yes | via resource hook | Yes | Maps all requested dashboardStats fields. |
| `useDashboardSummary` | Yes | Yes | via resource hook | Yes | Depends on env path route. |
| `useDepartments` | Yes | Yes | via collection hook | Yes | Good. |
| `useEmployees` | Yes | Yes | via server pagination hook | Yes | Triggering depends on `Dashboard.tsx` `shouldLoadEmployeesApi`. |
| `useExpenses` | Yes | Yes | via server pagination hook | Yes | Good. |
| `useInventory` | Yes | Yes | via collection hook | Yes | Maps `added_by_name` to `addedByName`. |
| `usePersistentPageSize` | N/A | N/A | N/A | N/A | Reads/writes localStorage. |
| `useReports` | Yes | Yes | via collection hook | Yes | Route env missing issue for reports. |
| `useRoleTemplates` | Yes | Yes | cancellation flag | Yes | Good. |
| `useServerPagination` | Yes | Yes | cancellation flag | Yes | Resets page on requestKey/limit changes. |
| `useTransactions` | Yes | Yes | via collection hook | Yes | Hardcodes limit 10. |

Specific findings:

- `useCustomerOutstanding` accepts page and limit and does not pass `date_from`/`date_to`, which matches the “remove date filter for outstanding” requirement.
- `useDashboardStats` maps stat cards, pie, top services, and top users.
- `useInventory` maps `added_by_name`.
- Employee profile loading should be verified through `Dashboard.tsx`, not `useEmployees` itself.

## 6. Component Issues

### `Dashboard.tsx`

- File length is about 4,989 lines. This is a major maintainability issue. It should be split into:
  - data orchestration hook,
  - modal controller,
  - permissions adapter,
  - tab context provider,
  - route/page state modules.
- Contains debug logs:
  - Customer outstanding context log around line 651.
  - `Customer Before Edit` around line 2141.
  - `Update Payload` around line 3317.
- Large number of state variables and handlers makes unused-state analysis difficult without a compiler rule. Enable ESLint `no-unused-vars` for TS or TypeScript `noUnusedLocals`.

### `CustomerOutstandingTable.tsx`

- Positive balances use `+` prefix.
- Remark column is not rendered.
- Customer color is applied via `CustomerName`.
- Debug log remains in non-production block.

### `CustomersTable.tsx`

- Remark column exists, but currently renders raw text (`customer.remark || 'Not added'`) instead of `RemarkCell`. This fails the expandable remark requirement.
- Customer color is applied through `CustomerName`.
- Edit button calls `onEdit(customer.id)`, which is wired to `handleEditCustomer` by `CustomersTab`.

### `ServicesTable.tsx`

- Stock/status logic should be reviewed: it uses `(service as any).addedByName`; type should be fixed.
- Audit scan confirms Added By field is present through `addedByName`.
- Verify visually that stock columns show dash/blank for services and values only for products.

### `CustomerPaymentModal.tsx`

- `newBalance` is calculated as `currentBalance + paymentAmount`.
- Preview label is `Payment Received`, green, with plus prefix.
- Today's balance is read-only from target and not recalculated.
- Visual bug: rupee symbol is mojibake (`â‚¹`) in this file.
- Negative amount display is misleading as noted in Data Flow section.

### `CustomerForm.tsx`

- DOB field exists.
- Current implementation uses Color Master dropdown, not the earlier preset color picker. This intentionally conflicts with the latest Color Master requirement but fails the older “presets” audit check.
- Live name preview exists in selected color.
- Submitted fields include name, phone, email, address, DOB, remark, `colorId`, `color`, status, joined/added/updated dates.

## 7. Next.js API Route Issues

- All current `app/api/**/route.ts` files have `export const dynamic = 'force-dynamic'`.
- All routes except `auth/logout` have try/catch style error handling. `auth/logout` is local cookie clearing and acceptable.
- `/api/userapi/dashboardStats` exists.
- `.env.local` contains `NEXT_PUBLIC_API_DASHBOARD_SUMMARY_PATH=userapi/dashboardStats`.
- `NEXT_PUBLIC_API_REPORTS_PATH` is referenced by `app/api/reports/route.ts` but is missing from `.env.local`.
- Frontend expects `/api/expense-types`; route exists.
- Frontend expects `/api/userapi/customerSearch` and `/api/userapi/customerPaymentList`; both exist.
- Frontend local Color Master has no `app/api` route and no backend route. This is acceptable only if Color Master is intended to be browser-local.

## 8. Unnecessary Code

### Debug logging left in code

- `lib/api/customers.ts:124-135`
- `lib/api/expenseCategories.ts:104-121`
- `lib/api/employees.ts:167-176`
- `app/api/customers/route.ts:193-205`
- `app/api/employees/route.ts:196-205`
- `app/api/expense-types/route.ts:97-146`
- `app/api/customer-outstanding/route.ts:46-47`
- `lib/api/customerOutstanding.ts:12-13`
- `lib/hooks/useCustomerOutstanding.ts:85-88`
- `components/tables/CustomerOutstandingTable.tsx:46-47`
- `components/common/ReusableListTable.tsx:153-154`
- `components/dashboard/Dashboard.tsx:651-652, 2141, 3317`

### TODO/commented blocks

- `app/api/auth/login/route.ts`: TODO for backward-compatible route.
- `app/api/auth/logout/route.ts`: TODO for backward-compatible route.
- `lib/mappers/transaction-mapper.ts:61`: TODO to expand backend payment detail mapper.
- `CustomerOutstandingTable.tsx` has a commented-out remark column. Remove it if not needed.

### Potentially unused or stale

- `ExpenseForm` legacy modal path still exists in `Dashboard.tsx` while `ExpenseTab` now has its own `ExpenseEntryForm` workflow. Confirm whether legacy `activeModal === add-expense/edit-expense` remains reachable.
- `components/common/ReusableListTable.tsx` still contains Customers Outstanding debug logic although current outstanding table uses `CustomerOutstandingTable`.
- `lib/api/customerColors.ts` and `useCustomerColors` are local-only; if backend persistence is required, these should be replaced by API-backed hooks.

## 9. Performance Issues

1. Large lists:
   - Most core modules are paginated now.
   - Some hooks still use hardcoded `limit: 10` (`useTransactions`, `useCustomerBalance`, `useCustomerPayments`) and may not expose page-size control.
   - Color Master loads from localStorage and is small.

2. Virtualization:
   - No virtualized table implementation detected. Current DataTable is fine for paginated datasets but not unlimited lists.

3. Debouncing:
   - Customer Payment List search is debounced at 400ms.
   - ServiceForm customer search uses debounce and cleanup.
   - Other search/filter inputs are mostly client-side and immediate.

4. Re-render risk:
   - `Dashboard.tsx` centralizes too much state and passes a very large context object. This likely causes broad child rerenders.
   - `DashboardTabContext` value should be memoized carefully and split by feature if performance becomes visible.

5. Fetching:
   - Collection hooks use enabled guards.
   - Hooks use cancellation flags, not AbortController, so HTTP requests still continue after unmount in many hooks.

6. Images:
   - No significant image usage found in audited app/components path. No `next/image` issue observed.

## 10. Environment & Config Issues

`.env.local` currently contains:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost/enest_api/api
NEXT_PUBLIC_API_DASHBOARD_SUMMARY_PATH=userapi/dashboardStats
```

Findings:

1. `NEXT_PUBLIC_API_BASE_URL` is set. It points to a localhost CodeIgniter API. Correctness depends on local XAMPP/backend path.
2. `NEXT_PUBLIC_API_DASHBOARD_SUMMARY_PATH` is set.
3. Missing referenced variable:
   - `NEXT_PUBLIC_API_REPORTS_PATH`, used by `app/api/reports/route.ts`.
4. `NEXT_PUBLIC_API_BASE_URL` exposes backend URL to browser code because it is public. This appears intentional because client auth code also references it. No secret keys are present.
5. No private secrets were found in `.env.local`.

## 11. Summary — Top 10 Most Important Things to Fix

1. Fix rupee-symbol mojibake (`â‚¹`) across UI files; it affects payment modal, transactions, expenses, and currency display.
2. Decide and implement correct Customer Outstanding filtering: `currentBalanceStatus != 0 OR todayBalance != 0`.
3. Remove production/debug logs from API routes, hooks, and dashboard code.
4. Split `Dashboard.tsx` into smaller orchestration modules; at ~4,989 lines it is too large.
5. Fix `CustomersTable` remark column to use `RemarkCell`.
6. Add missing `.env.local` value `NEXT_PUBLIC_API_REPORTS_PATH` or remove/replace `app/api/reports` env dependency.
7. Replace `(service as any).addedByName` in `ServicesTable` with proper typing.
8. Clarify negative customer payment UX: current API supports negative numbers, but preview labels and green plus display imply positive payment.
9. Decide whether Color Master must be backend-persisted. Current implementation is localStorage-only and will not sync across devices/users.
10. Tighten employee/customer permission semantics: `customers_list` currently grants edit through `feature-access.ts`; confirm whether list-only employees should edit.

