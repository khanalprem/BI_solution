# Static-Data Procedure-Backed Filter Dropdowns — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `DISTINCT tran_summary` filter source with `public.get_static_data(type)` procedure calls; add dropdowns for `acct_num` / `acid` / `cif_id`; add TRAN-side filters; convert `tran_type` / `part_tran_type` / `tran_source` to free-text chip inputs.

**Architecture:** Thin Ruby adapter (`ProductionDataService#static_lookup`) calls the procedure and returns `[{name, value}]`. `FiltersController#values` returns one procedure-backed array per dimension-group. Frontend consumes `LookupOption[]` and displays `name` while submitting `value`. Client-side TanStack Query caches the response for the tab session.

**Tech Stack:** Rails 7 API, RSpec; Next.js 15 + React 18 + TypeScript, Vitest, TanStack Query, Tailwind.

**Spec:** [docs/superpowers/specs/2026-04-24-static-data-dropdowns-design.md](../specs/2026-04-24-static-data-dropdowns-design.md)

---

## File Map

**Backend — create**
- None (no new files)

**Backend — modify**
- `backend/app/services/production_data_service.rb` — expand `LOOKUP_TYPES`, add `static_lookup`, extend `explorer_where_clause`
- `backend/app/controllers/api/v1/filters_controller.rb` — rewrite `values`, delete `distinct_values`
- `backend/app/controllers/api/v1/base_controller.rb` — add three TRAN-side keys to `filter_params`
- `backend/spec/services/production_data_service_spec.rb` — add `static_lookup` + new WHERE specs

**Backend — create (test)**
- `backend/spec/controllers/api/v1/filters_controller_spec.rb` — new request spec for the rewritten endpoint

**Frontend — create**
- `frontend/components/ui/MultiValueChipInput.tsx` — chip-input widget
- `frontend/__tests__/MultiValueChipInput.test.tsx` — vitest coverage

**Frontend — modify**
- `frontend/types/index.ts` — add `LookupOption`, rewrite `FilterValuesResponse`, extend `DashboardFilters`
- `frontend/lib/hooks/useDashboardData.ts` — `useFilterValues` gets `staleTime: Infinity, refetchOnWindowFocus: false`
- `frontend/components/ui/AdvancedFilters.tsx` — rewrite options building, pill labeling, add chip inputs, add TRAN-side + ACID + acctnum/cifid dropdowns
- `frontend/app/dashboard/pivot/page.tsx` — extend `DIMENSION_FIELDS`, handle `text-multi` type, adapt `getOptions`
- `frontend/app/dashboard/segmentation/page.tsx` — coerce new `LookupOption[]` shape

**Frontend — config**
- `frontend/vitest.config.ts` — expand `include` glob so `.test.tsx` is picked up

---

## Task Order

Backend first (foundation), then types, then component. Each task is a commit.

---

### Task 1: Add `static_lookup` to `ProductionDataService`

**Files:**
- Modify: `backend/app/services/production_data_service.rb:111` (LOOKUP_TYPES)
- Modify: `backend/app/services/production_data_service.rb:379-394` (below `lookup_preview`)
- Test: `backend/spec/services/production_data_service_spec.rb`

- [ ] **Step 1: Expand `LOOKUP_TYPES`**

In `production_data_service.rb` change line 111 from:
```ruby
LOOKUP_TYPES = %w[branch cluster gsh merchant product province service].freeze
```
to:
```ruby
LOOKUP_TYPES = %w[branch cluster gsh merchant product province service acctnum acid cifid user].freeze
```

- [ ] **Step 2: Write failing test for `static_lookup` happy path**

Add to `backend/spec/services/production_data_service_spec.rb` (create file if missing; use existing describe block if present):

```ruby
require 'rails_helper'

RSpec.describe ProductionDataService do
  let(:service) { described_class.new(nil) }

  describe '#static_lookup' do
    it 'calls the procedure and returns name/value rows' do
      connection = instance_double(ActiveRecord::ConnectionAdapters::PostgreSQLAdapter)
      allow(service).to receive(:with_connection) do |&block|
        service.instance_variable_set(:@connection, connection)
        block.call
      end
      allow(connection).to receive(:quote).with('branch').and_return("'branch'")
      expect(connection).to receive(:execute).with("CALL public.get_static_data('branch')")
      result_double = instance_double(ActiveRecord::Result,
        to_a: [{ 'name' => 'Kathmandu Main', 'value' => '001' }])
      expect(connection).to receive(:exec_query)
        .with('SELECT name, value FROM static_data')
        .and_return(result_double)

      expect(service.static_lookup('branch')).to eq([{ 'name' => 'Kathmandu Main', 'value' => '001' }])
    end

    it 'raises ArgumentError for unsupported type' do
      expect { service.static_lookup('bogus') }.to raise_error(ArgumentError, /Unsupported lookup type/)
    end
  end
end
```

- [ ] **Step 3: Run test to verify it fails**

```bash
cd backend && bundle exec rspec spec/services/production_data_service_spec.rb -e 'static_lookup' --format documentation
```
Expected: two failures — `NoMethodError: undefined method 'static_lookup'`.

- [ ] **Step 4: Implement `static_lookup`**

Insert into `production_data_service.rb` immediately below `lookup_preview` (around line 395):

```ruby
  # Fetch a name/value lookup list from the `get_static_data` procedure.
  # Returns [{ 'name' => ..., 'value' => ... }, ...]. Used by the shared
  # filter_values endpoint to populate UI dropdowns with canonical labels.
  def static_lookup(type)
    type = type.to_s
    raise ArgumentError, "Unsupported lookup type: #{type}" unless LOOKUP_TYPES.include?(type)

    with_connection do
      @connection.execute("CALL public.get_static_data(#{@connection.quote(type)})")
      @connection.exec_query('SELECT name, value FROM static_data').to_a
    end
  end
```

- [ ] **Step 5: Run test to verify both pass**

```bash
cd backend && bundle exec rspec spec/services/production_data_service_spec.rb -e 'static_lookup' --format documentation
```
Expected: 2 examples, 0 failures.

- [ ] **Step 6: Commit**

```bash
cd backend
git add app/services/production_data_service.rb spec/services/production_data_service_spec.rb
git commit -m "$(cat <<'EOF'
Add ProductionDataService#static_lookup for procedure-backed lookups

Wraps CALL public.get_static_data(type) and returns name/value rows.
Expands LOOKUP_TYPES with acctnum, acid, cifid, user.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Wire TRAN-side categorical filters into `explorer_where_clause`

**Files:**
- Modify: `backend/app/services/production_data_service.rb:1022-1040` (categorical filters hash)
- Modify: `backend/app/controllers/api/v1/base_controller.rb:71-110` (filter_params)
- Test: `backend/spec/services/production_data_service_spec.rb`

- [ ] **Step 1: Write failing test for tran_branch WHERE generation**

Append to the same spec file:

```ruby
  describe '#explorer_where_clause' do
    let(:service) { described_class.new(nil) }

    it 'emits IN clause for tran_branch filter' do
      result = service.send(:explorer_where_clause,
        filters: { tran_branch: ['001', '002'] },
        start_date: nil, end_date: nil)
      expect(result).to include("tran_branch IN ('001','002')")
    end

    it 'emits IN clause for tran_cluster filter' do
      result = service.send(:explorer_where_clause,
        filters: { tran_cluster: ['north'] },
        start_date: nil, end_date: nil)
      expect(result).to include("tran_cluster IN ('north')")
    end

    it 'emits IN clause for tran_province filter' do
      result = service.send(:explorer_where_clause,
        filters: { tran_province: ['Bagmati'] },
        start_date: nil, end_date: nil)
      expect(result).to include("tran_province IN ('Bagmati')")
    end
  end
