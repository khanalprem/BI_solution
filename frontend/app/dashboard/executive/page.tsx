"use client";

import { useState, useEffect, useMemo } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { AdvancedFilters } from "@/components/ui/AdvancedFilters";
import {
  useDashboardData,
  useFilterStatistics,
  useDemographics,
} from "@/lib/hooks/useDashboardData";
import {
  formatChannelLabel,
  formatNPR,
  formatProvinceLabel,
  getDateRange,
  parseISODateToLocal,
} from "@/lib/formatters";
import type {
  DashboardFilters,
  BranchMetrics,
  ProvinceMetrics,
  ChannelMetrics,
  TrendData,
} from "@/types";
import {
  SparkLine,
  PremiumLineChart,
  PremiumBarChart,
  useEChart,
} from "@/components/ui/PremiumCharts";
import {
  AdvancedDataTable,
  ColumnDef,
} from "@/components/ui/AdvancedDataTable";
import Link from "next/link";
import type { ProvinceMetrics as PM } from "@/types";

// ── Apache ECharts: Province horizontal bar ──
function ProvinceBarChart({ data }: { data: PM[] }) {
  // Sort ascending so the highest-volume province sits at the top of the chart
  const sorted = [...data].sort((a, b) => a.total_amount - b.total_amount);
  const labels = sorted.map((p) => formatProvinceLabel(p.province));
  const amounts = sorted.map((p) => +(p.total_amount / 1e7).toFixed(1)); // Crores
  const counts = sorted.map((p) => p.transaction_count);

  const chartRef = useEChart(() => {
    const t = {
      tooltipBg: css("--chart-tooltip-bg", "#1a1e2e"),
      tooltipBd: css("--chart-tooltip-border", "rgba(255,255,255,0.14)"),
      textPri: css("--text-primary", "#f0f2f8"),
      textMuted: css("--text-muted", "#555d75"),
      textSec: css("--text-secondary", "#8b92a9"),
      grid: css("--chart-grid", "rgba(255,255,255,0.06)"),
    };

    return {
      backgroundColor: "transparent",
      grid: { left: 100, right: 110, top: 8, bottom: 24 },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        backgroundColor: t.tooltipBg,
        borderColor: t.tooltipBd,
        textStyle: { color: t.textPri, fontSize: 11 },
        formatter: (
          params: { name: string; value: number; dataIndex: number }[],
        ) => {
          const i = params[0].dataIndex;
          return (
            `<b style="color:${t.textPri}">${params[0].name}</b><br/>` +
            `<span style="color:#6366f1">Volume</span>: Rs. ${amounts[i]}Cr<br/>` +
            `<span style="color:#10b981">Transactions</span>: ${counts[i].toLocaleString()}`
          );
        },
      },
      xAxis: {
        type: "value",
        axisLabel: {
          color: t.textMuted,
          fontSize: 9,
          formatter: (v: number) => `${v}Cr`,
        },
        splitLine: { lineStyle: { color: t.grid } },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      yAxis: {
        type: "category",
        data: labels,
        axisLabel: { color: t.textSec, fontSize: 10.5 },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: [
        {
          name: "Volume",
          type: "bar",
          data: amounts.map((v, i) => ({
            value: v,
            itemStyle: {
              color: {
                type: "linear",
                x: 0,
                y: 0,
                x2: 1,
                y2: 0,
                colorStops: [
                  { offset: 0, color: "rgba(99,102,241,0.25)" },
                  { offset: 1, color: "#6366F1" },
                ],
              },
              borderRadius: [0, 5, 5, 0],
            },
            label: {
              show: true,
              position: "right",
              formatter: () =>
                `${amounts[i]}Cr  ·  ${(counts[i] / 1000).toFixed(1)}K txns`,
              color: t.textMuted,
              fontSize: 9,
            },
          })),
          barMaxWidth: 22,
          emphasis: {
            itemStyle: {
              color: {
                type: "linear",
                x: 0,
                y: 0,
                x2: 1,
                y2: 0,
                colorStops: [
                  { offset: 0, color: "rgba(99,102,241,0.4)" },
                  { offset: 1, color: "#818cf8" },
                ],
              },
            },
          },
        },
      ],
    };
  }, [data]);

  return <div ref={chartRef} className="h-[240px] w-full" />;
}

// ── Apache ECharts: Province donut (volume share) ──
function ProvinceDonutChart({ data }: { data: PM[] }) {
  const sorted = [...data].sort((a, b) => b.total_amount - a.total_amount);
  const PALETTE = [
    "#6366F1",
    "#10b981",
    "#f59e0b",
    "#8b5cf6",
    "#14b8a6",
    "#f43f5e",
    "#ec4899",
  ];

  const chartRef = useEChart(() => {
    const t = {
      tooltipBg: css("--chart-tooltip-bg", "#1a1e2e"),
      tooltipBd: css("--chart-tooltip-border", "rgba(255,255,255,0.14)"),
      textPri: css("--text-primary", "#f0f2f8"),
      textSec: css("--text-secondary", "#8b92a9"),
    };

    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "item",
        backgroundColor: t.tooltipBg,
        borderColor: t.tooltipBd,
        textStyle: { color: t.textPri, fontSize: 11 },
        formatter: (p: { name: string; value: number; percent: number }) =>
          `<b>${p.name}</b><br/>Rs. ${(p.value / 1e7).toFixed(1)} Cr &nbsp;·&nbsp; ${p.percent.toFixed(1)}%`,
      },
      legend: {
        orient: "vertical",
        right: 4,
        top: "middle",
        textStyle: { color: t.textSec, fontSize: 9.5 },
        itemWidth: 8,
        itemHeight: 8,
        itemGap: 8,
      },
      series: [
        {
          type: "pie",
          radius: ["40%", "70%"],
          center: ["34%", "50%"],
          avoidLabelOverlap: true,
          itemStyle: {
            borderRadius: 5,
            borderColor: "rgba(0,0,0,0.25)",
            borderWidth: 2,
          },
          label: { show: false },
          emphasis: {
            label: {
              show: true,
              fontSize: 11,
              fontWeight: "bold",
              color: t.textPri,
            },
            scale: true,
            scaleSize: 6,
          },
          data: sorted.map((p, i) => ({
            name: formatProvinceLabel(p.province),
            value: p.total_amount,
            itemStyle: { color: PALETTE[i % PALETTE.length] },
          })),
        },
      ],
    };
  }, [data]);

  if (!data.length) return null;
  return <div ref={chartRef} className="h-[260px] w-full" />;
}

