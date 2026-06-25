# Frontend API Audit Report

Audit scope: eNest ERP frontend, Next.js + TypeScript.

Audit method: static source inspection of page components, client API helpers, hooks, local Next.js route handlers, backend proxy calls, response mappers, loading/empty/error states, and pagination behavior.

## Summary

- Total API modules checked: 10.
- Frontend API connection groups checked: 14, as listed in the API URL and Method Matrix.
- Search/filter paths checked: 9, including missing and dormant search paths.
- Structurally working API modules: Transaction List, Add Transaction Customer Search, Expense Categories, Expense List, Accounts list/create/delete, Departments list/create, and Inventory list/CRUD.
- APIs/features with material issues: Customer Payment Ledger, Customers List Search, Customers Outstanding, Account edit, Department edit/delete, and dormant Inventory search.
- Critical issues:
  - Protected browser requests do not explicitly set `credentials: "include"`. Same-origin cookies normally work because fetch defaults to `same-origin`, but the implementation does not meet the stated JWT/httpOnly-cookie requirement and is fragile if the API origin changes.
  - Admin Customers/Users search filters only the currently loaded backend page. The search term is not sent to `/api/business-users`, so matching users on other pages cannot be found.
  - Admin Customers/Users pagination remains based on backend totals while the current page is filtered locally. Search results and pagination therefore represent different datasets.
  - Customer Payment List Ledger search loads ledger data through `/api/customer-outstanding`, not `/api/customer-payments`. This can omit payment-specific records or rely on a balance endpoint returning full ledger rows.
  - Account edit and Department edit/delete update only local frontend state; no matching protected backend API request is made.
  - `useInventory` supports `search` and `type` filters in the API but excludes both from its request key, so changing those filters would not reliably trigger a new request.
  - Add Transaction and Customer Ledger customer searches use debounce and stale-response flags, but do not abort in-flight requests.
  - The Account mapper defaults missing `current_balance` to `0` rather than `opening_balance`. Existing tests also show account/counter mapping expectation failures.

## Shared API and Authentication Findings

### Browser-to-Next.js API client

- File: `lib/api/client.ts`
- Function: `requestAppApi`
- Behavior:
  - Uses same-origin relative URLs such as `/api/customers`.
  - Uses `cache: "no-store"`.
  - Supports `AbortSignal`.
  - Does not set `credentials`.
- Credentials included: No, not explicitly.
- Practical result: Same-origin fetch includes same-origin cookies by default. The httpOnly cookie should therefore reach the local Next.js route under the current same-origin deployment.
- Issue: The required explicit `credentials: "include"` is absent.
- Suggested fix: Add `credentials: "include"` to the shared fetch options and to direct fetch wrappers such as `requestBusinessUsersApi`.

### Next.js API-to-backend client

- File: `lib/api/backendFetch.ts`
- Function: `backendFetch`
- Behavior:
  - Reads the JWT from the httpOnly auth cookie using `cookies()`.
  - Sends the token to the backend in the `Authorization` header.
  - Sends JSON or URL-encoded form bodies.
  - Uses `cache: "no-store"`.
- Credentials included: Yes, through the server-side `Authorization` header.
- Issue: None in the inspected authentication flow.

### Shared collection state

- File: `lib/hooks/useApiCollection.ts`
- Behavior:
  - Replaces collection state with `setData(runMapResponse(payload))`.
  - Clears data on request errors.
  - Uses an `isCancelled` cleanup flag to stop stale state updates.
  - Does not abort the network request.
- Replace or append: Replace.
- Race protection: State-update protection only; network request is not cancelled.

## Module-wise Findings

### 1. Transaction List Search

**Module Name:** Transaction List Search  
**Page/File:** `app/(workspace)/transactions/list/page.tsx`  
**Component Name:** `TransactionsListTab` in `components/dashboard/active-tab/TransactionsListTab.tsx`  
**API Function/File:** `getTransactions` and `buildTransactionsListPath` in `lib/api/transactions.ts`  
**Endpoint Called:** Frontend `GET /api/transactions`; backend `POST getTransactions`  
**HTTP Method:** Browser GET; backend POST  
**When API is called:** On page/component activation, selected counter change, page change, search change after debounce, and search clear.  
**Debounce used:** Yes, 400 ms while search is non-empty; no delay for default list loading.  
**Minimum characters required:** None. A one-character search calls the API.  
**Search Param:** `search=<trimmed-lowercase-value>`  
**Query Params Sent:**

- `search`, when non-empty
- `pageNo`
- `limit`
- `status`
- `counterId`, when selected
- Optional detail filters: `transactionId`, `customerId`, `date`