```

- [ ] **Step 2: Run test to verify failure**

```bash
cd backend && bundle exec rspec spec/services/production_data_service_spec.rb -e 'explorer_where_clause' --format documentation
```
Expected: 3 failures, each expectation not met (clause not present in output).

- [ ] **Step 3: Add the three TRAN-side categorical rows**

In `production_data_service.rb`, inside `explorer_where_clause`, extend the hash at lines 1022-1035. Change:

```ruby
    {
      'gam_branch'       => filters[:branch],
      'gam_province'     => filters[:province],
      'gam_cluster'      => filters[:cluster],
      'gam_solid'        => filters[:solid],
      'tran_source'      => filters[:tran_source],
      'tran_type'        => filters[:tran_type],
      'part_tran_type'   => filters[:part_tran_type],
      'product'          => filters[:product],
      'service'          => filters[:service],
      'merchant'         => filters[:merchant],
      'gl_sub_head_code' => filters[:gl_sub_head_code],
      'entry_user'       => filters[:entry_user],
      'vfd_user'         => filters[:vfd_user]
    }.each do |column, value|
```

to:

```ruby
    {
      'gam_branch'       => filters[:branch],
      'gam_province'     => filters[:province],
      'gam_cluster'      => filters[:cluster],
      'gam_solid'        => filters[:solid],
      'tran_branch'      => filters[:tran_branch],
      'tran_cluster'     => filters[:tran_cluster],
      'tran_province'    => filters[:tran_province],
      'tran_source'      => filters[:tran_source],
      'tran_type'        => filters[:tran_type],
      'part_tran_type'   => filters[:part_tran_type],
      'product'          => filters[:product],
      'service'          => filters[:service],
      'merchant'         => filters[:merchant],
      'gl_sub_head_code' => filters[:gl_sub_head_code],
      'entry_user'       => filters[:entry_user],
      'vfd_user'         => filters[:vfd_user]
    }.each do |column, value|
```

- [ ] **Step 4: Add the three keys to `filter_params`**

In `base_controller.rb` line 71-109, between line 79 (`cluster:`) and 80 (`solid:`) insert:

```ruby
          tran_branch:   parse_multi_value_param(param_value(:tran_branch,   :tranBranch)),
          tran_cluster:  parse_multi_value_param(param_value(:tran_cluster,  :tranCluster)),
          tran_province: parse_multi_value_param(param_value(:tran_province, :tranProvince)),
```

- [ ] **Step 5: Run specs to verify WHERE tests pass**

```bash
cd backend && bundle exec rspec spec/services/production_data_service_spec.rb --format documentation
```
Expected: all examples pass (previously-failing 3 now pass; existing specs unaffected).

- [ ] **Step 6: Commit**

```bash
cd backend
git add app/services/production_data_service.rb app/controllers/api/v1/base_controller.rb spec/services/production_data_service_spec.rb
git commit -m "$(cat <<'EOF'
Add TRAN-side categorical filters (tran_branch/cluster/province)

Extends explorer_where_clause and filter_params so pivot/segmentation
pages can filter on transaction-branch dimensions, not just GAM-side.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Rewrite `FiltersController#values`

**Files:**
- Modify: `backend/app/controllers/api/v1/filters_controller.rb:1-88`
- Create: `backend/spec/controllers/api/v1/filters_controller_spec.rb`

- [ ] **Step 1: Write failing request spec**

Create `backend/spec/controllers/api/v1/filters_controller_spec.rb`:

```ruby
require 'rails_helper'

RSpec.describe Api::V1::FiltersController, type: :request do
  describe 'GET /api/v1/filters/values' do
    before do
      allow_any_instance_of(ProductionDataService)
        .to receive(:static_lookup) do |_, type|
          [{ 'name' => "#{type}-Name", 'value' => "#{type}-Value" }]
        end
    end

    it 'returns procedure-backed dropdown arrays' do
      get '/api/v1/filters/values'
      expect(response).to have_http_status(:ok)

      body = JSON.parse(response.body)
      expected_keys = %w[branches clusters provinces gl_sub_head_codes products
                         services merchants acct_nums acids cif_ids users]
      expect(body.keys).to match_array(expected_keys)

      body.each_value do |arr|
        expect(arr).to be_an(Array)
        expect(arr.first).to match('name' => kind_of(String), 'value' => kind_of(String))
      end
    end

    it 'does not include removed keys' do
      get '/api/v1/filters/values'
      body = JSON.parse(response.body)
      removed = %w[tran_sources tran_types part_tran_types solids entry_users vfd_users]
      removed.each { |k| expect(body).not_to have_key(k) }
    end
  end
end
```

- [ ] **Step 2: Run spec to verify it fails**

```bash
cd backend && bundle exec rspec spec/controllers/api/v1/filters_controller_spec.rb --format documentation
```
Expected: failures — response body still has the old DISTINCT-based shape.

- [ ] **Step 3: Rewrite the controller**

Replace the entire contents of `backend/app/controllers/api/v1/filters_controller.rb` with:

```ruby
module Api
  module V1
    class FiltersController < BaseController
      # Populated once per tab session (frontend uses TanStack Query staleTime: Infinity).
      # No Rails-side cache — each call runs the 11 get_static_data procedures fresh.
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

      # Cascading province → branches dropdown used by the TopBar. Independent of
      # `values` — keeps its own narrow cache and {code, cluster} response shape.
      def branches
        province_filter = parse_multi_value_param(params[:province])
        province_key = Array.wrap(province_filter).sort.join('_').presence || 'all'
        cache_key = "filter_branches_#{province_key}"

        branches = Rails.cache.fetch(cache_key, expires_in: 1.hour) do
          scope = TranSummary.where.not(gam_branch: [nil, ''])
          scope = scope.where(gam_province: province_filter) if province_filter.present?

          if province_filter.present?
            scope.distinct
                 .order(:gam_branch)
                 .pluck(:gam_branch, :gam_cluster)
                 .map { |code, cluster| { code: code, cluster: cluster } }
          else
            scope.distinct
                 .order(:gam_branch)
                 .limit(100)
                 .pluck(:gam_branch)
                 .map { |code| { code: code } }
          end
        end

        render json: branches
      end

      # Cached: runs aggregate queries which are expensive on large tables.
      # Kept minimal — dropped provinces/branches DISTINCT counts now that
      # filter_values is procedure-backed.
      def statistics
        stats = Rails.cache.fetch('filter_statistics_v2', expires_in: 30.minutes) do
          {
            date_range: {
              min: TranSummary.minimum(:tran_date),
              max: TranSummary.maximum(:tran_date)
            },
            amount_range: {
              min: TranSummary.minimum(:tran_amt),
              max: TranSummary.maximum(:tran_amt)
            },
            counts: {
              total_transactions: TranSummary.count,
              unique_accounts: TranSummary.distinct.count(:acct_num),
              unique_customers: TranSummary.distinct.count(:cif_id)
            }
          }
        end
        render json: stats
      end
    end
  end
end
```