function css(v: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  return (
    getComputedStyle(document.documentElement).getPropertyValue(v).trim() ||
    fallback
  );
}

type DashboardPeriod =
  | "ALL"
  | "1D"
  | "WTD"
  | "MTD"
  | "QTD"
  | "YTD"
  | "PYTD"
  | "FY"
  | "CUSTOM";

// RISK_ITEMS and ALERTS removed — no live database source for risk scores or alert events.
// These panels now show a "not connected" placeholder. When a risk/alerts API is added,
// replace the placeholder panels below and restore data-driven rendering here.

function SparkCard({
  label,
  value,
  sub,
  color,
  dimColor,
  icon,
  sparkData,
  highlighted = false,
}: {
  label: string;
  value: string;
  sub: string;
  color: string;
  dimColor: string;
  icon: React.ReactNode;
  sparkData: number[];
  highlighted?: boolean;
}) {
  return (
    <div
      className={`bg-bg-card rounded-xl p-3.5 flex flex-col gap-1 border ${highlighted ? "border-[rgba(59,130,246,0.3)]" : "border-border"}`}
      style={
        highlighted
          ? {
              background: `linear-gradient(135deg, ${dimColor} 0%, var(--bg-card) 60%)`,
            }
          : {}
      }
    >
      <div className="flex justify-between items-center">
        <span className="text-[10px] text-text-muted font-medium uppercase tracking-[0.4px]">
          {label}
        </span>
        <div
          className="w-6 h-6 rounded-md flex items-center justify-center"
          style={{ background: dimColor }}
        >
          {icon}
        </div>
      </div>
      <div className="text-xl font-mono font-bold text-text-primary leading-tight">
        {value}
      </div>
      <div className="h-9 -mx-0.5 my-0.5">
        <SparkLine data={sparkData} color={color} height={36} />
      </div>
      <div className="text-[10px] text-text-muted">{sub}</div>
    </div>
  );
}