**Request Payload:** No browser request body. The local route converts query params into:

```text
page_no
limit
status
search
transaction_id
customer_id
counter_id
date
```

**Backend Route Match:** Yes. `app/api/transactions/route.ts` exports `GET` and forwards to backend `getTransactions`.  
**Response Mapping:** `mapTransactionsPageResponse` and `mapTransactionRecord` in `lib/mappers/transaction-mapper.ts`.

Important field normalization includes:

- `customer_name` -> `customerName`
- `customer_code` -> `customerCode`
- `mobile_no` -> `customerPhone`
- `invoice_id` -> `invoiceId`
- `account_name` -> `accountLabel`
- `counter_name` / `department_name` -> `counterName` / `departmentName`
- snake_case and camelCase variants are supported.

**State Updated:**

- `transactions`
- `listPagination`
- `isListLoading`
- `listError`

**Does it replace data or append data:** Replace. Previous rows are cleared before each request.  
**Loading State Used:** Yes. Rows are cleared and the table loading skeleton is shown.  
**Empty State Used:** Yes. Active search shows `No matching records found`.  
**Error Handling:** Request errors clear rows, reset fallback pagination, and display the API error in the table.  
**Credentials included:** No explicit `credentials: "include"` in browser fetch; same-origin cookies are implicit. Backend authorization is included by the server proxy.  
**Race Condition Check:** Good. Uses both `AbortController` and request sequence tracking.  
**Pagination Check:** Search term and current page are sent together. Search pagination is isolated from the default list request.

**Current Behavior:** Correctly trims, debounces, replaces rows, cancels stale requests, and submits filtered pagination parameters. It additionally applies a frontend match guard across required fields to prevent unrelated records from rendering.

**Possible Issue:**

- No minimum character rule means short searches can create broad and expensive backend queries.
- `readBackendPagination` reads only a top-level `pagination` object. If the backend returns `data.pagination`, fallback totals will reflect only the current page.
- The frontend post-filter can hide backend rows if backend search fields and frontend mapped fields differ, while pagination may still report those hidden rows.
- The input placeholder mentions only customer, code, and invoice although mobile, account, and counter are also supported.

**Suggested Fix:**

- Confirm the backend pagination envelope and extend pagination mapping if it is nested.
- Consider a two- or three-character minimum if backend load is high.
- Align the placeholder/help text with all supported fields.
- Keep the frontend match guard only if backend search correctness cannot be guaranteed.

### 2. Add Transaction Customer Search

**Module Name:** Customer Search in Add Transaction  
**Page/File:** `app/(workspace)/transactions/add/page.tsx`  
**Component Name:** `ServiceForm` in `components/forms/ServiceForm.tsx`  
**API Function/File:** `getCustomers` in `lib/api/customers.ts`  
**Endpoint Called:** Frontend `GET /api/customers?search=<value>&status=1`; backend `POST getCustomers?search=<value>&status=1`  
**HTTP Method:** Browser GET; backend POST  
**When API is called:** When the user types at least three trimmed characters, is not editing a transaction, and has not already selected a customer.  
**Debounce used:** Yes, 300 ms.  
**Minimum characters required:** 3.  
**Query Params Sent:**

- `search`, trimmed
- `status=1`

**Request Payload:** No browser body. Backend receives the filters in the backend endpoint URL.  
**Backend Route Match:** Yes. `app/api/customers/route.ts` exports `GET`, forwards `search` and `status`, and calls backend `getCustomers` using POST.  
**Response Mapping:** `mapCustomersResponse` in `lib/mappers/customer-mapper.ts`.

Field normalization includes:

- `customer_name` -> `customerName` and `name`
- `mobile_no` -> `mobileNo` and `phone`
- `customer_code` -> `customerCode`
- `added_date` -> `addedDate`

**State Updated:**

- `customerOptions`
- `isCustomerSearchLoading`
- `hasCustomerSearchCompleted`
- `isCustomerDropdownOpen`

**Does it replace data or append data:** Replace with `setCustomerOptions(mapCustomersResponse(response))`.  
**Loading State Used:** Yes, `Searching customers...`.  
**Empty State Used:** Yes, `No customers found.`  
**Error Handling:** Errors clear options and show the same empty result state. The actual error message is not displayed.  
**Credentials included:** No explicit browser credentials option; same-origin cookies are implicit. Backend authorization is included by the local route.  
**Race Condition Check:** Partial. A 300 ms debounce and `isActive` cleanup prevent stale state updates, but in-flight fetches are not aborted.  
**Pagination Check:** No pagination params are sent. Search assumes the backend returns enough matching customer rows.

**Current Behavior:** Meets the required three-character rule and replaces old API results.

