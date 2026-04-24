# Static-data procedure-backed filter dropdowns

**Date:** 2026-04-24
**Status:** Design approved, pending implementation plan
**Scope:** Backend `FiltersController#values`, `ProductionDataService`, `base_controller#filter_params`, `explorer_where_clause`. Frontend `types/index.ts`, `AdvancedFilters.tsx`, `pivot/page.tsx`, `segmentation/page.tsx`, `useDashboardData.ts`, new `MultiValueChipInput.tsx`.

---

## 1. Problem

Today the filter-value dropdowns on every dashboard page are populated by `SELECT DISTINCT <col> FROM tran_summary LIMIT N` inside `FiltersController#values`. This has several drawbacks:

- **Not authoritative.** A code/name only appears if it has a transaction in the fact table. Newly onboarded branches, services, or merchants are missing until they transact.
- **Scale-limited.** Hard-coded `LIMIT 50–100` truncates long-tail dimensions (GL codes, merchants) silently.
- **Opaque codes.** Frontend shows raw codes (`001`, `CA-101`) with no human-readable label.
- **TRAN-side dims (`tran_branch`, `tran_cluster`, `tran_province`) are not filterable** even though the columns exist in `tran_summary`.
- **`acct_num`, `acid`, `cif_id` are free-text inputs** that require users to know the exact value; they cannot browse the list.

The warehouse already exposes a curated lookup procedure `public.get_static_data(<type>)` that drops into a temp table `static_data(name, value)`. The `name` column is human-readable, the `value` column is the canonical code used in `tran_summary` WHERE clauses.

## 2. Goal

Replace the `DISTINCT tran_summary` filter source with the `get_static_data` procedure for all lookup-style dimensions. Render dropdowns that display `name` and submit `value`. Convert `tran_type`, `part_tran_type`, `tran_source` to multi-value free-text chip inputs (their values are too open-ended to enumerate). Add TRAN-side filter keys so `tran_branch`/`tran_cluster`/`tran_province` become filterable.

## 3. API contract

**Endpoint:** `GET /api/v1/filters/values`

**Procedure-backed response keys** — each is `[{name: string, value: string}, …]`:

| Response key        | Procedure type | Consumed by filter(s) |
|---------------------|----------------|------------------------|
| `branches`          | `branch`       | `branchCode`, `tranBranch` |
| `clusters`          | `cluster`      | `cluster`, `tranCluster` |
| `provinces`         | `province`     | `province`, `tranProvince` |
| `gl_sub_head_codes` | `gsh`          | `glSubHeadCode` |
| `products`          | `product`      | `product` |
| `services`          | `service`      | `service` |
| `merchants`         | `merchant`     | `merchant` |
| `acct_nums`         | `acctnum`      | `acctNum` |
| `acids`             | `acid`         | `acid` |
| `cif_ids`           | `cifid`        | `cifId` |
| `users`             | `user`         | `entryUser`, `vfdUser` (shared list) |

**Removed from response:** `tran_sources`, `tran_types`, `part_tran_types`, `solids`, `entry_users`, `vfd_users`. (The three tran_*_type/source dims convert to free-text inputs; solids was unused; entry/vfd users share a single `users` list.)

**No Rails-side cache.** `Rails.cache.fetch('filter_values_v2', expires_in: 1.hour)` is removed. Each call runs all 11 procedures fresh. Frontend caching is handled client-side via TanStack Query with `staleTime: Infinity, refetchOnWindowFocus: false` — one fetch per tab session.

## 4. Backend changes

### 4.1 `ProductionDataService` (`backend/app/services/production_data_service.rb`)

- Expand `LOOKUP_TYPES` from 7 to 11 entries — add `acctnum`, `acid`, `cifid`, `user`.
- Add `static_lookup(type)`:
  ```ruby
  def static_lookup(type)
    type = type.to_s
    raise ArgumentError, "Unsupported lookup type: #{type}" unless LOOKUP_TYPES.include?(type)
    with_connection do
      @connection.execute("CALL public.get_static_data(#{@connection.quote(type)})")
      @connection.exec_query("SELECT name, value FROM static_data").to_a
    end
  end
  ```
  Uses `with_connection` to keep the temp table in the same session. No LIMIT — the procedure governs output size.
- `lookup_preview` (used by `/dashboard/skills`) stays — it still returns raw `SELECT *` for the data-dictionary UI.

### 4.2 `FiltersController#values` (`backend/app/controllers/api/v1/filters_controller.rb`)

Rewrite to call `static_lookup` once per dropdown key:

