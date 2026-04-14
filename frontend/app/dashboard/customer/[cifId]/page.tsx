"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { AdvancedFilters } from "@/components/ui/AdvancedFilters";
import { KPICard } from "@/components/ui/KPICard";
import { ChartCard, ChartEmptyState } from "@/components/ui/ChartCard";
import {
  AdvancedDataTable,
  ColumnDef,
} from "@/components/ui/AdvancedDataTable";
import { RecordTable } from "@/components/ui/RecordTable";
import { Badge, badgeColor } from "@/components/ui/badge";
import { useCustomerProfile } from "@/lib/hooks/useDashboardData";
import { useDashboardPage } from "@/lib/hooks/useDashboardPage";
import { formatChannelLabel, formatNPR } from "@/lib/formatters";
import type { CustomerRecentTransaction } from "@/types";
import { CustomerDashboardSkeleton } from "@/components/ui/DashboardSkeleton";
import { PremiumBarChart } from "@/components/ui/PremiumCharts";

interface BranchTouchpoint {
  branch_code: string;
  province: string;
  total_amount: number;
  transaction_count: number;
  unique_accounts: number;
}

export default function CustomerDetailPage() {
  const params = useParams<{ cifId: string }>();
  const cifId = decodeURIComponent(params.cifId);
  const [txFilter, setTxFilter] = useState<"all" | "income" | "expense">("all");

  // Shared dashboard page state — period presets, filter panel toggle, clear,
  // and date-range sync. The cifId is pinned as an "extra filter" so the user
  // cannot accidentally clear it while changing other filters.
  const extraFilters = useMemo(() => ({ cifId }), [cifId]);
  const {
    filters,
    setFilters,
    filtersOpen,
    setFiltersOpen,
    handleClearFilters,
    topBarProps,
  } = useDashboardPage({ extraFilters });

  const { data: profile, isLoading } = useCustomerProfile(filters, cifId);

  const branchColumns = useMemo<ColumnDef<BranchTouchpoint>[]>(
    () => [
      {
        accessorKey: "branch_code",
        header: "Branch",
        enableColumnFilter: true,
        filterFn: "arrayFilter",
        meta: { filterType: "select" },
        cell: ({ row }) => (
          <Link
            href={`/dashboard/branch/${encodeURIComponent(row.original.branch_code)}`}
            className="font-medium text-accent-blue hover:underline"
          >
            {row.original.branch_code}
          </Link>
        ),
      },
      {
        accessorKey: "province",
        header: "Province",
        enableColumnFilter: true,
        filterFn: "arrayFilter",
        meta: { filterType: "select" },
        cell: (info) => String(info.getValue()),
      },
      {
        accessorKey: "total_amount",
        header: "Total Amount",
        enableSorting: true,
        sortDescFirst: true,
        enableColumnFilter: true,
        filterFn: "numberRange",
        meta: { filterType: "number-range" },
        cell: ({ row }) => (
          <strong className="text-text-primary font-mono text-xs">
            {formatNPR(row.original.total_amount)}
          </strong>
        ),
      },
      {
        accessorKey: "transaction_count",
        header: "Transactions",
        enableSorting: true,
        enableColumnFilter: true,
        filterFn: "numberRange",
        meta: { filterType: "number-range" },
        cell: ({ row }) => row.original.transaction_count.toLocaleString(),
      },
      {
        accessorKey: "unique_accounts",
        header: "Accounts",
        enableSorting: true,
        cell: ({ row }) => row.original.unique_accounts.toLocaleString(),
      },
      {
        id: "avg_txn",
        header: "Avg Txn",
        enableSorting: true,
        sortingFn: (a, b) =>
          (a.original.transaction_count > 0
            ? a.original.total_amount / a.original.transaction_count
            : 0) -
          (b.original.transaction_count > 0
            ? b.original.total_amount / b.original.transaction_count
            : 0),
        cell: ({ row }) => (
          <span className="font-mono text-xs">
            {row.original.transaction_count > 0
              ? formatNPR(
                  row.original.total_amount / row.original.transaction_count,
                )
              : "—"}
          </span>
        ),
      },
    ],
    [],
  );

  const accountColumns = useMemo<
    ColumnDef<Record<string, string | number | boolean | null>>[]
  >(
    () => [
      {
        accessorKey: "acct_num",
        header: "Account Number",
        cell: ({ row }) => (
          <strong className="text-text-primary">
            {String(row.original.acct_num ?? "")}
          </strong>
        ),
        enableColumnFilter: true,
      },
      { accessorKey: "acid", header: "ACID", enableColumnFilter: true },
      {
        accessorKey: "acct_name",
        header: "Account Name",
        cell: ({ row }) => String(row.original.acct_name || "—"),
        enableColumnFilter: true,
      },
      {
        accessorKey: "schm_type",
        header: "Scheme Type",
        enableColumnFilter: true,
        filterFn: "arrayFilter",
        meta: { filterType: "select" },
      },
      { accessorKey: "sol_id", header: "SOL ID", enableColumnFilter: true },
      {
        accessorKey: "gl_sub_head_code",
        header: "GL Code",
        enableColumnFilter: true,
      },
      {
        accessorKey: "eod_balance",
        header: "EOD Balance",
        cell: ({ row }) => (
          <strong className="text-text-primary">
            {formatNPR(Number(row.original.eod_balance ?? 0))}
          </strong>
        ),
        enableSorting: true,
        sortDescFirst: true,
      },
      {
        accessorKey: "lchg_time",
        header: "Last Updated",
        cell: ({ row }) =>
          row.original.lchg_time
            ? new Date(String(row.original.lchg_time)).toLocaleDateString(
                "en-NP",
                { year: "numeric", month: "short", day: "numeric" },
              )
            : "—",
      },
    ],
    [],
  );

  const transactionColumns = useMemo<ColumnDef<CustomerRecentTransaction>[]>(
    () => [
      {
        accessorKey: "date",
        header: "Date",
        enableSorting: true,
        enableColumnFilter: true,
        meta: { filterType: "text" },
      },
      {
        accessorKey: "description",
        header: "Description",
        cell: ({ row }) => (
          <strong className="text-text-primary">
            {row.original.description}
          </strong>
        ),
        enableColumnFilter: true,
      },
      {
        accessorKey: "category",
        header: "Category",
        enableColumnFilter: true,
        filterFn: "arrayFilter",
        meta: { filterType: "select" },
      },
      {
        accessorKey: "part_tran_type",
        header: "Part Type",
        cell: ({ row }) => (
          <Badge
            className={
              row.original.part_tran_type === "CR"
                ? badgeColor.green
                : badgeColor.red
            }
          >
            {row.original.part_tran_type}
          </Badge>
        ),
        enableColumnFilter: true,
        filterFn: "arrayFilter",
        meta: { filterType: "select" },
      },
      {
        accessorKey: "account_number",
        header: "Account",
        enableColumnFilter: true,
      },
      {
        accessorKey: "acid",
        header: "ACID",
        enableColumnFilter: true,
      },
      {
        accessorKey: "amount",
        header: "Amount",
        cell: ({ row }) => (
          <span
            className={
              row.original.type === "income"
                ? "text-accent-green font-semibold"
                : "text-accent-red font-semibold"
            }
          >
            {formatNPR(row.original.amount)}
          </span>
        ),
        enableSorting: true,
        enableColumnFilter: true,
        filterFn: "numberRange",
        meta: { filterType: "number-range" },
      },
      {
        accessorKey: "balance_after",
        header: "Balance After",
        cell: ({ row }) => formatNPR(row.original.balance_after),
        enableSorting: true,
        enableColumnFilter: true,
        filterFn: "numberRange",
        meta: { filterType: "number-range" },
      },
    ],
    [],
  );

  if (isLoading) {
    return (
      <>
        <TopBar title="Customer Detail" subtitle={cifId} {...topBarProps} />
        <CustomerDashboardSkeleton />
      </>
    );
  }

  const summary = profile?.summary;
  const byBranch = (profile?.by_branch || []) as BranchTouchpoint[];
  const channelData = profile?.by_channel || [];
  const trendData = profile?.trend || [];
  const accounts = profile?.accounts || [];
  const recentTransactions = profile?.recent_transactions || [];
  const filteredTransactions = recentTransactions.filter((transaction) =>
    txFilter === "all" ? true : transaction.type === txFilter,
  );
  const customerName =
    profile?.customer_name || `Customer ${profile?.requested_cif_id || cifId}`;
  const customerSegment = profile?.segment || "Mass Retail";
  const riskTier = profile?.risk_tier || 1;
  const totalAccountBalance = accounts.reduce(
    (sum, account) => sum + Number(account.eod_balance ?? 0),
    0,
  );

  return (
    <>
      <TopBar
        title={customerName}
        subtitle={`Customer Detail · ${profile?.cif_id || cifId}`}
        {...topBarProps}
      />

      <div className="px-5 py-4 flex flex-col gap-[14px]">
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard/customer"
            className="text-xs text-accent-blue hover:underline"
          >
            ← Back to Customer &amp; Portfolio
          </Link>
          <div className="flex items-center gap-2">
            <Badge className={badgeColor.blue}>{customerSegment}</Badge>
            <Badge
              className={
                riskTier === 1
                  ? badgeColor.green
                  : riskTier === 2
                    ? badgeColor.amber
                    : badgeColor.red
              }
            >
              Tier {riskTier}
            </Badge>
          </div>
        </div>
        <AdvancedFilters
          filters={filters}
          onChange={setFilters}
          onClear={handleClearFilters}
          advancedOpen={filtersOpen}
          onAdvancedOpenChange={setFiltersOpen}
          hideStats
        />

        {/* ── Personal Info Card ── */}
        <div className="rounded-xl border border-border bg-bg-card p-4">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-white text-[16px] font-bold flex-shrink-0"
              style={{
                background: "linear-gradient(135deg, #3b82f6 0%, #7c3aed 100%)",
              }}
            >
              {(profile?.first_name || customerName).slice(0, 1).toUpperCase()}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-[15px] font-bold text-text-primary">
                  {[profile?.first_name, profile?.last_name]
                    .filter(Boolean)
                    .join(" ") || customerName}
                </h2>
                <Badge className={badgeColor.blue}>{customerSegment}</Badge>
                <Badge
                  className={
                    riskTier === 1
                      ? badgeColor.green
                      : riskTier === 2
                        ? badgeColor.amber
                        : badgeColor.red
                  }
                >
                  Risk Tier {riskTier}
                </Badge>
                {profile?.account_status && (
                  <Badge
                    className={
                      profile.account_status === "A"
                        ? badgeColor.green
                        : badgeColor.red
                    }
                  >
                    {profile.account_status === "A" ? "Active" : "Inactive"}
                  </Badge>
                )}
              </div>

              <div className="mt-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-2">
                {[
                  { label: "CIF ID", value: profile?.cif_id },
                  { label: "Customer ID", value: profile?.customer_id },
                  { label: "Email", value: profile?.email || "—" },
                  { label: "Phone", value: profile?.phone_number || "—" },
                  {
                    label: "Date of Birth",
                    value: profile?.date_of_birth
                      ? new Date(profile.date_of_birth).toLocaleDateString(
                          "en-NP",
                          { year: "numeric", month: "short", day: "numeric" },
                        )
                      : "—",
                  },
                  {
                    label: "Age",
                    value: profile?.age ? `${profile.age} years` : "—",
                  },
                  { label: "Address", value: profile?.address || "—" },
                  { label: "Accounts", value: accounts.length },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="text-[9.5px] font-semibold uppercase tracking-[0.4px] text-text-muted">
                      {item.label}
                    </div>
                    <div className="text-[11.5px] text-text-primary mt-0.5 truncate">
                      {item.value ?? "—"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <KPICard
            label="Total Amount"
            value={formatNPR(summary?.total_amount || 0)}
            iconBg="var(--accent-blue-dim)"
          />
          <KPICard
            label="Transactions"
            value={(summary?.total_count || 0).toLocaleString()}
            iconBg="var(--accent-green-dim)"
          />
          <KPICard
            label="Accounts"
            value={(summary?.unique_accounts || 0).toLocaleString()}
            iconBg="var(--accent-teal-dim)"
          />
          <KPICard
            label="Avg Transaction"
            value={formatNPR(summary?.avg_transaction_size || 0)}
            iconBg="var(--accent-purple-dim)"
          />
          <KPICard
            label="Active Channels"
            value={channelData.length.toString()}
            iconBg="var(--accent-amber-dim)"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <ChartCard title="Daily Trend" subtitle="Amount by transaction date">
            {trendData.length === 0 ? (
              <ChartEmptyState title="No customer trend data" />
            ) : (
              <PremiumBarChart
                data={trendData as unknown as Record<string, unknown>[]}
                xAxisKey="date"
                series={[
                  { dataKey: "amount", name: "Amount", color: "#3b82f6" },
                ]}
                formatValue={formatNPR}
                formatXAxis={(v) => v.slice(5)}
                height={260}
              />
            )}
          </ChartCard>

          <ChartCard
            title="Channel Mix"
            subtitle="Customer transaction channels"
          >
            {channelData.length === 0 ? (
              <ChartEmptyState title="No channel data" />
            ) : (
              <PremiumBarChart
                data={channelData as unknown as Record<string, unknown>[]}
                xAxisKey="channel"
                series={[
                  { dataKey: "total_amount", name: "Amount", color: "#10b981" },
                ]}
                formatValue={formatNPR}
                formatXAxis={formatChannelLabel}
                height={260}
              />
            )}
          </ChartCard>
        </div>

        {/* GAM Account Master — all 96 columns, dynamic via RecordTable */}
        <RecordTable
          title="GAM Account Master"
          subtitle={`${accounts.length} accounts · ${formatNPR(totalAccountBalance)} total balance · ${(profile as any)?.account_columns?.length || 0} GAM columns — click Columns to show/hide`}
          columns={
            (profile as any)?.account_columns || Object.keys(accounts[0] || {})
          }
          rows={
            accounts as unknown as Array<
              Record<string, string | number | boolean | null>
            >
          }
        />

        <AdvancedDataTable
          title="Recent Transactions"
          subtitle="Filter and review latest customer activity — use Columns to show/hide fields"
          data={filteredTransactions}
          columns={transactionColumns}
          pageSize={15}
          enableFiltering={true}
          enableSorting={true}
          enablePagination={true}
          initialHidden={{ acid: true, balance_after: true }}
          actions={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTxFilter("all")}
                className={`px-2.5 py-1 text-[11px] rounded-md border transition-colors ${
                  txFilter === "all"
                    ? "bg-accent-blue text-white border-accent-blue"
                    : "bg-bg-input text-text-secondary border-border hover:text-text-primary"
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setTxFilter("income")}
                className={`px-2.5 py-1 text-[11px] rounded-md border transition-colors ${
                  txFilter === "income"
                    ? "bg-accent-green text-white border-accent-green"
                    : "bg-bg-input text-text-secondary border-border hover:text-text-primary"
                }`}
              >
                Income
              </button>
              <button
                type="button"
                onClick={() => setTxFilter("expense")}
                className={`px-2.5 py-1 text-[11px] rounded-md border transition-colors ${
                  txFilter === "expense"
                    ? "bg-accent-red text-white border-accent-red"
                    : "bg-bg-input text-text-secondary border-border hover:text-text-primary"
                }`}
              >
                Expenses
              </button>
            </div>
          }
        />

        <AdvancedDataTable
          title="Branch Touchpoints"
          subtitle={`${byBranch.length} branches interacted by this customer — use Columns to show/hide fields`}
          data={byBranch}
          columns={branchColumns}
          pageSize={10}
          enableFiltering={true}
          enableSorting={true}
          enablePagination={false}
          initialHidden={{ avg_txn: true }}
        />
      </div>
    </>
  );
}