**Possible Issue:**

- Existing `customerOptions` are not cleared when a new search starts or falls below three characters. They are hidden by the loading/minimum-character UI, but stale data remains in memory.
- Network requests are not cancelled.
- Search errors are indistinguishable from valid empty results.
- `showNewCustomerDraft` requires more than three characters (`length > 3`), while API search starts at three. This creates a one-character behavioral inconsistency.

**Suggested Fix:**

- Clear `customerOptions` when a new search starts and when the query falls below three characters.
- Pass an `AbortSignal` through `getCustomers`.
- Store and display a search error separately from the empty state.
- Decide whether inline new-customer entry should start at `>= 3` or `> 3` and make it consistent.

### 3. Customer Payment List Ledger Search

**Module Name:** Customer Payment List Ledger Search  
**Page/File:** `app/(workspace)/customers/payments/page.tsx`  
**Component Name:** `CustomersTab` and `CustomerPaymentsTable`  
**API Function/File:**

- Customer lookup: `getCustomers` in `lib/api/customers.ts`
- Selected ledger: `getCustomerOutstanding` in `lib/api/customerOutstanding.ts`
- Hook: `useCustomerOutstanding` in `lib/hooks/useCustomerOutstanding.ts`

**Endpoint Called:**

- Customer lookup: `GET /api/customers?search=<value>&status=1`
- Ledger load: `POST /api/customer-outstanding`
- Backend ledger call: `POST getCustomerOutstanding`, with fallback to `POST getCustomerBalance`

**HTTP Method:** Browser GET for customer search; browser POST for ledger; backend POST.  
**When API is called:**

- Customer search starts after three characters and 300 ms.
- Ledger API starts only after a customer is selected.
- Reload occurs after a successful payment.

**Debounce used:** Yes, 300 ms for customer lookup.  
**Minimum characters required:** 3.  
**Query Params Sent:** Customer lookup sends trimmed `search` and `status=1`.  
**Request Payload:** Selected ledger request:

```json
{
  "action": "list",
  "pageNo": 1,
  "limit": 100,
  "status": 1,
  "customerId": "<selected customer id>"
}
```

The local route maps this to `page_no`, `limit`, `status`, and `customer_id`.

**Response Mapping:**

- Customer lookup: `mapCustomersResponse`
- Ledger: `mapCustomerBalanceResponse`
- Ledger mapping supports `debit`, `credit`, `running_balance`, account/bank/counter names, remarks, and added-by fields.

**State Updated:**

- Search options and dropdown state in `CustomersTab`
- Selected customer state
- `selectedCustomerOutstandingRows` through `useCustomerOutstanding`

**Does it replace data or append data:** Replace for both search results and ledger rows.  
**Loading State Used:** Yes, both search and ledger table loading states exist.  
**Empty State Used:** Yes, for no customer search results, no selected customer, and no ledger rows.  
**Error Handling:** Search errors are converted to empty results. Ledger errors are shown using `ErrorState`.  
**Credentials included:** No explicit browser credentials option; same-origin cookies are implicit. Backend authorization is included by the proxy.  
**Race Condition Check:** Customer search uses debounce and an `isActive` flag but no abort. Ledger hook prevents stale state updates but does not abort.  
**Pagination Check:** Ledger requests up to 100 records and renders no pagination.

**Current Behavior:** Customer lookup behavior is reasonable, but the selected ledger is loaded from the outstanding/balance API rather than the payment-history API.

**Possible Issue:**

- `lib/api/customerPayments.ts` and `/api/customer-payments` exist but are not used by this page. They are used only for the customer-history modal.
- If `getCustomerOutstanding` returns only balances rather than complete debit/credit ledger rows, the Payment List page will be incomplete or semantically incorrect.
- Fixed `limit: 100` can truncate long customer ledgers with no indication or pagination.
- The displayed current balance uses the last returned row without sorting, so correctness depends on backend ordering.

**Suggested Fix:**

- Confirm the backend contract. Use `/api/customer-payments` for payment history and combine it with transaction rows if a full ledger is required.
- Add server-backed ledger pagination.
- Sort ledger rows by date before choosing the latest balance.
- Add abort support to customer lookup.

### 4. Customers List Search

**Module Name:** Customers List Search  
**Page/File:** `app/(workspace)/customers/page.tsx`  
**Component Name:** `CustomersTab`, with filter state and filtering in `components/dashboard/Dashboard.tsx`  
**API Function/File:**

- Admin directory: `fetchBusinessDirectoryPage` in `lib/api/business-users.ts`
- Business customer directory: `getCustomers` in `lib/api/customers.ts`

**Endpoint Called:**