- [ ] **Step 4: Run spec to verify it passes**

```bash
cd backend && bundle exec rspec spec/controllers/api/v1/filters_controller_spec.rb --format documentation
```
Expected: 2 examples, 0 failures.

- [ ] **Step 5: Run full backend test suite**

```bash
cd backend && bundle exec rspec --format progress
```
Expected: all green.

- [ ] **Step 6: Commit**

```bash
cd backend
git add app/controllers/api/v1/filters_controller.rb spec/controllers/api/v1/filters_controller_spec.rb
git commit -m "$(cat <<'EOF'
Rewrite FiltersController#values to use get_static_data procedure

Returns 11 name/value arrays sourced from public.get_static_data.
Drops DISTINCT tran_summary queries and the 1h Rails cache; frontend
caches via TanStack Query for the tab session.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Frontend type updates

**Files:**
- Modify: `frontend/types/index.ts:3-42` (DashboardFilters)
- Modify: `frontend/types/index.ts:160-174` (FilterValuesResponse)

- [ ] **Step 1: Add `LookupOption` and rewrite `FilterValuesResponse`**

In `frontend/types/index.ts` replace the block at lines 160-174 with:

```ts
export interface LookupOption {
  name: string;
  value: string;
}

export interface FilterValuesResponse {
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
```

- [ ] **Step 2: Extend `DashboardFilters` with TRAN-side keys**

In `frontend/types/index.ts`, within `DashboardFilters` (lines 3-42), add after line 11 (`cluster?:`):

```ts
  tranBranch?: MultiValueFilter;
  tranCluster?: MultiValueFilter;
  tranProvince?: MultiValueFilter;
```

- [ ] **Step 3: Run TypeScript check to see the expected fan-out of errors**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep -E "AdvancedFilters|pivot/page|segmentation/page|useDashboardData" | head -40
```
Expected: errors in `AdvancedFilters.tsx` (options builders expect `string[]`), `pivot/page.tsx` (getOptions cast), `segmentation/page.tsx` (provinces/branches usage). These errors are resolved in later tasks.

- [ ] **Step 4: Commit the type change on its own**

```bash
cd frontend
git add types/index.ts
git commit -m "$(cat <<'EOF'
Type: add LookupOption and rewrite FilterValuesResponse

Dropdown response becomes {name, value}[]. TRAN-side filter keys added
to DashboardFilters. Callers updated in subsequent commits.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Update `useFilterValues` hook

**Files:**
- Modify: `frontend/lib/hooks/useDashboardData.ts:173-183`

- [ ] **Step 1: Change staleTime and disable window-focus refetch**

Replace lines 173-183 of `frontend/lib/hooks/useDashboardData.ts`:

```ts
export function useFilterValues() {
  return useQuery<FilterValuesResponse>({
    queryKey: ['filter-values'],
    queryFn: async () => {
      const { data } = await apiClient.get<FilterValuesResponse>('/filters/values');
      return data;
    },
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}
```

- [ ] **Step 2: Verify TypeScript still compiles for this file**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep "useDashboardData.ts"
```
Expected: no errors in `useDashboardData.ts` itself.

- [ ] **Step 3: Commit**

```bash
cd frontend
git add lib/hooks/useDashboardData.ts
git commit -m "$(cat <<'EOF'
useFilterValues: fetch once per tab session

staleTime=Infinity + refetchOnWindowFocus=false. Lookup lists update
only on hard reload, matching the user-facing expectation.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Create `MultiValueChipInput` component

**Files:**
- Create: `frontend/components/ui/MultiValueChipInput.tsx`
- Create: `frontend/__tests__/MultiValueChipInput.test.tsx`
- Modify: `frontend/vitest.config.ts`

- [ ] **Step 1: Expand vitest include glob to pick up `.test.tsx`**

In `frontend/vitest.config.ts` change:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['__tests__/**/*.test.ts'],
  },
});
```

to:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['__tests__/**/*.test.{ts,tsx}'],
    environment: 'jsdom',
  },
});
```

- [ ] **Step 2: Ensure `jsdom` is installed**

```bash
cd frontend && npm list jsdom || npm install --save-dev jsdom @testing-library/react @testing-library/user-event
```

If already installed, the command exits 0. Otherwise the install adds dev deps.

- [ ] **Step 3: Write failing test**

Create `frontend/__tests__/MultiValueChipInput.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MultiValueChipInput } from '@/components/ui/MultiValueChipInput';