```ruby
def values
  svc = ProductionDataService.new(current_user)
  render json: {
    branches:          svc.static_lookup('branch'),
    clusters:          svc.static_lookup('cluster'),
    provinces:         svc.static_lookup('province'),
    gl_sub_head_codes: svc.static_lookup('gsh'),
    products:          svc.static_lookup('product'),
    services:          svc.static_lookup('service'),
    merchants:         svc.static_lookup('merchant'),
    acct_nums:         svc.static_lookup('acctnum'),
    acids:             svc.static_lookup('acid'),
    cif_ids:           svc.static_lookup('cifid'),
    users:             svc.static_lookup('user')
  }
end
```

- `distinct_values` helper deleted (dead code).
- `statistics` endpoint: drop the `counts.provinces` and `counts.branches` derived from `DISTINCT`. The rest (date/amount/transaction counts) is unchanged. Frontend "Dimensions" stat tile becomes `{branches.length} branches · {provinces.length} provinces · {clusters.length} clusters · {gl_sub_head_codes.length} GL codes`.
- `branches` endpoint (cascading province→branches) — keep as-is for now; it has a different contract (returns `{code, cluster}`) and its own cache.

### 4.3 `explorer_where_clause` (`backend/app/services/production_data_service.rb`)

Add three rows to the categorical filters hash:
```ruby
'tran_branch'   => filters[:tran_branch],
'tran_cluster'  => filters[:tran_cluster],
'tran_province' => filters[:tran_province],
```
Each produces `tran_<col> IN (...)` — same pattern as `gam_branch`.

### 4.4 `base_controller#filter_params` (`backend/app/controllers/api/v1/base_controller.rb`)

Add three keys:
```ruby
tran_branch:   parse_multi_value_param(param_value(:tran_branch,   :tranBranch)),
tran_cluster:  parse_multi_value_param(param_value(:tran_cluster,  :tranCluster)),
tran_province: parse_multi_value_param(param_value(:tran_province, :tranProvince)),
```

### 4.5 RSpec coverage

- `production_data_service_spec.rb`: `static_lookup` happy-path + invalid-type raises `ArgumentError`. Stub the `@connection` execute/exec_query pair.
- `filters_controller_spec.rb`: verify response has exactly the 11 keys, no `tran_sources`/`tran_types`/`part_tran_types`/`solids`/`entry_users`/`vfd_users`. Mock `static_lookup` to return canned arrays.
- `production_data_service_spec.rb` (existing `explorer_where_clause` context): add three cases for the new tran-side categorical filters.

## 5. Frontend changes

### 5.1 Types (`frontend/types/index.ts`)

```ts
export interface LookupOption { name: string; value: string }

interface FilterValuesResponse {
  branches:          LookupOption[];
  clusters:          LookupOption[];
  provinces:         LookupOption[];
  gl_sub_head_codes: LookupOption[];
  products:          LookupOption[];
  services:          LookupOption[];
  merchants:         LookupOption[];
  acct_nums:         LookupOption[];
  acids:             LookupOption[];
  cif_ids:           LookupOption[];
  users:             LookupOption[];
}

interface DashboardFilters {
  // ... existing keys ...
  tranBranch?:   MultiValueFilter;
  tranCluster?:  MultiValueFilter;
  tranProvince?: MultiValueFilter;
}
```

### 5.2 `useFilterValues` hook (`frontend/lib/hooks/useDashboardData.ts`)

Set `staleTime: Infinity, refetchOnWindowFocus: false` so the fetch happens once per tab session.

### 5.3 New component `MultiValueChipInput.tsx` (`frontend/components/ui/MultiValueChipInput.tsx`)

Small (≤100 lines) chip-input for free-text multi-value filters. API:
```ts
interface Props {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}
```
- Text field + rendered chips. Enter or comma appends; backspace on empty removes last; × on chip removes it.
- Styled with existing tokens (`bg-bg-input`, `border-border`, `text-text-primary`). No external library.
- Used for `tranType`, `partTranType`, `tranSource`.

### 5.4 `AdvancedFilters.tsx`

- Helper: `toOptions(arr: LookupOption[]) => arr.map(({name, value}) => ({value, label: name}))`.
- Helper: `valueToName(arr: LookupOption[], value: string)` for active-filter-pill labels.
- **Quick bar** — dropdowns for Province, Branch; chip inputs for Channel (tranSource) and Part Type (partTranType).
- **Advanced panel** — dropdowns (from procedure): Cluster, Product, Service, Merchant, GL Sub Head, Entry User, Verified User (both from `users`), TRAN Province, TRAN Cluster, TRAN Branch, Account Number, CIF, ACID. Chip input: Transaction Type. Number inputs: Min Amount, Max Amount. No other changes.
- **Remove**: old `acctNum` / `cifId` text inputs (replaced by dropdowns), old Channel/Part Type/Transaction Type dropdowns (replaced by chip inputs).
- **Pills**: labels use `valueToName(...)` so pills render "Branch: Kathmandu Main" not "Branch: 001".
- **Stats tile** updated with new response keys.

