"use client";

import { useMemo } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { AdvancedFilters } from "@/components/ui/AdvancedFilters";
import {
  AdvancedDataTable,
  ColumnDef,
} from "@/components/ui/AdvancedDataTable";
import { KPICard } from "@/components/ui/KPICard";
import { ChartCard } from "@/components/ui/ChartCard";
import {
  DataTable,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeader,
  TableCell,
} from "@/components/ui/DataTable";
import { useDashboardData } from "@/lib/hooks/useDashboardData";
import { useDashboardPage } from "@/lib/hooks/useDashboardPage";
import { formatNPR, formatPercent } from "@/lib/formatters";
import {
  PremiumLineChart,
  PremiumBarChart,
} from "@/components/ui/PremiumCharts";

// BOARD_REPORTS removed — no live database source for governance report registry.
// When a reports API is connected, restore a data-driven table here.

interface BoardBranchRow {
  branch_code: string;
  province: string;
  total_amount: number;
  transaction_count: number;
  unique_accounts: number;
}

export default function BoardDashboard() {
  // Phase 2 R-6: replaced ~40 lines of inline period/filter state with the
  // shared hook. `useDashboardPage` owns DashboardPeriod state, the
  // referenceDate/minReferenceDate memos, the period→date-range sync effect,
  // and handleClearFilters. Behavior is unchanged because this page had no
  // page-specific overrides (no extraFilters, no mounted gate, no custom
  // filterStats guard) — pure boilerplate that was drifting from the rest
  // of the dashboard pages.
  const {
    filters,
    setFilters,
    filtersOpen,
    setFiltersOpen,
    handleClearFilters,
    topBarProps,
  } = useDashboardPage();

  const { data, isLoading } = useDashboardData(filters);

  const summary = data?.summary;
  const trend = data?.trend ?? [];
  const topBranches = (data?.by_branch ?? []).slice(0, 5);
  const topProvinces = (data?.by_province ?? []).slice(0, 7);
  const branchColumns = useMemo<ColumnDef<BoardBranchRow>[]>(
    () => [
      {
        accessorKey: "branch_code",
        header: "Branch",
        enableSorting: true,
        enableColumnFilter: true,
        filterFn: "arrayFilter",
        meta: { filterType: "select" },
      },
      {
        accessorKey: "province",
        header: "Province",
        enableSorting: true,
        enableColumnFilter: true,
        filterFn: "arrayFilter",
        meta: { filterType: "select" },
      },
      {
        accessorKey: "total_amount",
        header: "Volume",
        cell: ({ row }) => (
          <strong className="text-text-primary">
            {formatNPR(row.original.total_amount)}
          </strong>
        ),
        enableSorting: true,
        enableColumnFilter: true,
        filterFn: "numberRange",
        meta: { filterType: "number-range" },
      },
      {
        accessorKey: "transaction_count",
        header: "Transactions",
        cell: ({ row }) => row.original.transaction_count.toLocaleString(),
        enableSorting: true,
        enableColumnFilter: true,
        filterFn: "numberRange",
        meta: { filterType: "number-range" },
      },
      {
        accessorKey: "unique_accounts",
        header: "Accounts",
        cell: ({ row }) => row.original.unique_accounts.toLocaleString(),
        enableSorting: true,
        enableColumnFilter: true,
        filterFn: "numberRange",
        meta: { filterType: "number-range" },
      },
    ],
    [],
  );

  return (
    <>
      <TopBar
        title="Board & Executive Packs"
        subtitle="Strategic overview & governance reporting"
        {...topBarProps}
      />
      <div className="flex flex-col gap-[14px] px-5 py-4">
        <AdvancedFilters
          filters={filters}
          onChange={setFilters}
          onClear={handleClearFilters}
          advancedOpen={filtersOpen}
          onAdvancedOpenChange={setFiltersOpen}
        />
        {/* Executive KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <KPICard
            label="Total Transaction Volume"
            value={formatNPR(summary?.total_amount ?? 0)}
            highlighted
            iconBg="var(--accent-blue-dim)"
            sparkData={trend.slice(-30).map((t) => t.amount)}
          />
          <KPICard
            label="Total Transactions"
            value={(summary?.total_count ?? 0).toLocaleString()}
            iconBg="var(--accent-green-dim)"
            sparkData={trend.slice(-30).map((t) => t.count)}
          />
          <KPICard
            label="Unique Customers"
            value={(summary?.unique_customers ?? 0).toLocaleString()}
            iconBg="var(--accent-purple-dim)"
          />
          <KPICard
            label="Active Accounts"
            value={(summary?.unique_accounts ?? 0).toLocaleString()}
            iconBg="var(--accent-teal-dim)"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <KPICard
            label="Credit Inflow"
            value={formatNPR(summary?.credit_amount ?? 0)}
            iconBg="var(--accent-green-dim)"
          />
          <KPICard
            label="Debit Outflow"
            value={formatNPR(summary?.debit_amount ?? 0)}
            iconBg="var(--accent-red-dim)"
          />
          <KPICard
            label="Net Flow"
            value={formatNPR(summary?.net_flow ?? 0)}
            iconBg={
              (summary?.net_flow ?? 0) >= 0
                ? "var(--accent-green-dim)"
                : "var(--accent-red-dim)"
            }
          />
          <KPICard
            label="Avg Transaction"
            value={formatNPR(summary?.avg_transaction_size ?? 0)}
            iconBg="var(--accent-amber-dim)"
          />
        </div>

        {/* Trend and Province */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <ChartCard
            title="Transaction Volume Trend"
            subtitle="Daily transaction volume"
          >
            <PremiumLineChart
              data={trend.slice(-60)}
              xAxisKey="date"
              series={[{ dataKey: "amount", name: "Amount", color: "#3b82f6" }]}
              formatValue={formatNPR}
              formatXAxis={(v) => v.slice(5)}
              height={220}
            />
          </ChartCard>

          <ChartCard title="Province Performance" subtitle="Volume by province">
            <PremiumBarChart
              data={topProvinces}
              xAxisKey="province"
              series={[
                { dataKey: "total_amount", name: "Volume", color: "#10b981" },
              ]}
              formatValue={formatNPR}
              height={220}
            />
          </ChartCard>
        </div>

        {/* Top Branches */}
        <AdvancedDataTable
          title="Top Performing Branches"
          subtitle="Ranked by transaction volume"
          data={topBranches}
          columns={branchColumns}
          pageSize={10}
          enableFiltering={true}
          enableSorting={true}
          enablePagination={false}
        />

        {/* Governance Reports — no report registry API connected yet */}
        <DataTable
          title="Governance Reports"
          subtitle="No report registry connected"
        >
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
            <span className="text-[12px] text-text-muted">
              No governance report registry is connected to the database.
            </span>
            <span className="text-[10px] text-text-muted opacity-60">
              Connect a reports API endpoint to list and download board reports
              here.
            </span>
          </div>
        </DataTable>
      </div>
    </>
  );
}