- Admin: `GET /api/business-users?page=<page>&limit=10`; backend `POST getUsers`
- Business/employee: `GET /api/customers`; backend `POST getCustomers`

**HTTP Method:** Browser GET; backend POST.  
**When API is called:**

- Admin directory: on mount, page change, and explicit reload.
- Business customer directory: when the Customers module is enabled/mounted and on reload.
- Search/filter changes do not trigger a customer-directory API call.

**Debounce used:** No API debounce. Admin filtering uses React `useDeferredValue`, which defers rendering but is not a timed debounce and does not control API calls.  
**Minimum characters required:** None.  
**Query Params Sent:**

- Admin API sends only `page` and `limit`.
- Business customer API sends no search params for the list view.
- The entered search term is not sent to either API.

**Request Payload:** Admin local route sends backend form fields:

```text
page_no
limit
role=2
```

**Response Mapping:**

- Admin: `mapBusinessesPageResponse` / `mapBusinessRecord`
- Business: `mapCustomersResponse`
- Both mappers normalize backend snake_case fields.

**State Updated:**

- Admin: `backendBusinesses`, backend pagination, loading, and error.
- Search: `businessDirectoryFilters`, then local `filteredBusinesses`.
- Business customer list: `apiCustomers` through `useCustomers`.

**Does it replace data or append data:** Replace.  
**Loading State Used:** Yes.  
**Empty State Used:** Yes.  
**Error Handling:** Admin and business list API errors are shown when no rows are available.  
**Credentials included:** No explicit credentials in either the shared fetch or the direct business-user fetch. Same-origin cookies are implicit. Backend authorization is included server-side.  
**Race Condition Check:** Admin paging hook prevents stale state updates but does not abort. Search itself is local.  
**Pagination Check:** Incorrect when Admin search/filter is active.

**Current Behavior:**

- Admin search filters only the 10 businesses already loaded for the current backend page.
- Business/employee customer list has no visible list-search control in `CustomersTab`.

**Possible Issue:**

- A matching user on another backend page is invisible to Admin search.
- Pagination uses backend totals while rows are filtered locally.
- `adminBusinessTotalRecords` subtracts one from the backend total (`totalRecords - 1`) and then takes a maximum with current filtered rows. This is an unexplained data-count adjustment and can create inaccurate totals.
- Changing search while on a later page does not reset the backend page to page 1.
- Non-admin customer directory search is absent.

**Suggested Fix:**

- Add `search`, status, permission, and date filters to the admin API contract where supported.
- Reset page to 1 when search/filter values change.
- Return pagination for the filtered backend dataset.
- Remove the unexplained `- 1` total adjustment unless it is backed by a documented backend rule.
- Add a business customer list search or explicitly document that the list is browse-only.

### 5. Customers Outstanding Search

**Module Name:** Customers Outstanding  
**Page/File:** `app/(workspace)/customers/outstanding/page.tsx`  
**Component Name:** `CustomersTab` and `CustomerOutstandingTable`  
**API Function/File:** `getCustomerOutstanding` and `useCustomerOutstanding`  
**Endpoint Called:** `POST /api/customer-outstanding`; backend `POST getCustomerOutstanding`, fallback `POST getCustomerBalance`  
**HTTP Method:** Browser POST; backend POST  
**When API is called:** On entering the permitted Outstanding page and on explicit reloads after balance-changing actions.  
**Debounce used:** No. There is no search input on this page.  
**Minimum characters required:** Not applicable.  
**Query Params Sent:** None.  
**Request Payload:**

```json
{
  "action": "list",
  "pageNo": 1,
  "limit": 10,
  "status": 1
}
```

**Response Mapping:** `mapCustomerBalanceResponse` normalizes customer code/name/mobile and balance fields.  
**State Updated:** `customerOutstandingRows`, loading, and error through `useCustomerOutstanding`.  
**Does it replace data or append data:** Replace.  
**Loading State Used:** Yes.  
**Empty State Used:** Yes.  
**Error Handling:** Error state is shown if no rows are available.  
**Credentials included:** No explicit browser credentials option; same-origin cookies are implicit. Backend authorization is included.  
**Race Condition Check:** Cleanup flag only; no abort.  
**Pagination Check:** The request is limited to 10 rows, but no table pagination is provided.

**Current Behavior:** A Customers Outstanding API exists, but Customers Outstanding search does not exist.

**Possible Issue:**

- Users can see only the first 10 backend rows with no next-page control.
- There is no customer-name, code, or mobile search.
- The fallback from `getCustomerOutstanding` to `getCustomerBalance` assumes compatible response semantics.

**Suggested Fix:**