describe('MultiValueChipInput', () => {
  it('adds a chip when user presses Enter', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<MultiValueChipInput value={[]} onChange={onChange} placeholder="Enter" />);
    const input = screen.getByPlaceholderText('Enter');
    await user.type(input, 'CA{enter}');
    expect(onChange).toHaveBeenLastCalledWith(['CA']);
  });

  it('adds a chip on comma', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<MultiValueChipInput value={[]} onChange={onChange} />);
    const input = screen.getByRole('textbox');
    await user.type(input, 'DR,');
    expect(onChange).toHaveBeenLastCalledWith(['DR']);
  });

  it('removes a chip when backspace pressed on empty input', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<MultiValueChipInput value={['A', 'B']} onChange={onChange} />);
    const input = screen.getByRole('textbox');
    await user.click(input);
    await user.keyboard('{Backspace}');
    expect(onChange).toHaveBeenLastCalledWith(['A']);
  });

  it('removes a chip when × clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<MultiValueChipInput value={['A', 'B']} onChange={onChange} />);
    const removeB = screen.getByRole('button', { name: /remove B/i });
    await user.click(removeB);
    expect(onChange).toHaveBeenLastCalledWith(['A']);
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

```bash
cd frontend && npx vitest run __tests__/MultiValueChipInput.test.tsx
```
Expected: module not found error for `@/components/ui/MultiValueChipInput`.

- [ ] **Step 5: Implement the component**

Create `frontend/components/ui/MultiValueChipInput.tsx`:

```tsx
'use client';

import { KeyboardEvent, useState } from 'react';
import { cn } from '@/lib/utils';

interface Props {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function MultiValueChipInput({ value, onChange, placeholder, className }: Props) {
  const [draft, setDraft] = useState('');

  const commit = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    if (value.includes(trimmed)) return;
    onChange([...value, trimmed]);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commit(draft);
      setDraft('');
    } else if (e.key === 'Backspace' && draft === '' && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  const removeAt = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-1 rounded-md border border-border bg-bg-input px-2 py-1 focus-within:border-accent-blue',
        className,
      )}
    >
      {value.map((v, i) => (
        <span
          key={`${v}-${i}`}
          className="inline-flex items-center gap-1 rounded-full bg-accent-blue/10 px-2 py-0.5 text-[11px] text-accent-blue"
        >
          {v}
          <button
            type="button"
            aria-label={`remove ${v}`}
            onClick={() => removeAt(i)}
            className="text-accent-blue/70 hover:text-accent-red"
          >
            ×
          </button>
        </span>
      ))}
      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => { if (draft) { commit(draft); setDraft(''); } }}
        placeholder={value.length === 0 ? placeholder : ''}
        className="min-w-[80px] flex-1 bg-transparent text-xs text-text-primary outline-none placeholder:text-text-muted"
      />
    </div>
  );
}
```

- [ ] **Step 6: Run tests — expect all green**

```bash
cd frontend && npx vitest run __tests__/MultiValueChipInput.test.tsx
```
Expected: 4 passing.

- [ ] **Step 7: Commit**

```bash
cd frontend
git add components/ui/MultiValueChipInput.tsx __tests__/MultiValueChipInput.test.tsx vitest.config.ts package.json package-lock.json 2>/dev/null
git commit -m "$(cat <<'EOF'
Add MultiValueChipInput for free-text multi-value filters

Used by tran_source, tran_type, part_tran_type filters where the value
space is too open-ended for a dropdown. Enter/comma appends; backspace
on empty removes; × on chip removes.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Rewrite `AdvancedFilters.tsx`

**Files:**
- Modify: `frontend/components/ui/AdvancedFilters.tsx` (full rewrite of options block + JSX)

- [ ] **Step 1: Replace the entire file**

Overwrite `frontend/components/ui/AdvancedFilters.tsx` with:

```tsx
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { FilterBar, FilterDivider, FilterLabel } from './FilterBar';
import { SearchableMultiSelect } from './Select';
import { MultiValueChipInput } from './MultiValueChipInput';
import { useFilterStatistics, useFilterValues } from '@/lib/hooks/useDashboardData';
import { formatNPR, parseISODateToLocal } from '@/lib/formatters';
import type { DashboardFilters, LookupOption, MultiValueFilter } from '@/types';

interface AdvancedFiltersProps {
  filters: DashboardFilters;
  onChange: (filters: DashboardFilters) => void;
  onClear: () => void;
  advancedOpen?: boolean;
  onAdvancedOpenChange?: (open: boolean) => void;
  hideStats?: boolean;
}

type DropdownFilterKey =
  | 'province'
  | 'branchCode'
  | 'cluster'
  | 'product'
  | 'service'
  | 'merchant'
  | 'glSubHeadCode'
  | 'entryUser'
  | 'vfdUser'
  | 'acctNum'
  | 'acid'
  | 'cifId'
  | 'tranBranch'
  | 'tranCluster'
  | 'tranProvince';

type ChipFilterKey = 'tranSource' | 'tranType' | 'partTranType';

type AnyFilterKey = DropdownFilterKey | ChipFilterKey;

function asArray(value?: MultiValueFilter): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function formatCoverageDate(value?: string | null): string {
  const parsed = parseISODateToLocal(value);
  if (!parsed) return 'Unavailable';
  return parsed.toLocaleDateString('en-NP', { year: 'numeric', month: 'short', day: 'numeric' });
}

function toOptions(arr: LookupOption[] | undefined) {
  return (arr ?? []).map(({ name, value }) => ({ value, label: name }));
}

function valueToName(arr: LookupOption[] | undefined, value: string): string {
  return arr?.find((o) => o.value === value)?.name ?? value;
}

function advancedFieldsFrom(f: DashboardFilters) {
  return {
    tranType:      f.tranType,
    cluster:       f.cluster,
    product:       f.product,
    service:       f.service,
    merchant:      f.merchant,
    glSubHeadCode: f.glSubHeadCode,
    entryUser:     f.entryUser,
    vfdUser:       f.vfdUser,
    minAmount:     f.minAmount,
    maxAmount:     f.maxAmount,
    acctNum:       f.acctNum,
    cifId:         f.cifId,
    acid:          f.acid,
    tranBranch:    f.tranBranch,
    tranCluster:   f.tranCluster,
    tranProvince:  f.tranProvince,
  };
}

function hasDiff(a: DashboardFilters, b: DashboardFilters): boolean {
  const keys = Object.keys(advancedFieldsFrom(a)) as (keyof DashboardFilters)[];
  return keys.some((k) => JSON.stringify(a[k]) !== JSON.stringify(b[k]));
}

function DataStat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl border border-border bg-bg-card px-3 py-2.5">
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">{label}</div>
      <div className="mt-1 text-sm font-semibold text-text-primary">{value}</div>
      <div className="mt-1 text-[11px] text-text-secondary">{hint}</div>
    </div>
  );
}