export default function ExecutiveDashboard() {
  const [period, setPeriod] = useState<DashboardPeriod>("ALL");
  const [filters, setFilters] = useState<DashboardFilters>({
    ...getDateRange("ALL"),
  });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const { data, isLoading, error } = useDashboardData(filters);
  const { data: filterStats } = useFilterStatistics();
  const { data: demographics } = useDemographics();

  const referenceDate = useMemo(
    () => parseISODateToLocal(filterStats?.date_range?.max) || new Date(),
    [filterStats?.date_range?.max],
  );
  const minReferenceDate = useMemo(
    () => parseISODateToLocal(filterStats?.date_range?.min) ?? undefined,
    [filterStats?.date_range?.min],
  );

  // ── Branch table columns ──
  const branchColumns = useMemo<ColumnDef<BranchMetrics>[]>(
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
            className="font-semibold text-accent-blue hover:underline"
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
      },
      {
        accessorKey: "total_amount",
        header: "Total Volume",
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
        sortDescFirst: true,
        enableColumnFilter: true,
        filterFn: "numberRange",
        meta: { filterType: "number-range" },
        cell: ({ row }) => row.original.transaction_count.toLocaleString(),
      },
      {
        accessorKey: "unique_accounts",
        header: "Accounts",
        enableSorting: true,
        enableColumnFilter: true,
        filterFn: "numberRange",
        meta: { filterType: "number-range" },
        cell: ({ row }) => row.original.unique_accounts.toLocaleString(),
      },
      {
        accessorKey: "avg_transaction",
        header: "Avg Txn",
        enableSorting: true,
        enableColumnFilter: true,
        filterFn: "numberRange",
        meta: { filterType: "number-range" },
        cell: ({ row }) => (
          <span className="font-mono text-xs">
            {formatNPR(row.original.avg_transaction)}
          </span>
        ),
      },
      {
        id: "txn_per_account",
        header: "Txns / Account",
        enableSorting: true,
        sortingFn: (a, b) =>
          (a.original.unique_accounts > 0
            ? a.original.transaction_count / a.original.unique_accounts
            : 0) -
          (b.original.unique_accounts > 0
            ? b.original.transaction_count / b.original.unique_accounts
            : 0),
        cell: ({ row }) =>
          row.original.unique_accounts > 0
            ? (
                row.original.transaction_count / row.original.unique_accounts
              ).toFixed(1)
            : "—",
      },
      {
        id: "vol_per_account",
        header: "Vol / Account",
        enableSorting: true,
        sortingFn: (a, b) =>
          (a.original.unique_accounts > 0
            ? a.original.total_amount / a.original.unique_accounts
            : 0) -
          (b.original.unique_accounts > 0
            ? b.original.total_amount / b.original.unique_accounts
            : 0),
        cell: ({ row }) => (
          <span className="font-mono text-xs">
            {formatNPR(
              row.original.unique_accounts > 0
                ? row.original.total_amount / row.original.unique_accounts
                : 0,
            )}
          </span>
        ),
      },
      {
        id: "performance",
        header: "Network Share",
        enableSorting: true,
        sortingFn: (a, b) => a.original.total_amount - b.original.total_amount,
        cell: ({ row, table: t }) => {
          const rows = t.getCoreRowModel().rows;
          const total =
            rows.reduce(
              (s, r) => s + (r.original as BranchMetrics).total_amount,
              0,
            ) || 1;
          const pct = (row.original.total_amount / total) * 100;
          return (
            <div className="flex items-center gap-2 min-w-[80px]">
              <div className="flex-1 h-1.5 rounded-full bg-bg-input overflow-hidden">
                <div
                  className="h-full rounded-full bg-accent-blue transition-all"
                  style={{ width: `${Math.min(pct * 5, 100)}%` }}
                />
              </div>
              <span className="text-[9.5px] text-text-muted w-9 text-right">
                {pct.toFixed(1)}%
              </span>
            </div>
          );
        },
      },
    ],
    [],
  );

  // ── Age group table columns ──
  type AgeGroup = {
    age_group: string;
    customers: number;
    accounts?: number;
    total_amount: number;
    transaction_count: number;
    credit_amount: number;
    debit_amount: number;
  };
  const ageColumns = useMemo<ColumnDef<AgeGroup>[]>(
    () => [
      {
        accessorKey: "age_group",
        header: "Age Group",
        enableColumnFilter: true,
        filterFn: "arrayFilter",
        meta: { filterType: "select" },
        cell: ({ row }) => (
          <strong className="text-text-primary">
            {row.original.age_group}
          </strong>
        ),
      },
      {
        accessorKey: "customers",
        header: "Customers",
        enableSorting: true,
        sortDescFirst: true,
        enableColumnFilter: true,
        filterFn: "numberRange",
        meta: { filterType: "number-range" },
        cell: ({ row }) => row.original.customers.toLocaleString(),
      },
      {
        accessorKey: "total_amount",
        header: "Total Volume",
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
        accessorKey: "credit_amount",
        header: "Credit (CR)",
        enableSorting: true,
        sortDescFirst: true,
        cell: ({ row }) => (
          <span className="text-accent-green font-mono text-xs">
            {formatNPR(row.original.credit_amount)}
          </span>
        ),
      },
      {
        accessorKey: "debit_amount",
        header: "Debit (DR)",
        enableSorting: true,
        sortDescFirst: true,
        cell: ({ row }) => (
          <span className="text-accent-red font-mono text-xs">
            {formatNPR(row.original.debit_amount)}
          </span>
        ),
      },
      {
        id: "net_flow",
        header: "Net Flow",
        enableSorting: true,
        sortingFn: (a, b) =>
          a.original.credit_amount -
          a.original.debit_amount -
          (b.original.credit_amount - b.original.debit_amount),
        cell: ({ row }) => {
          const net = row.original.credit_amount - row.original.debit_amount;
          return (
            <span
              className={`font-mono text-xs ${net >= 0 ? "text-accent-green" : "text-accent-red"}`}
            >
              {formatNPR(net)}
            </span>
          );
        },
      },
      {
        id: "credit_ratio",
        header: "Credit Ratio",
        enableSorting: true,
        sortingFn: (a, b) =>
          (a.original.total_amount > 0
            ? a.original.credit_amount / a.original.total_amount
            : 0) -
          (b.original.total_amount > 0
            ? b.original.credit_amount / b.original.total_amount
            : 0),
        cell: ({ row }) => {
          const ratio =
            row.original.total_amount > 0
              ? (row.original.credit_amount / row.original.total_amount) * 100
              : 0;
          return <span>{ratio.toFixed(1)}%</span>;
        },
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
      {
        id: "txn_per_customer",
        header: "Txns / Customer",
        enableSorting: true,
        sortingFn: (a, b) =>
          (a.original.customers > 0
            ? a.original.transaction_count / a.original.customers
            : 0) -
          (b.original.customers > 0
            ? b.original.transaction_count / b.original.customers
            : 0),
        cell: ({ row }) =>
          row.original.customers > 0
            ? (row.original.transaction_count / row.original.customers).toFixed(
                1,
              )
            : "—",
      },
      {
        id: "vol_per_customer",
        header: "Vol / Customer",
        enableSorting: true,
        sortingFn: (a, b) =>
          (a.original.customers > 0
            ? a.original.total_amount / a.original.customers
            : 0) -
          (b.original.customers > 0
            ? b.original.total_amount / b.original.customers
            : 0),
        cell: ({ row }) => (
          <span className="font-mono text-xs">
            {row.original.customers > 0
              ? formatNPR(row.original.total_amount / row.original.customers)
              : "—"}
          </span>
        ),
      },
    ],
    [],
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (period === "CUSTOM") return;
    // Only sync when filterStats has loaded — don't overwrite with today's date
    if (!filterStats?.date_range?.max) return;
    const dr = getDateRange(period, referenceDate, minReferenceDate);
    setFilters((prev) =>
      prev.startDate === dr.startDate && prev.endDate === dr.endDate
        ? prev
        : { ...prev, ...dr },
    );
  }, [period, referenceDate, minReferenceDate]);

  const handlePeriodChange = (p: DashboardPeriod) => setPeriod(p);
  const handleCustomRangeChange = (r: {
    startDate: string;
    endDate: string;
  }) => {
    setPeriod("CUSTOM");
    setFilters((prev) => ({ ...prev, ...r }));
  };
  const handleClearFilters = () => {
    const dr = getDateRange(period, referenceDate, minReferenceDate);
    setFilters(
      period === "CUSTOM"
        ? (prev) => ({ startDate: prev.startDate, endDate: prev.endDate })
        : dr,
    );
  };

  // Build sparkline data from trend
  const trendAmounts = useMemo(
    () => (data?.trend || ([] as TrendData[])).map((t: TrendData) => t.amount),
    [data?.trend],
  );
  const trendCounts = useMemo(
    () => (data?.trend || ([] as TrendData[])).map((t: TrendData) => t.count),
    [data?.trend],
  );
  const padSpark = (arr: number[], n = 12) => {
    if (arr.length >= n) return arr.slice(-n);
    return [...Array(n - arr.length).fill(arr[0] || 0), ...arr];
  };

  const topBranch = data?.by_branch?.[0] as BranchMetrics | undefined;
  const topProvince = data?.by_province?.[0] as ProvinceMetrics | undefined;
  const topChannel = (data?.by_channel || ([] as ChannelMetrics[])).find(
    (c: ChannelMetrics) => c.channel,
  );

  if (!mounted) return null;

  return (
    <>
      <TopBar
        title="Executive Overview"
        subtitle={`Last refreshed ${new Date().toLocaleTimeString("en-NP")} NPT`}
        period={period}
        onPeriodChange={handlePeriodChange}
        customRange={{ startDate: filters.startDate, endDate: filters.endDate }}
        onCustomRangeChange={handleCustomRangeChange}
        minDate={filterStats?.date_range?.min ?? undefined}
        maxDate={filterStats?.date_range?.max ?? undefined}
        onToggleFilters={() => setFiltersOpen((current) => !current)}
        filtersOpen={filtersOpen}
      />

      <div className="flex flex-col gap-4 p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
        {/* ── Dynamic Filters (Province, Branch, Channel, Product, etc.) ── */}
        <AdvancedFilters
          filters={filters}
          onChange={setFilters}
          onClear={handleClearFilters}
          advancedOpen={filtersOpen}
          onAdvancedOpenChange={setFiltersOpen}
        />

        {/* ── Error ── */}
        {error && (
          <div className="bg-accent-red-dim border border-accent-red/20 text-accent-red px-4 py-3 rounded-xl text-[12px]">
            Error loading data. Ensure backend is running on port 3001.
          </div>
        )}

        {/* ── KPI Cards (6 — derived from CR/DR data) ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {/* 1. Total Volume (= Net Revenue equivalent) */}
          <SparkCard
            label="Total Volume"
            highlighted
            value={formatNPR(data?.summary?.total_amount || 0)}
            sub={`${(data?.summary?.total_count || 0).toLocaleString()} txns`}
            color="var(--accent-blue)"
            dimColor="var(--accent-blue-dim)"
            sparkData={padSpark(trendAmounts)}
            icon={
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                <path
                  d="M7 1v12M4 9l3 3 3-3M2 5h10"
                  stroke="var(--accent-blue)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            }
          />
          {/* 2. Credit Inflow */}
          <SparkCard
            label="Credit Inflow (CR)"
            value={formatNPR(data?.summary?.credit_amount || 0)}
            sub={`${(data?.summary?.credit_count || 0).toLocaleString()} CR txns`}
            color="var(--accent-green)"
            dimColor="var(--accent-green-dim)"
            sparkData={padSpark(
              trendAmounts.map(
                (v: number) => v * ((data?.summary?.credit_ratio || 50) / 100),
              ),
            )}
            icon={
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                <circle
                  cx="7"
                  cy="7"
                  r="5.5"
                  stroke="var(--accent-green)"
                  strokeWidth="1.4"
                />
                <path
                  d="M5 7.5l1.5 1.5L9.5 5.5"
                  stroke="var(--accent-green)"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            }
          />
          {/* 3. Debit Outflow */}
          <SparkCard
            label="Debit Outflow (DR)"
            value={formatNPR(data?.summary?.debit_amount || 0)}
            sub={`${(data?.summary?.debit_count || 0).toLocaleString()} DR txns`}
            color="var(--accent-purple)"
            dimColor="var(--accent-purple-dim)"
            sparkData={padSpark(
              trendAmounts.map(
                (v: number) =>
                  v * (1 - (data?.summary?.credit_ratio || 50) / 100),
              ),
            )}
            icon={
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                <rect
                  x="1.5"
                  y="4.5"
                  width="11"
                  height="7"
                  rx="1.5"
                  stroke="var(--accent-purple)"
                  strokeWidth="1.4"
                />
                <path
                  d="M4.5 4.5V3a2.5 2.5 0 015 0v1.5"
                  stroke="var(--accent-purple)"
                  strokeWidth="1.4"
                />
              </svg>
            }
          />
          {/* 4. Net Flow (CR - DR) */}
          <SparkCard
            label="Net Flow (CR−DR)"
            value={formatNPR(data?.summary?.net_flow || 0)}
            sub={`${(data?.summary?.credit_ratio || 0).toFixed(1)}% credit ratio`}
            color="var(--accent-teal)"
            dimColor="var(--accent-teal-dim)"
            sparkData={padSpark(
              trendAmounts.map((v: number) => {
                const cr = (data?.summary?.credit_ratio || 50) / 100;
                return v * cr - v * (1 - cr);
              }),
            )}
            icon={
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                <path
                  d="M2 10V5a1 1 0 011-1h8a1 1 0 011 1v5"
                  stroke="var(--accent-teal)"
                  strokeWidth="1.4"
                />
                <path
                  d="M1 10h12"
                  stroke="var(--accent-teal)"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
              </svg>
            }
          />
          {/* 5. Avg Transaction */}
          <SparkCard
            label="Avg Transaction"
            value={formatNPR(data?.summary?.avg_transaction_size || 0)}
            sub="Per transaction"
            color="var(--accent-amber)"
            dimColor="var(--accent-amber-dim)"
            sparkData={padSpark(
              trendAmounts.map(
                (v: number, idx: number) =>
                  v / Math.max(1, trendCounts[idx] || 1),
              ),
            )}
            icon={
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                <path
                  d="M2 10l3-3 2.5 2L11 4"
                  stroke="var(--accent-amber)"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            }
          />
          {/* 6. Unique Customers */}
          <SparkCard
            label="Unique Customers"
            value={(data?.summary?.unique_customers || 0).toLocaleString()}
            sub={`${(data?.summary?.unique_accounts || 0).toLocaleString()} accounts`}
            color="var(--accent-red)"
            dimColor="var(--accent-red-dim)"
            sparkData={padSpark(trendCounts)}
            icon={
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                <path
                  d="M7 2v5M7 10v.5"
                  stroke="var(--accent-red)"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <circle
                  cx="7"
                  cy="7"
                  r="5.5"
                  stroke="var(--accent-red)"
                  strokeWidth="1.4"
                />
              </svg>
            }
          />
        </div>

        {/* ── Revenue Trend + Channel Breakdown ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-4">
          <div className="bg-bg-card border border-border rounded-xl p-4 shadow-sm">
            <div className="flex justify-between items-start mb-2.5">
              <div>
                <div className="text-xs font-display font-semibold text-text-primary">
                  Daily Transaction Trend
                </div>
                <div className="text-[10px] text-text-muted mt-0.5">
                  Transaction amount over time (NPR)
                </div>
              </div>
              <div className="flex gap-1.5">
                {["Amount", "Count"].map((c, i) => (
                  <div key={c} className="flex items-center gap-1">
                    <div
                      className={`w-2 h-2 rounded-full ${i === 0 ? "bg-accent-blue" : "bg-accent-green"}`}
                    />
                    <span className="text-[10px] text-text-muted">{c}</span>
                  </div>
                ))}
              </div>
            </div>
            <PremiumLineChart
              data={(data?.trend || []) as unknown as Record<string, unknown>[]}
              xAxisKey="date"
              series={[
                { dataKey: "amount", name: "Amount", color: "#3b82f6" },
                { dataKey: "count", name: "Transactions", color: "#10b981" },
              ]}
              rightAxisKeys={["count"]}
              rightFormatValue={(v) => v.toLocaleString()}
              formatValue={formatNPR}
              formatXAxis={(v) => v?.slice(5) || v}
              height={200}
            />
          </div>

          <div className="bg-bg-card border border-border rounded-xl p-4 shadow-sm">
            <div className="flex justify-between items-start mb-2.5">
              <div>
                <div className="text-xs font-display font-semibold text-text-primary">
                  Transaction by Channel
                </div>
                <div className="text-[10px] text-text-muted mt-0.5">
                  Breakdown by tran source
                </div>
              </div>
            </div>
            <PremiumBarChart
              data={
                ((data?.by_channel || []) as ChannelMetrics[])
                  .filter((c) => c.channel)
                  .slice(0, 8) as unknown as Record<string, unknown>[]
              }
              xAxisKey="channel"
              series={[
                { dataKey: "total_amount", name: "Amount", color: "#8b5cf6" },
              ]}
              formatValue={formatNPR}
              formatXAxis={formatChannelLabel}
              height={200}
            />
          </div>
        </div>

        {/* ── 4 Derived Stat Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              title: "Credit Ratio",
              sub: "CR / Total volume",
              value: `${(data?.summary?.credit_ratio || 0).toFixed(1)}%`,
              detail: `CR: ${formatNPR(data?.summary?.credit_amount || 0)}`,
              color: "var(--accent-blue)",
              bar: data?.summary?.credit_ratio || 0,
            },
            {
              title: "Net Flow (CR−DR)",
              sub: "Inflow minus outflow",
              value: formatNPR(Math.abs(data?.summary?.net_flow || 0)),
              detail:
                (data?.summary?.net_flow || 0) >= 0
                  ? "▲ Net positive"
                  : "▼ Net negative",
              color:
                (data?.summary?.net_flow || 0) >= 0
                  ? "var(--accent-green)"
                  : "var(--accent-red)",
              bar: Math.min(
                100,
                (Math.abs(data?.summary?.net_flow || 0) /
                  Math.max(1, data?.summary?.total_amount || 1)) *
                  200,
              ),
            },
            {
              title: "Top Province",
              sub: "Highest volume",
              value: topProvince?.province || "—",
              detail: topProvince
                ? `${formatNPR(topProvince.total_amount)} · ${topProvince.branch_count} branches`
                : "—",
              color: "var(--accent-teal)",
              bar: 100,
            },
            {
              title: "Top Branch",
              sub: "Highest volume",
              value: topBranch?.branch_code || "—",
              detail: topBranch
                ? `${formatNPR(topBranch.total_amount)} · ${topBranch.province}`
                : "—",
              color: "var(--accent-amber)",
              bar: 100,
            },
          ].map((card) => (
            <div
              key={card.title}
              className="bg-bg-card border border-border rounded-xl p-4 shadow-sm"
            >
              <div className="text-[10px] text-text-muted font-semibold uppercase tracking-[0.4px]">
                {card.title}
              </div>
              <div className="text-[10px] text-text-muted mt-0.5">
                {card.sub}
              </div>
              <div
                className="text-xl font-bold my-2 capitalize leading-tight"
                style={{ color: card.color }}
              >
                {card.value}
              </div>
              <div className="h-1 rounded-sm bg-bg-input my-1.5">
                <div
                  className="h-full rounded-sm transition-[width] duration-700 hover:opacity-90"
                  style={{ width: `${card.bar}%`, background: card.color }}
                />
              </div>
              <div className="text-[10px] text-text-muted capitalize">
                {card.detail}
              </div>
            </div>
          ))}
        </div>

        {/* ── Province Performance — Apache ECharts ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-4">
          {/* Horizontal bar + line composed */}
          <div className="bg-bg-card border border-border rounded-xl p-4 shadow-sm">
            <div className="text-xs font-display font-semibold text-text-primary mb-0.5">
              Province Performance
            </div>
            <div className="text-[10px] text-text-muted mb-3">
              Transaction volume &amp; count by province
            </div>
            <ProvinceBarChart data={data?.by_province || []} />
          </div>

          {/* Donut */}
          <div className="bg-bg-card border border-border rounded-xl p-4 shadow-sm">
            <div className="text-xs font-display font-semibold text-text-primary mb-0.5">
              Province Volume Share
            </div>
            <div className="text-[10px] text-text-muted mb-3">
              Share of total transaction volume
            </div>
            <ProvinceDonutChart data={data?.by_province || []} />
          </div>
        </div>

        {/* ── Branch League Table ── */}
        <AdvancedDataTable
          title="Branch Performance League"
          subtitle="All branches ranked by transaction volume — use Columns to show/hide fields"
          data={(data?.by_branch || []) as BranchMetrics[]}
          columns={branchColumns}
          pageSize={10}
          initialHidden={{ txn_per_account: true, vol_per_account: true }}
        />

        {/* ── Customer Age Group Demographics ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Age Group Bar Chart */}
          <div className="bg-bg-card border border-border rounded-xl p-4 shadow-sm">
            <div className="text-xs font-display font-semibold text-text-primary mb-0.5">
              Customer Age Distribution
            </div>
            <div className="text-[10px] text-text-muted mb-3">
              Transaction volume by age group · via customers.date_of_birth
            </div>
            <PremiumBarChart
              data={
                (demographics?.age_groups || []) as unknown as Record<
                  string,
                  unknown
                >[]
              }
              xAxisKey="age_group"
              series={[
                {
                  dataKey: "total_amount",
                  name: "Total Amount",
                  color: "#3b82f6",
                },
                {
                  dataKey: "credit_amount",
                  name: "Credit (CR)",
                  color: "#10b981",
                },
                {
                  dataKey: "debit_amount",
                  name: "Debit (DR)",
                  color: "#8b5cf6",
                },
              ]}
              formatValue={formatNPR}
              height={220}
            />
          </div>

          {/* Age Group Table */}
          <AdvancedDataTable
            title="Age Group Breakdown"
            subtitle={`${demographics?.total_customers?.toLocaleString() || "—"} customers · use Columns to show/hide fields`}
            data={(demographics?.age_groups || []) as AgeGroup[]}
            columns={ageColumns}
            pageSize={10}
            enablePagination={false}
            initialHidden={{
              net_flow: true,
              credit_ratio: true,
              txn_per_customer: true,
              vol_per_customer: true,
            }}
          />
        </div>

        {/* ── Bottom Row: Risk Monitor + Alerts + Supplementary KPIs ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Risk Exposure Monitor — placeholder until risk API is connected */}
          <div className="bg-bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col">
            <div className="flex justify-between items-center mb-3.5">
              <div>
                <div className="text-xs font-display font-semibold text-text-primary">
                  Risk Exposure Monitor
                </div>
                <div className="text-[10px] text-text-muted mt-0.5">
                  Normalized 0–100 risk score
                </div>
              </div>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-bg-input text-text-muted border border-border font-medium">
                Not connected
              </span>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center gap-1.5 py-6 text-center">
              <span className="text-[11px] text-text-muted">
                No risk score data source connected.
              </span>
              <span className="text-[10px] text-text-muted opacity-60">
                Connect a risk API endpoint to populate this panel.
              </span>
            </div>
          </div>

          {/* Regulatory & Alerts Feed — placeholder until alerts API is connected */}
          <div className="bg-bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col">
            <div className="flex justify-between items-center mb-3.5">
              <div>
                <div className="text-xs font-display font-semibold text-text-primary">
                  Regulatory & Alerts Feed
                </div>
                <div className="text-[10px] text-text-muted mt-0.5">
                  Live monitoring events
                </div>
              </div>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-bg-input text-text-muted border border-border font-medium">
                Not connected
              </span>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center gap-1.5 py-6 text-center">
              <span className="text-[11px] text-text-muted">
                No alerts source connected.
              </span>
              <span className="text-[10px] text-text-muted opacity-60">
                Connect an alerts/events API to populate this feed.
              </span>
            </div>
          </div>

          {/* Supplementary KPIs */}
          <div className="bg-bg-card border border-border rounded-xl p-4 shadow-sm">
            <div className="text-xs font-display font-semibold text-text-primary mb-1">
              Supplementary KPIs
            </div>
            <div className="text-[10px] text-text-muted mb-3.5">
              Transaction decomposition
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                {
                  label: "Credit (CR)",
                  value: formatNPR(data?.summary?.credit_amount || 0),
                  color: "text-accent-blue",
                  sub: `${(data?.summary?.credit_count || 0).toLocaleString()} txns`,
                },
                {
                  label: "Debit (DR)",
                  value: formatNPR(data?.summary?.debit_amount || 0),
                  color: "text-accent-red",
                  sub: `${(data?.summary?.debit_count || 0).toLocaleString()} txns`,
                },
                {
                  label: "Net Flow",
                  value: formatNPR(Math.abs(data?.summary?.net_flow || 0)),
                  color:
                    (data?.summary?.net_flow || 0) >= 0
                      ? "text-accent-green"
                      : "text-accent-red",
                  sub:
                    (data?.summary?.net_flow || 0) >= 0
                      ? "Positive"
                      : "Negative",
                },
                {
                  label: "Credit Ratio",
                  value: `${(data?.summary?.credit_ratio || 0).toFixed(1)}%`,
                  color: "text-accent-teal",
                  sub: "CR / Total",
                },
                {
                  label: "Unique Accounts",
                  value: (data?.summary?.unique_accounts || 0).toLocaleString(),
                  color: "text-accent-purple",
                  sub: "Active accts",
                },
                {
                  label: "Unique Customers",
                  value: (
                    data?.summary?.unique_customers || 0
                  ).toLocaleString(),
                  color: "text-accent-amber",
                  sub: "Total CIF",
                },
                {
                  label: "Avg Transaction",
                  value: formatNPR(data?.summary?.avg_transaction_size || 0),
                  color: "text-text-primary",
                  sub: "Per txn",
                },
                {
                  label: "Top Channel",
                  value: topChannel?.channel || "Branch",
                  color: "text-accent-teal",
                  sub: "By volume",
                },
              ].map((item) => (
                <div key={item.label} className="py-1.5 border-b border-border">
                  <div className="text-[9px] text-text-muted mb-0.5">
                    {item.label}
                  </div>
                  <div
                    className={`text-[11px] font-semibold capitalize ${item.color}`}
                  >
                    {item.value}
                  </div>
                  <div className="text-[9px] text-text-muted">{item.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