- Add server-backed search and pagination to the Outstanding page.
- Send `search`, `pageNo`, and `limit` together.
- Confirm that the fallback endpoint returns the same record structure.

### 6. Expense Category APIs

**Module Name:** Expense Category APIs  
**Page/File:** `app/(workspace)/expenses/categories/page.tsx`, also loaded on add/list expense pages  
**Component Name:** `ExpenseTab` and `ExpenseEntryForm`  
**API Function/File:** `lib/api/expenseCategories.ts`  
**Endpoint Called:**

- `GET /api/expense-categories`
- `POST /api/expense-categories` for create/update/delete
- Backend: `getExpenseCategories`, `createExpenseCategory`, `updateExpenseCategory`, `deleteExpenseCategory`

**HTTP Method:** Browser GET/POST; backend POST  
**When API is called:** On every Expense view activation (`add`, `list`, or `categories`) and after category mutations.  
**Debounce used:** No search exists.  
**Minimum characters required:** Not applicable.  
**Query Params Sent:** None.  
**Request Payload:**

- List backend body: `{ "status": 1 }`
- Create: action plus category name
- Update: action, category id, name, and optional status
- Delete: action and category id

The local route sends both common backend aliases such as `name` and `category_name`, and `id` and `category_id`.

**Response Mapping:** `mapExpenseCategoriesResponse` in `lib/api/expenseCategories.ts`.

Normalization includes:

- `category_id` / `expense_category_id` -> `id`
- `category_name` / `expense_category_name` -> `name`
- status and added-date variants

**State Updated:** `categories`, loading, error, edit/delete modal state.  
**Does it replace data or append data:** Replace on category reload.  
**Loading State Used:** Yes.  
**Empty State Used:** Yes, through the category table.  
**Error Handling:** List errors are stored in `categoriesError`; mutations show action errors and notifications.  
**Credentials included:** No explicit browser credentials option; same-origin cookies are implicit. Backend authorization is included.  
**Race Condition Check:** No cancellation or request sequence in `loadCategories`.

**Current Behavior:** API routes and field mapping are aligned.

**Possible Issue:**

- Navigating among expense sub-pages reloads categories each time.
- Concurrent view changes can allow an older category request to overwrite a newer one.
- No explicit credentials option.

**Suggested Fix:**

- Load categories through a reusable cached hook with stale-request protection.
- Add explicit credentials to the shared API client.

### 7. Expense List APIs

**Module Name:** Expense List APIs and Search  
**Page/File:** `app/(workspace)/expenses/list/page.tsx`  
**Component Name:** `ExpenseTab` and `ExpensesTable`  
**API Function/File:** `lib/api/expenses.ts`, `lib/hooks/useExpenses.ts`  
**Endpoint Called:**

- List/create: `POST /api/expenses`
- Update: `PUT /api/expenses/[expenseId]`
- Delete: `DELETE /api/expenses/[expenseId]`
- Backend: `getExpenses`, `createExpense`, `updateExpense`, `deleteExpense`

**HTTP Method:** Browser POST/PUT/DELETE; backend POST  
**When API is called:**

- On entering the Expense List page.
- When the user clicks `Apply Filter`.
- When filters are cleared.
- After explicit reload following mutations.

Typing in the search input alone does not call the API.

**Debounce used:** No. The Apply Filter button is the trigger boundary.  
**Minimum characters required:** None. Empty search is allowed.  
**Query Params Sent:** None; filters are sent in JSON.  
**Request Payload for list:**

```text
action=list
pageNo=1
limit=100
status=1
counterId
accountId
staffId
paymentMode
dateFrom
dateTo
search
```

The local route converts these to snake_case backend fields.

**Response Mapping:** `mapExpensesResponse` in `lib/mappers/expense-mapper.ts`.

Normalization includes:

- `expense_id` -> `id` / `expenseId`
- `expense_title` -> `title`
- `category_id` / `category_name`
- `counter_id` / `counter_name`
- `payment_mode`
- `account_id` / `account_name`
- `expense_amount`

**State Updated:** `expenses`, loading, and error through `useExpenses`; `filteredExpenses` applies category filtering locally.  
**Does it replace data or append data:** Replace.  
**Loading State Used:** Yes.  
**Empty State Used:** Yes.  
**Error Handling:** API errors clear data and are shown in the table. Mutation errors are shown in modal/action state and notifications.  
**Credentials included:** No explicit browser credentials option; same-origin cookies are implicit. Backend authorization is included.  
**Race Condition Check:** `useApiCollection` prevents stale state updates but does not abort.  
**Pagination Check:** No UI pagination. It always requests up to 100 rows.

**Current Behavior:** Search is API-backed after the user clicks Apply Filter. Category filtering is not API-backed.