export function AdvancedFilters({
  filters,
  onChange,
  onClear,
  advancedOpen,
  onAdvancedOpenChange,
  hideStats = false,
}: AdvancedFiltersProps) {
  const { data: filterValues, isLoading, error } = useFilterValues();
  const { data: filterStats } = useFilterStatistics();
  const [internalShowAdvanced, setInternalShowAdvanced] = useState(false);
  const showAdvanced = advancedOpen ?? internalShowAdvanced;

  const [draft, setDraft] = useState<DashboardFilters>(() => ({ ...filters }));

  useEffect(() => {
    setDraft((prev) => ({ ...prev, ...filters }));
  }, [filters]);

  const hasPendingChanges = hasDiff(draft, filters);

  const setShowAdvanced = (nextOpen: boolean) => {
    onAdvancedOpenChange?.(nextOpen);
    if (advancedOpen === undefined) setInternalShowAdvanced(nextOpen);
  };

  const setQuickFilter = useCallback(
    (key: AnyFilterKey, values: string[]) => {
      const updated = { ...filters, [key]: values.length > 0 ? values : undefined };
      setDraft(updated);
      onChange(updated);
    },
    [filters, onChange],
  );

  const setDraftMulti = useCallback((key: AnyFilterKey, values: string[]) => {
    setDraft((prev) => ({ ...prev, [key]: values.length > 0 ? values : undefined }));
  }, []);

  const setDraftNumber = useCallback((key: 'minAmount' | 'maxAmount', value: string) => {
    const parsed = value.trim() ? Number(value.trim()) : undefined;
    setDraft((prev) => ({
      ...prev,
      [key]: parsed !== undefined && Number.isFinite(parsed) ? parsed : undefined,
    }));
  }, []);

  const handleApply = () => onChange(draft);

  const handleClear = () => {
    setDraft((prev) => ({ startDate: prev.startDate, endDate: prev.endDate } as DashboardFilters));
    onClear();
  };

  const activeFilterCount = useMemo(
    () =>
      Object.entries(filters).reduce((count, [key, value]) => {
        if (key === 'startDate' || key === 'endDate' || value === undefined || value === null || value === '') return count;
        if (Array.isArray(value)) return count + value.length;
        return count + 1;
      }, 0),
    [filters],
  );

  const activeFilterPills = useMemo(() => {
    const pills: Array<{ id: string; label: string; onRemove: () => void }> = [];

    const dropdownDefs: Array<{ key: DropdownFilterKey; label: string; options?: LookupOption[] }> = [
      { key: 'province',      label: 'Province',       options: filterValues?.provinces },
      { key: 'branchCode',    label: 'Branch',         options: filterValues?.branches },
      { key: 'cluster',       label: 'Cluster',        options: filterValues?.clusters },
      { key: 'product',       label: 'Product',        options: filterValues?.products },
      { key: 'service',       label: 'Service',        options: filterValues?.services },
      { key: 'merchant',      label: 'Merchant',       options: filterValues?.merchants },
      { key: 'glSubHeadCode', label: 'GL Code',        options: filterValues?.gl_sub_head_codes },
      { key: 'entryUser',     label: 'Entry User',     options: filterValues?.users },
      { key: 'vfdUser',       label: 'Verified User',  options: filterValues?.users },
      { key: 'acctNum',       label: 'Account',        options: filterValues?.acct_nums },
      { key: 'acid',          label: 'ACID',           options: filterValues?.acids },
      { key: 'cifId',         label: 'CIF',            options: filterValues?.cif_ids },
      { key: 'tranBranch',    label: 'TRAN Branch',    options: filterValues?.branches },
      { key: 'tranCluster',   label: 'TRAN Cluster',   options: filterValues?.clusters },
      { key: 'tranProvince',  label: 'TRAN Province',  options: filterValues?.provinces },
    ];

    const chipDefs: Array<{ key: ChipFilterKey; label: string }> = [
      { key: 'tranSource',   label: 'Channel' },
      { key: 'partTranType', label: 'Part Type' },
      { key: 'tranType',     label: 'Transaction Type' },
    ];

    dropdownDefs.forEach(({ key, label, options }) => {
      asArray(filters[key]).forEach((selectedValue) => {
        pills.push({
          id: `${key}-${selectedValue}`,
          label: `${label}: ${valueToName(options, selectedValue)}`,
          onRemove: () => {
            const next = asArray(filters[key]).filter((v) => v !== selectedValue);
            const updated = { ...filters, [key]: next.length > 0 ? next : undefined };
            setDraft(updated);
            onChange(updated);
          },
        });
      });
    });

    chipDefs.forEach(({ key, label }) => {
      asArray(filters[key]).forEach((selectedValue) => {
        pills.push({
          id: `${key}-${selectedValue}`,
          label: `${label}: ${selectedValue}`,
          onRemove: () => {
            const next = asArray(filters[key]).filter((v) => v !== selectedValue);
            const updated = { ...filters, [key]: next.length > 0 ? next : undefined };
            setDraft(updated);
            onChange(updated);
          },
        });
      });
    });

    if (typeof filters.minAmount === 'number') {
      pills.push({
        id: 'min-amount',
        label: `Min Amount: ${formatNPR(filters.minAmount)}`,
        onRemove: () => {
          const u = { ...filters, minAmount: undefined };
          setDraft(u);
          onChange(u);
        },
      });
    }
    if (typeof filters.maxAmount === 'number') {
      pills.push({
        id: 'max-amount',
        label: `Max Amount: ${formatNPR(filters.maxAmount)}`,
        onRemove: () => {
          const u = { ...filters, maxAmount: undefined };
          setDraft(u);
          onChange(u);
        },
      });
    }

    return pills;
  }, [filters, filterValues, onChange]);

  if (error) return <div className="text-accent-red text-xs">{(error as Error)?.message || 'Unable to load filter values'}</div>;
  if (isLoading || !filterValues) return <div className="text-text-secondary text-xs">Loading filters...</div>;

  const provinceOptions = toOptions(filterValues.provinces);
  const branchOptions   = toOptions(filterValues.branches);
  const clusterOptions  = toOptions(filterValues.clusters);
  const productOptions  = toOptions(filterValues.products);
  const serviceOptions  = toOptions(filterValues.services);
  const merchantOptions = toOptions(filterValues.merchants);
  const glOptions       = toOptions(filterValues.gl_sub_head_codes);
  const userOptions     = toOptions(filterValues.users);
  const acctNumOptions  = toOptions(filterValues.acct_nums);
  const acidOptions     = toOptions(filterValues.acids);
  const cifIdOptions    = toOptions(filterValues.cif_ids);

  return (
    <div className="space-y-3">
      <FilterBar onClear={handleClear}>
        <FilterLabel>Province</FilterLabel>
        <div className="min-w-0 w-full sm:min-w-[220px] sm:w-auto flex-1 sm:flex-none">
          <SearchableMultiSelect
            value={asArray(filters.province)}
            onChange={(v) => setQuickFilter('province', v)}
            options={provinceOptions}
            placeholder="All provinces"
          />
        </div>

        <FilterDivider />

        <FilterLabel>Branch</FilterLabel>
        <div className="min-w-0 w-full sm:min-w-[240px] sm:w-auto flex-1 sm:flex-none">
          <SearchableMultiSelect
            value={asArray(filters.branchCode)}
            onChange={(v) => setQuickFilter('branchCode', v)}
            options={branchOptions}
            placeholder="All branches"
          />
        </div>

        <FilterDivider />

        <FilterLabel>Channel</FilterLabel>
        <div className="min-w-0 w-full sm:min-w-[190px] sm:w-auto flex-1 sm:flex-none">
          <MultiValueChipInput
            value={asArray(filters.tranSource)}
            onChange={(v) => setQuickFilter('tranSource', v)}
            placeholder="Add channel (e.g. mobile)"
          />
        </div>

        <FilterDivider />

        <FilterLabel>Part Type</FilterLabel>
        <div className="min-w-0 w-full sm:min-w-[160px] sm:w-auto flex-1 sm:flex-none">
          <MultiValueChipInput
            value={asArray(filters.partTranType)}
            onChange={(v) => setQuickFilter('partTranType', v)}
            placeholder="CR / DR"
          />
        </div>

        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`
            ml-auto inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-all
            ${showAdvanced
              ? 'border-accent-blue/40 bg-accent-blue/15 text-accent-blue'
              : 'border-border bg-bg-input text-text-secondary hover:border-border-strong hover:text-text-primary'}
          `}
        >
          <span>{showAdvanced ? 'Hide advanced' : 'More filters'}</span>
          {activeFilterCount > 0 && (
            <span className="rounded-full bg-accent-blue/20 px-1.5 py-0.5 text-[10px] leading-none text-accent-blue">
              {activeFilterCount}
            </span>
          )}
        </button>
      </FilterBar>

      {activeFilterPills.length > 0 && (
        <div className="flex flex-wrap gap-2 rounded-xl border border-border bg-bg-card px-3 py-2.5">
          {activeFilterPills.map((pill) => (
            <button
              key={pill.id}
              type="button"
              onClick={pill.onRemove}
              className="inline-flex items-center gap-2 rounded-full border border-accent-blue/25 bg-accent-blue/10 px-2.5 py-1 text-[11px] text-text-primary transition-colors hover:border-accent-red/30 hover:bg-accent-red/10"
            >
              <span>{pill.label}</span>
              <span className="text-text-muted">×</span>
            </button>
          ))}
        </div>
      )}

      {!hideStats && (
        <div className="grid gap-3 md:grid-cols-3">
          <DataStat
            label="Data Range"
            value={`${formatCoverageDate(filterStats?.date_range?.min)} to ${formatCoverageDate(filterStats?.date_range?.max)}`}
            hint="Report dates are bounded by imported transaction history."
          />
          <DataStat
            label="Coverage"
            value={`${(filterStats?.counts.total_transactions ?? 0).toLocaleString()} records`}
            hint={`${(filterStats?.counts.unique_customers ?? 0).toLocaleString()} customers · ${(filterStats?.counts.unique_accounts ?? 0).toLocaleString()} accounts`}
          />
          <DataStat
            label="Dimensions"
            value={`${filterValues.branches.length} branches · ${filterValues.provinces.length} provinces`}
            hint={`${clusterOptions.length} clusters · ${glOptions.length} GL codes · ${userOptions.length} users`}
          />
        </div>
      )}

      {showAdvanced && (
        <div className="space-y-4 rounded-xl border border-border bg-bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-text-primary">Advanced Filters</h3>
              <p className="mt-1 text-[11px] text-text-secondary">
                Stage your selections below, then click <strong className="text-text-primary">Apply Filters</strong> to load results.
              </p>
            </div>
            {hasPendingChanges && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-accent-amber/30 bg-accent-amber/10 px-2.5 py-1 text-[10.5px] font-medium text-accent-amber">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-amber" />
                Unapplied changes
              </span>
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <FilterLabel>Transaction Type</FilterLabel>
              <MultiValueChipInput value={asArray(draft.tranType)} onChange={(v) => setDraftMulti('tranType', v)} placeholder="Add codes (Enter or ,)" />
            </div>
            <div>
              <FilterLabel>Cluster</FilterLabel>
              <SearchableMultiSelect value={asArray(draft.cluster)} onChange={(v) => setDraftMulti('cluster', v)} options={clusterOptions} placeholder="All clusters" />
            </div>
            <div>
              <FilterLabel>Product</FilterLabel>
              <SearchableMultiSelect value={asArray(draft.product)} onChange={(v) => setDraftMulti('product', v)} options={productOptions} placeholder="All products" />
            </div>
            <div>
              <FilterLabel>Service</FilterLabel>
              <SearchableMultiSelect value={asArray(draft.service)} onChange={(v) => setDraftMulti('service', v)} options={serviceOptions} placeholder="All services" />
            </div>
            <div>
              <FilterLabel>Merchant</FilterLabel>
              <SearchableMultiSelect value={asArray(draft.merchant)} onChange={(v) => setDraftMulti('merchant', v)} options={merchantOptions} placeholder="All merchants" />
            </div>
            <div>
              <FilterLabel>GL Sub Head</FilterLabel>
              <SearchableMultiSelect value={asArray(draft.glSubHeadCode)} onChange={(v) => setDraftMulti('glSubHeadCode', v)} options={glOptions} placeholder="All GL codes" />
            </div>
            <div>
              <FilterLabel>Entry User</FilterLabel>
              <SearchableMultiSelect value={asArray(draft.entryUser)} onChange={(v) => setDraftMulti('entryUser', v)} options={userOptions} placeholder="All entry users" />
            </div>
            <div>
              <FilterLabel>Verified User</FilterLabel>
              <SearchableMultiSelect value={asArray(draft.vfdUser)} onChange={(v) => setDraftMulti('vfdUser', v)} options={userOptions} placeholder="All verified users" />
            </div>
            <div>
              <FilterLabel>TRAN Province</FilterLabel>
              <SearchableMultiSelect value={asArray(draft.tranProvince)} onChange={(v) => setDraftMulti('tranProvince', v)} options={provinceOptions} placeholder="All TRAN provinces" />
            </div>
            <div>
              <FilterLabel>TRAN Cluster</FilterLabel>
              <SearchableMultiSelect value={asArray(draft.tranCluster)} onChange={(v) => setDraftMulti('tranCluster', v)} options={clusterOptions} placeholder="All TRAN clusters" />
            </div>
            <div>
              <FilterLabel>TRAN Branch</FilterLabel>
              <SearchableMultiSelect value={asArray(draft.tranBranch)} onChange={(v) => setDraftMulti('tranBranch', v)} options={branchOptions} placeholder="All TRAN branches" />
            </div>
            <div>
              <FilterLabel>Account Number</FilterLabel>
              <SearchableMultiSelect value={asArray(draft.acctNum)} onChange={(v) => setDraftMulti('acctNum', v)} options={acctNumOptions} placeholder="All accounts" />
            </div>
            <div>
              <FilterLabel>CIF</FilterLabel>
              <SearchableMultiSelect value={asArray(draft.cifId)} onChange={(v) => setDraftMulti('cifId', v)} options={cifIdOptions} placeholder="All CIFs" />
            </div>
            <div>
              <FilterLabel>ACID</FilterLabel>
              <SearchableMultiSelect value={asArray(draft.acid)} onChange={(v) => setDraftMulti('acid', v)} options={acidOptions} placeholder="All ACIDs" />
            </div>
            <div>
              <FilterLabel>Min Amount (NPR)</FilterLabel>
              <input
                type="number"
                value={draft.minAmount ?? ''}
                onChange={(e) => setDraftNumber('minAmount', e.target.value)}
                className="w-full rounded-md border border-border bg-bg-input px-3 py-1.5 text-xs text-text-primary outline-none focus:border-accent-blue"
                placeholder="0"
              />
            </div>
            <div>
              <FilterLabel>Max Amount (NPR)</FilterLabel>
              <input
                type="number"
                value={draft.maxAmount ?? ''}
                onChange={(e) => setDraftNumber('maxAmount', e.target.value)}
                className="w-full rounded-md border border-border bg-bg-input px-3 py-1.5 text-xs text-text-primary outline-none focus:border-accent-blue"
                placeholder="No limit"
              />
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-border pt-3">
            <button
              type="button"
              onClick={handleClear}
              className="text-xs font-medium text-accent-red hover:underline"
            >
              Clear all filters
            </button>
            <div className="flex items-center gap-2">
              {hasPendingChanges && (
                <button
                  type="button"
                  onClick={() => setDraft({ ...filters })}
                  className="rounded-lg border border-border bg-bg-input px-3 py-1.5 text-[11px] font-medium text-text-secondary hover:text-text-primary transition-colors"
                >
                  Discard
                </button>
              )}
              <button
                type="button"
                onClick={handleApply}
                disabled={!hasPendingChanges}
                className={`rounded-lg px-4 py-1.5 text-[11px] font-semibold transition-all ${
                  hasPendingChanges
                    ? 'bg-accent-blue text-white shadow-sm shadow-accent-blue/30 hover:bg-accent-blue/90'
                    : 'bg-bg-input text-text-muted border border-border cursor-not-allowed opacity-50'
                }`}
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Run TypeScript check on this file**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep "AdvancedFilters"
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd frontend
git add components/ui/AdvancedFilters.tsx
git commit -m "$(cat <<'EOF'
AdvancedFilters: procedure-backed dropdowns + chip inputs

- All lookup dropdowns now render name, submit value
- acct_num / cif_id / acid are dropdowns (were text inputs)
- tran_source / tran_type / part_tran_type are chip inputs
- Adds TRAN-side branch/cluster/province dropdowns

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Update `pivot/page.tsx`

**Files:**
- Modify: `frontend/app/dashboard/pivot/page.tsx:153-211` (interface + DIMENSION_FIELDS)
- Modify: `frontend/app/dashboard/pivot/page.tsx:1473-1484` (getOptions)
- Modify: `frontend/app/dashboard/pivot/page.tsx` per-dim filter render switch (search for `field.type === 'text'`)

- [ ] **Step 1: Extend `DimensionFieldDef` type for `text-multi`**

Find (around line 153-164) the `DimensionFieldDef` interface. Change its `type` union from whatever it currently lists to include `'text-multi'`. If the current declaration is e.g. `type: 'date' | 'month' | 'quarter' | 'year' | 'categorical' | 'text';`, change to:

```ts
type: 'date' | 'month' | 'quarter' | 'year' | 'categorical' | 'text' | 'text-multi';
```

- [ ] **Step 2: Extend DIMENSION_FIELDS entries**

In the same file, replace lines 189-206 with the entries below (only lines shown here change; keep the date entries 180-183 unchanged):

```ts
  // ── Customer / Account (geo hierarchy, then identity broad → narrow) ─────
  { key: 'gam_province',     label: 'GAM Province',     type: 'categorical', filterKey: 'province',      optionsKey: 'provinces',         description: 'Province of the account branch (GAM)' },
  { key: 'gam_cluster',      label: 'GAM Cluster',      type: 'categorical', filterKey: 'cluster',       optionsKey: 'clusters',          description: 'Account branch cluster (GAM)' },
  { key: 'gam_branch',       label: 'GAM Branch',       type: 'categorical', filterKey: 'branchCode',    optionsKey: 'branches',          description: 'Account registration branch (GAM)' },
  { key: 'cif_id',           label: 'CIF Id',           type: 'categorical', filterKey: 'cifId',         optionsKey: 'cif_ids',           description: 'Customer CIF ID' },
  { key: 'acid',             label: 'ACID',             type: 'categorical', filterKey: 'acid',          optionsKey: 'acids',             description: 'Internal account identifier' },
  { key: 'acct_num',         label: 'ACCT Num',         type: 'categorical', filterKey: 'acctNum',       optionsKey: 'acct_nums',         description: 'Account number' },
  { key: 'acct_name',        label: 'ACCT Name',        type: 'text',                                    description: 'Account holder name (partial match)' },
  { key: 'tran_date_bal',    label: 'TRAN Date Balance', type: 'text',                                   description: 'Balance snapshot from EAB — renders under pivoted headings as a value column; requires a date dimension' },
  { key: 'eod_balance',      label: 'GAM Balance',      type: 'text',                                    description: 'Current balance from GAM — static per account (does not vary by date); requires an account identifier' },

  // ── Transaction (geo, then channel / type, then accounting / product) ────
  { key: 'tran_province',    label: 'TRAN Province',    type: 'categorical', filterKey: 'tranProvince',  optionsKey: 'provinces',         description: 'Province of the transaction branch' },
  { key: 'tran_cluster',     label: 'TRAN Cluster',     type: 'categorical', filterKey: 'tranCluster',   optionsKey: 'clusters',          description: 'Transaction branch cluster' },
  { key: 'tran_branch',      label: 'TRAN Branch',      type: 'categorical', filterKey: 'tranBranch',    optionsKey: 'branches',          description: 'Branch where the transaction was processed' },
  { key: 'tran_source',      label: 'TRAN Source',      type: 'text-multi',  filterKey: 'tranSource',    description: 'Transaction channel (free-text multi-value)' },
  { key: 'tran_type',        label: 'TRAN Type',        type: 'text-multi',  filterKey: 'tranType',      description: 'Transaction type code (free-text multi-value)' },
  { key: 'part_tran_type',   label: 'PART Tran Type',   type: 'text-multi',  filterKey: 'partTranType',  description: 'Credit or debit side (free-text multi-value, typically CR / DR)' },
  { key: 'gl_sub_head_code', label: 'GL Sub Head',      type: 'categorical', filterKey: 'glSubHeadCode', optionsKey: 'gl_sub_head_codes', description: 'General ledger sub-head code' },
  { key: 'product',          label: 'Product',          type: 'categorical', filterKey: 'product',       optionsKey: 'products',          description: 'Banking product associated with the account' },
  { key: 'service',          label: 'Service',          type: 'categorical', filterKey: 'service',       optionsKey: 'services',          description: 'Service type applied to the transaction' },
  { key: 'merchant',         label: 'Merchant',         type: 'categorical', filterKey: 'merchant',      optionsKey: 'merchants',         description: 'Merchant identifier for payment transactions' },

  // ── User ─────────────────────────────────────────────────────────────────
  { key: 'entry_user',       label: 'ENTRY User',       type: 'categorical', filterKey: 'entryUser',     optionsKey: 'users',             description: 'User who entered the transaction' },
  { key: 'vfd_user',         label: 'VFD User',         type: 'categorical', filterKey: 'vfdUser',       optionsKey: 'users',             description: 'User who verified the transaction' },
];
```

- [ ] **Step 3: Update `getOptions` for new LookupOption shape**

In `pivot/page.tsx` around line 1473-1484, replace:

```ts
  const getOptions = useCallback(
    (field: DimensionFieldDef) => {
      if (field.optionsKey && filterValues) {
        return (filterValues[field.optionsKey] as string[]).filter(Boolean).map((v) => ({ value: v, label: v }));
      }
      if (field.type === 'month')   return dateOptions.months;
      if (field.type === 'quarter') return dateOptions.quarters;
      if (field.type === 'year')    return dateOptions.years;
      return [];
    },
    [filterValues, dateOptions],
  );
```

with:

```ts
  const getOptions = useCallback(
    (field: DimensionFieldDef) => {
      if (field.optionsKey && filterValues) {
        const arr = filterValues[field.optionsKey] as LookupOption[] | undefined;
        return (arr ?? []).map(({ name, value }) => ({ value, label: name }));
      }
      if (field.type === 'month')   return dateOptions.months;
      if (field.type === 'quarter') return dateOptions.quarters;
      if (field.type === 'year')    return dateOptions.years;
      return [];
    },
    [filterValues, dateOptions],
  );
```

Add `LookupOption` to the existing import of `@/types` at the top of the file.

- [ ] **Step 4: Add `text-multi` branch to the per-dim filter render switch**

Search in `pivot/page.tsx` for the JSX branch that renders a text input for `field.type === 'text'` (currently at approx lines 2060-2095 — the sidebar `acct_name`/`cif_id` input). After the existing `text` branch, add a sibling branch for `text-multi` using `MultiValueChipInput`:

Before:
```tsx
                        {field.type === 'text' && (
                          <input
                            ...
```

After — insert **immediately above** the `text` branch (so chip-inputs win for `text-multi` dims):

```tsx
                        {field.type === 'text-multi' && field.filterKey && (
                          <MultiValueChipInput
                            value={getMultiValue(field)}
                            onChange={(vals) => setFieldFilter(field.filterKey!, vals.length > 0 ? vals : undefined)}
                            placeholder={`Add ${field.label.toLowerCase()} values`}
                          />
                        )}
```

Add `import { MultiValueChipInput } from '@/components/ui/MultiValueChipInput';` to the imports at the top of the file.

- [ ] **Step 5: TypeScript check**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep "pivot/page"
```
Expected: no new errors (pre-existing errors outside pivot/page are OK per CLAUDE.md).

- [ ] **Step 6: Commit**

```bash
cd frontend
git add app/dashboard/pivot/page.tsx
git commit -m "$(cat <<'EOF'
Pivot page: procedure-backed dropdowns, chip inputs for type/source

DIMENSION_FIELDS rewritten so acct_num/acid/cif_id render as dropdowns
and tran_branch/cluster/province become filterable. tran_type,
part_tran_type, tran_source use the new MultiValueChipInput.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: Update `segmentation/page.tsx`

**Files:**
- Modify: `frontend/app/dashboard/segmentation/page.tsx` — lines that read `filterValues.provinces`/`branches`

- [ ] **Step 1: Read the relevant section for context**

```bash
sed -n '245,260p' frontend/app/dashboard/segmentation/page.tsx
```

- [ ] **Step 2: Coerce `LookupOption[]` to the consuming shape**

In `frontend/app/dashboard/segmentation/page.tsx`, find the block at line 247-249:

```ts
  const { data: filterValues } = useFilterValues();
  const provinces = (filterValues?.provinces as string[] | undefined) ?? [];
  const branches  = (filterValues?.branches  as string[] | undefined) ?? [];
```

Replace with:

```ts
  const { data: filterValues } = useFilterValues();
  const provinceOptions = (filterValues?.provinces ?? []).map(({ name, value }) => ({ value, label: name }));
  const branchOptions   = (filterValues?.branches  ?? []).map(({ name, value }) => ({ value, label: name }));
  const provinces = provinceOptions.map((o) => o.value);
  const branches  = branchOptions.map((o) => o.value);
```

If elsewhere in the file `provinces`/`branches` is passed to a `SearchableMultiSelect` as `options={...}`, switch to using the new `provinceOptions`/`branchOptions` so labels show names.

- [ ] **Step 3: Grep any other `string[]` assumptions**

```bash
cd frontend && grep -n "as string\[\]" app/dashboard/segmentation/page.tsx
```
Any remaining casts against `filterValues.*` — apply the same `.map({name, value}) => ...)` pattern.

- [ ] **Step 4: TypeScript check**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep "segmentation/page"
```
Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
cd frontend
git add app/dashboard/segmentation/page.tsx
git commit -m "$(cat <<'EOF'
Segmentation page: consume LookupOption[] filter values

Coerces the new {name, value}[] shape so province/branch filters keep
working. Dropdowns now show procedure-supplied names.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 10: End-to-end verification per CLAUDE.md Golden Rules

**Files:**
- Modify: `CLAUDE.md` — update any section that references old filter shape or DISTINCT sourcing
- Modify: `frontend/app/dashboard/skills/page.tsx` — refresh data-dictionary counts if affected

- [ ] **Step 1: Run backend test suite**

```bash
cd backend && bundle exec rspec --format progress
```
Expected: all green. If anything red — fix and re-run.

- [ ] **Step 2: Run frontend test suite**

```bash
cd frontend && npm test
```
Expected: all green including the new `MultiValueChipInput` specs.

- [ ] **Step 3: Full TypeScript check**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep -E "pivot/page|skills/page|AdvancedFilters|segmentation/page|types/index|useDashboardData"
```
Expected: no errors in these files. (Pre-existing errors in `board/`, `branch/`, `customer/`, `executive/` are ignored per CLAUDE.md.)

- [ ] **Step 4: Start backend & frontend, smoke-test the dropdowns**

```bash
# Terminal A
cd backend && rails s -p 3001

# Terminal B
cd frontend && npm run dev
```

Visit `http://localhost:3000/dashboard/pivot`:
- Open AdvancedFilters → verify every dropdown populates with human names (branch, cluster, province, product, service, merchant, GL, users, acct_num, acid, cif_id, tran_branch, tran_cluster, tran_province).
- Quick bar chip inputs (Channel, Part Type) accept Enter/comma input and render chips.
- Advanced-panel Transaction Type chip input works.
- Select a TRAN Branch filter → apply → pivot re-queries with `tranBranch=<value>` and returns filtered rows.
- On `/dashboard/segmentation`, province / branch dropdowns populate with names.

- [ ] **Step 5: Update CLAUDE.md**

Edit `CLAUDE.md` — in the **Known Issues** section add a bullet explaining the new filter-value source; remove any now-stale references to DISTINCT-based filter values. Example addition:

```markdown
- Filter dropdowns (province, cluster, branch, product, service, merchant, GL codes, users, acct_num, acid, cif_id) are populated from `public.get_static_data(type)` — procedure is the canonical source. The response returns `{name, value}[]`; frontend displays `name` and submits `value`. Fetched once per tab session via TanStack Query (`staleTime: Infinity`). To refresh, reload the browser.
- `tran_type`, `part_tran_type`, `tran_source` are free-text multi-value inputs — their value space is too open-ended to enumerate in a dropdown.
- New filter keys `tranBranch`, `tranCluster`, `tranProvince` supplement the GAM-side filters, letting users filter on transaction-branch dimensions.
```

Also update the "Filter set is fixed by what the backend WHERE clauses support" bullet to include the three new TRAN keys.

- [ ] **Step 6: Update `skills/page.tsx`**

If the Dimensions or Filters section lists filter coverage, reflect:
- 3 new filters (`tranBranch`, `tranCluster`, `tranProvince`)
- 11 procedure-backed lookups
- 3 chip-input filters

Run a grep to find what needs updating:
```bash
cd frontend && grep -n "distinct_values\|DISTINCT\|filter_values\|gam_solid\b" app/dashboard/skills/page.tsx
```

Apply minimal text edits — this page is a living dictionary.

- [ ] **Step 7: Final commit**

```bash
git add CLAUDE.md frontend/app/dashboard/skills/page.tsx
git commit -m "$(cat <<'EOF'
Docs: reflect procedure-backed filter dropdowns

CLAUDE.md notes the new data source, chip-input filters, and TRAN-side
filter keys. Skills page dimensions updated to match.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 8: Final `git log` sanity check**

```bash
git log --oneline -15
```
Expected: ~10 commits, one per task, spec commit at the root.

---

## Self-review

**Spec coverage:** every numbered spec section has a task (Task 1 = §4.1, Task 2 = §4.3/§4.4, Task 3 = §4.2/§4.5, Task 4 = §5.1, Task 5 = §5.2, Task 6 = §5.3, Task 7 = §5.4, Task 8 = §5.5, Task 9 = §5.6, Task 10 = §7 testing + CLAUDE.md Golden Rules).

**Placeholder scan:** no TBDs, no "similar to above" references, each step shows actual commands or code.

**Type consistency:** `LookupOption` defined in Task 4 and referenced in Tasks 7, 8, 9. `static_lookup(type)` defined in Task 1, used in Task 3. Filter keys `tranBranch`/`tranCluster`/`tranProvince` defined consistently in Tasks 2 (backend), 4 (type), 7 (AdvancedFilters), 8 (pivot).

**Known gotchas called out:**
- Task 1 step 1 mentions vitest config may need `jsdom`.
- Task 8 step 3 adds the `LookupOption` import alongside the shape change.
- Task 10 step 3 explicitly narrows the grep to files not pre-existing-broken.