### 5.5 `pivot/page.tsx`

- `getOptions` maps `LookupOption[] → {value, label}` via `toOptions`.
- `DIMENSION_FIELDS`:
  - `cif_id`   → `type: 'categorical'`, `optionsKey: 'cif_ids'`, retain `filterKey: 'cifId'`.
  - `acid`     → add `filterKey: 'acid'`, `type: 'categorical'`, `optionsKey: 'acids'`.
  - `acct_num` → `type: 'categorical'`, `optionsKey: 'acct_nums'`, retain `filterKey: 'acctNum'`.
  - `tran_province` → add `filterKey: 'tranProvince'`, `type: 'categorical'`, `optionsKey: 'provinces'`.
  - `tran_cluster`  → add `filterKey: 'tranCluster'`,  `type: 'categorical'`, `optionsKey: 'clusters'`.
  - `tran_branch`   → add `filterKey: 'tranBranch'`,   `type: 'categorical'`, `optionsKey: 'branches'`.
  - `entry_user`, `vfd_user` → `optionsKey: 'users'` (both share).
  - `tran_type`, `part_tran_type`, `tran_source` → new `type: 'text-multi'`, render `MultiValueChipInput` in the inline per-dim filter.
  - `acct_name` — **unchanged** (stays partial-match text input; not in user's mapping).
- Add `'text-multi'` branch to the per-dim filter render switch. Existing `text` branch handles single-string `acct_name` only.

### 5.6 `segmentation/page.tsx`

- Lines 248–249 currently treat `filterValues.provinces`/`branches` as `string[]`. Update:
  ```ts
  const provinces = (filterValues?.provinces ?? []).map(({value}) => value);
  const branches  = (filterValues?.branches  ?? []).map(({value}) => value);
  ```
  (or pass `LookupOption[]` through to the dropdown adapter if the page renders labels.)
- Any other key reads in this file get the same treatment.

## 6. Migration risks

- **Breaking change** in the `/filters/values` response. Any external consumer (internal tools, bookmarks) breaks. This API is internal-only, so risk is contained.
- **Cache invalidation**: the old `filter_values_v2` cache entry becomes orphaned on next deploy. Harmless — it'll expire in ≤1 hour and nothing reads it.
- **TRAN-side filters are new** — make sure the stored-procedure WHERE clause actually supports `tran_branch IN (...)`. Column exists in `tran_summary` per service DIMENSIONS hash; the `union all` period queries also see this column (they hit the same partition table).
- **`acct_num`/`acid`/`cif_id` dropdown size** — if the procedure returns tens of thousands of rows, `SearchableMultiSelect` performance needs to hold up. Mitigation: `SearchableMultiSelect` already does client-side filtering by text input; confirm it handles 10k+ options. If not, add virtual scrolling in a follow-up.
- **Pill label resolution** depends on `filterValues` being loaded when pills render. Current AdvancedFilters already short-circuits on `isLoading || !filterValues` — safe.

## 7. Testing plan

**Backend (RSpec):**
- `static_lookup` returns the stubbed array shape.
- `static_lookup('bogus')` raises `ArgumentError`.
- `FiltersController#values` JSON has exactly the 11 expected keys, each an array.
- `explorer_where_clause` produces `tran_branch IN (...)` / `tran_cluster IN (...)` / `tran_province IN (...)` when the corresponding filter is set.

**Frontend (vitest):**
- `MultiValueChipInput` unit tests: Enter appends, comma appends, backspace removes, × removes.
- `AdvancedFilters` renders a dropdown for each of the 11 keys.
- `AdvancedFilters` pill labels use `name` not `value`.
- `pivot` `getOptions` returns `{value, label}[]` from `LookupOption[]` input.

**Manual smoke (per CLAUDE.md Rule 5):**
- Open `/dashboard/executive` → AdvancedFilters panel → every dropdown populates with names.
- Open `/dashboard/pivot` → select dim `tran_branch` → inline dropdown populates; apply filter; verify request sends `tranBranch=<value>` and results scope correctly.
- Select dim `tran_type` → free-text chip input appears; add two chips; verify URL param includes both values.
- Open `/dashboard/segmentation` → province and branch filters render.

## 8. Out of scope

- Visual redesign of `SearchableMultiSelect`.
- Virtualization for large option lists (may be needed follow-up depending on procedure output size for `acctnum`/`acid`/`cifid`).
- Cascading filters (e.g. branches filtered by province) beyond the existing `/filters/branches` endpoint.
- `solid`, `acct_name` filter migration — neither was in the user's mapping.
- `lookup_preview` method refactor — used by a different page (`/skills`), different contract.