**Possible Issue:**

- `categoryId` is omitted from `ExpenseFilters` API payload and is applied only to the returned first 100 records.
- Search is not trimmed in `getExpenses`; the local route trims it before backend forwarding.
- No server-backed pagination; records beyond 100 are inaccessible.
- The API helper uses POST for list requests, which is valid because the local route matches, but should be documented consistently.

**Suggested Fix:**

- Send `categoryId` to the backend list endpoint.
- Trim search before constructing the request.
- Add backend pagination and table controls.
- Add an AbortSignal if filters may change quickly or requests are slow.

### 8. Account APIs

**Module Name:** Account APIs  
**Page/File:** `app/(workspace)/accounts/page.tsx`  
**Component Name:** `AccountsTab`, `AccountsTable`, and account form flow in `Dashboard`  
**API Function/File:** `lib/api/accounts.ts`, `lib/hooks/useAccounts.ts`  
**Endpoint Called:**

- List: `GET /api/accounts`; backend `GET getAccounts`
- Create: `POST /api/accounts`; backend `POST createAccount`
- Delete: `POST /api/accounts`; backend `POST deleteAccount`
- Update: No frontend/backend API call exists

**HTTP Method:** Browser GET/POST; backend GET/POST  
**When API is called:**

- Accounts load on the Accounts page and on other pages that require account dropdowns or balances.
- Create calls API on form submission.
- Delete calls API after confirmation.
- Edit does not call API.

**Debounce used:** No search exists.  
**Minimum characters required:** Not applicable.  
**Query Params Sent:** None.  
**Request Payload:**

- Create: `acc_holder`, `bank_name`, `acc_no`, `ifsc_code`, `branch`, `opening_balance`, `remark`, `status`
- Delete: `action=delete`, `id`

**Response Mapping:** `mapAccountsResponse` / `mapAccountRecord` in `lib/mappers/account-mapper.ts`.

Normalization includes:

- `acc_holder` -> `accountHolder`
- `acc_no` -> `accountNumber`
- `ifsc_code` -> `ifsc`
- opening/current balance and added-date aliases

**State Updated:**

- API list state through `useAccounts`
- Optimistic account state after create
- Local Redux/store state for edit

**Does it replace data or append data:** API list replaces. The Dashboard merges temporary optimistic records with API records.  
**Loading State Used:** Yes.  
**Empty State Used:** Yes.  
**Error Handling:** List errors are surfaced at module level. Create/delete errors show notifications.  
**Credentials included:** No explicit browser credentials option; same-origin cookies are implicit. Backend authorization is included.  
**Race Condition Check:** Hook cleanup flag only; no abort.

**Current Behavior:** List, create, and delete are connected. Edit is local-only.

**Possible Issue:**

- Editing an account dispatches `UPDATE_ACCOUNT` locally and shows success without calling a backend update endpoint. Changes will be lost after reload.
- `mapAccountRecord` defaults a missing current balance to `0`, even when an opening balance exists.
- Mapper forces `counterId: null`, discarding any backend account/counter relation.
- Existing tests report account mapper failures for current-balance fallback and expected mapped fields.
- No search or pagination exists.

**Suggested Fix:**

- Implement a protected account update route and call it before reporting success.
- Use `current_balance ?? opening_balance` unless the backend contract specifies otherwise.
- Preserve backend counter/account relationship fields.
- Reconcile mapper output with the existing account mapper tests.

### 9. Department APIs

**Module Name:** Department APIs and Search  
**Page/File:** `app/(workspace)/departments/page.tsx`  
**Component Name:** `DepartmentsTab`, `DepartmentsTable`, and department form flow in `Dashboard`  
**API Function/File:** `lib/api/departments.ts`, `lib/hooks/useDepartments.ts`  
**Endpoint Called:**

- List: `GET /api/departments`; backend `GET getCounters`
- Create: `POST /api/departments`; backend `POST createCounter`
- Update: No backend API call
- Delete: No backend API call

**HTTP Method:** Browser GET/POST; backend GET/POST  
**When API is called:**

- Department list is loaded as shared workspace shell data.
- Create calls API on form submission.
- Search does not call an API; it filters loaded departments when the user submits the search form.

**Debounce used:** No. Search is explicit-submit and local.  
**Minimum characters required:** None.  
**Query Params Sent:** None for list or search.  
**Request Payload for create:** `action=create`, `name`, `openingBalance`, `remark`; local route maps to `opening_balance`.  
**Response Mapping:** Department list ultimately maps through counter/department mappers.

Supported aliases include:

- `counter_id` / `department_id` -> id
- `counter_name` / `department_name` -> name
- balance, status, display, account-link, remark, and created-date fields

**State Updated:**

- API counter collection
- Local `departmentSearchQuery`
- Local Redux/store state for edit/delete

**Does it replace data or append data:** API list replaces. Search derives a filtered list without mutating source data.  
**Loading State Used:** Yes for list.  
**Empty State Used:** Yes for both no data and no local search matches.  
**Error Handling:** List errors are shown at module level; create errors are shown in form state.  
**Credentials included:** No explicit browser credentials option; same-origin cookies are implicit. Backend authorization is included.  
**Race Condition Check:** Hook cleanup flag only; no abort. Search is synchronous.  
**Pagination Check:** None.

**Current Behavior:** Local search works over all departments returned by the initial list. Create is backend-connected. Edit and delete are local-only.

**Possible Issue:**

- Edit and delete show successful frontend behavior without protected backend mutations.
- Existing tests expect generated counter codes such as `CTR-42`, while current department mapping generates `DPT-0042`.
- If the backend list is paginated by default, local search can only search the loaded subset.
- No explicit credentials option.

**Suggested Fix:**

- Implement backend update/delete routes before showing persistent success.
- Confirm and standardize the department/counter code format.
- Confirm whether `getCounters` returns the full collection; otherwise add server search/pagination.

### 10. Inventory APIs

**Module Name:** Inventory APIs  
**Page/File:** `app/(workspace)/services/page.tsx`; also used by Add/Edit Transaction  
**Component Name:** `ServicesTab`, `ServicesTable`, and inventory forms  
**API Function/File:** `lib/api/inventory.ts`, `lib/hooks/useInventory.ts`  
**Endpoint Called:**

- List: `GET /api/inventory?counter_id=<id>&status=1`
- Create/update/delete: `POST /api/inventory`
- Backend: `GET getInventory?...`, `POST createInventory`, `POST updateInventory`, `POST deleteInventory`

**HTTP Method:** Browser GET/POST; backend GET/POST  
**When API is called:**

- When a department is selected and the Inventory page, Add Transaction page, or transaction edit flow requires inventory.
- On selected counter/status request-key changes.
- After explicit reloads following inventory mutations.

**Debounce used:** No active inventory search UI exists.  
**Minimum characters required:** Not applicable.  
**Query Params Supported:**

- Required `counter_id`
- Optional `type`
- Optional `status`
- Optional trimmed `search`

**Request Payload for mutations:**

- Create/update: name, type, quantity, remark, counter id, optional status
- Delete: item id

**Response Mapping:** `mapInventoryResponse` in `lib/hooks/useInventory.ts`.

Normalization includes:

- `inventory_id` -> `id`
- `inventory_name` -> `name`
- `inventory_type` -> `type`
- `counter_id` -> `counterId`
- quantity, status, remark, added-date, and updated-date aliases

Mapped inventory records are then converted to the frontend `Service` model.

**State Updated:** Inventory collection, derived services, loading, error, and loaded status through `useApiCollection`.  
**Does it replace data or append data:** Replace.  
**Loading State Used:** Yes at module level, though `ServicesTable` itself does not receive an `isLoading` prop.  
**Empty State Used:** Yes.  
**Error Handling:** Module-level error state is shown when no services are available. Mutation helpers normalize API failures.  
**Credentials included:** No explicit browser credentials option; same-origin cookies are implicit. Backend authorization is included.  
**Race Condition Check:** Hook cleanup flag only; no abort.  
**Pagination Check:** None.

**Current Behavior:** Department-scoped list and CRUD routes are aligned. Search support exists in the API helper and local route but is not exposed in the current Inventory UI.

**Possible Issue:**

- `useInventory` request key includes only `counterId` and `status`; it omits `type` and `search`. If a future or hidden UI changes those filters, the hook may not refetch.
- `mapInventoryToService` hard-codes `departmentName: "General"` instead of using the selected department name.
- Loading is not passed into `ServicesTable` when old rows remain visible.
- No pagination or inventory search UI.

**Suggested Fix:**

- Include all effective filters in the request key, preferably with stable serialization.
- Pass selected department metadata into the service mapper.
- Add a department-scoped search UI if required and debounce it.
- Add explicit credentials and optional request cancellation.

## API URL and Method Matrix

| Module | Browser Endpoint | Browser Method | Backend Endpoint | Backend Method | Route Match |
|---|---|---:|---|---:|---|
| Add Transaction customer search | `/api/customers?search=...&status=1` | GET | `getCustomers?...` | POST | Yes |
| Transaction list search | `/api/transactions?search=...` | GET | `getTransactions` | POST | Yes |
| Customer payment ledger lookup | `/api/customers?search=...` | GET | `getCustomers?...` | POST | Yes |
| Customer payment ledger rows | `/api/customer-outstanding` | POST | `getCustomerOutstanding` / `getCustomerBalance` | POST | Route matches, semantic concern |
| Customer payment history utility | `/api/customer-payments` | POST | `getCustomerPayments` | POST | Yes, but not used by payment page |
| Admin customer/user directory | `/api/business-users?page=...&limit=...` | GET | `getUsers` | POST form | Yes |
| Business customer directory | `/api/customers` | GET | `getCustomers` | POST | Yes |
| Customers outstanding | `/api/customer-outstanding` | POST | `getCustomerOutstanding` / `getCustomerBalance` | POST | Yes |
| Expense categories | `/api/expense-categories` | GET/POST | category CRUD endpoints | POST | Yes |
| Expenses | `/api/expenses` | POST | `getExpenses` / `createExpense` | POST | Yes |
| Expense item | `/api/expenses/[expenseId]` | PUT/DELETE | `updateExpense` / `deleteExpense` | POST | Yes |
| Accounts | `/api/accounts` | GET/POST | account list/create/delete | GET/POST | Partial: update missing |
| Departments | `/api/departments` | GET/POST | counter list/create | GET/POST | Partial: update/delete missing |
| Inventory | `/api/inventory` | GET/POST | inventory list/CRUD | GET/POST | Yes |

## Search Trigger and Race-Condition Matrix

| Search Feature | API Trigger | Minimum | Debounce | Stale Protection | Abort | Pagination Correct |
|---|---|---:|---:|---|---|---|
| Add Transaction customer | Typing | 3 | 300 ms | Cleanup flag | No | No pagination |
| Transaction List | Typing/page change | None | 400 ms | Sequence + cleanup | Yes | Yes, subject to backend pagination shape |
| Payment Ledger customer | Typing | 3 | 300 ms | Cleanup flag | No | Customer lookup no pagination; ledger fixed at 100 |
| Admin Customers/Users list | Local filter only | None | `useDeferredValue` only | Not applicable | No | No |
| Business Customers list | No search UI | N/A | No | N/A | No | N/A |
| Customers Outstanding | No search UI | N/A | No | N/A | No | No; first 10 only |
| Expense List | Apply Filter button | None | No | Cleanup flag | No | No; first 100 only |
| Department Search | Submit button, local | None | No | Synchronous | N/A | Depends on full initial list |
| Inventory Search | API supports it; UI absent | N/A | No | Request-key issue | No | No |

## Response Mapping Assessment

- Customer mapping: Correctly normalizes `customer_name`, `mobile_no`, and `customer_code`.
- Transaction mapping: Broad normalization coverage for customer, invoice, account, counter, amount, and nested customer fields.
- Payment mapping: Correctly supports payment-specific debit/credit and account fields, but the Payment List page does not use this mapper.
- Outstanding/ledger mapping: Broad enough to display ledger-like rows, but endpoint semantics must be confirmed.
- Expense mapping: Correctly normalizes common snake_case expense fields.
- Expense category mapping: Correctly normalizes category ids and names.
- Account mapping: Mostly normalized, but current-balance fallback and forced `counterId: null` are questionable.
- Department mapping: Broad normalization coverage; generated code format conflicts with current tests.
- Inventory mapping: Broad field normalization; derived service loses the real department name.

## Final Action Items

1. Add `credentials: "include"` to `requestAppApi` and direct browser fetch wrappers.
2. Move Admin Customers/Users search and filters to the backend; reset pagination to page 1 when filters change.
3. Remove or document the Admin directory `totalRecords - 1` adjustment.
4. Decide whether Customer Payment List should call `getCustomerPayments`, a dedicated ledger endpoint, or a combined transaction/payment ledger API.
5. Add server-backed pagination to Customer Payment Ledger and Customers Outstanding.
6. Add Customers Outstanding search by customer name, code, and mobile number.
7. Add AbortController support to Add Transaction customer search and Payment Ledger customer search.
8. Clear stale customer options immediately when a new search begins or drops below three characters.
9. Send Expense `categoryId` to the backend and add expense pagination.
10. Implement Account update API connectivity before reporting edit success.
11. Implement Department update/delete API connectivity before reporting success.
12. Fix Account mapper current-balance fallback and preserve backend relationships.
13. Reconcile Department code generation with the expected `CTR-*` or documented `DPT-*` format.
14. Include `search` and `type` in the Inventory hook request key.
15. Preserve the selected department name when converting inventory records to frontend services.
16. Confirm all backend pagination envelope shapes and support nested pagination where necessary.
