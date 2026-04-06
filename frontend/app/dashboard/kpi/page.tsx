'use client';

import { useState } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { ChartCard } from '@/components/ui/ChartCard';
import { formatNPR } from '@/lib/formatters';

export default function KPIDashboard() {
  const [expandedNode, setExpandedNode] = useState<string | null>('revenue');
  
  const kpiTree = {
    id: 'revenue',
    label: 'Total Revenue',
    value: 12450000000,
    children: [
      {
        id: 'interest',
        label: 'Interest Income',
        value: 8900000000,
        children: [
          { id: 'loans', label: 'Loan Interest', value: 6700000000 },
          { id: 'investments', label: 'Investment Returns', value: 2200000000 },
        ],
      },
      {
        id: 'fees',
        label: 'Fee Income',
        value: 2100000000,
        children: [
          { id: 'service', label: 'Service Charges', value: 1200000000 },
          { id: 'forex', label: 'Foreign Exchange', value: 900000000 },
        ],
      },
      { id: 'other', label: 'Other Income', value: 1450000000 },
    ],
  };
  
  const renderNode = (node: any, level = 0) => {
    const isExpanded = expandedNode === node.id;
    const hasChildren = node.children && node.children.length > 0;
    
    return (
      <div key={node.id} style={{ marginLeft: level * 30 }}>
        <div
          onClick={() => hasChildren && setExpandedNode(isExpanded ? null : node.id)}
          className={`
            p-3 mb-2 rounded-lg border cursor-pointer transition-all
            ${isExpanded ? 'bg-accent-blue-dim border-[rgba(59,130,246,0.3)]' : 'bg-bg-card border-border hover:border-border-strong'}
          `}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {hasChildren && (
                <span className="text-text-muted text-xs">{isExpanded ? '▼' : '▶'}</span>
              )}
              <span className="font-medium text-sm">{node.label}</span>
            </div>
            <span className="text-sm font-semibold text-accent-blue">{formatNPR(node.value)}</span>
          </div>
        </div>
        
        {isExpanded && hasChildren && (
          <div className="ml-4">
            {node.children.map((child: any) => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };
  
  return (
    <>
      <TopBar title="KPI Tree Analysis" subtitle="Hierarchical performance breakdown" />
      
      <div className="flex flex-col gap-4 p-6">
        <ChartCard title="Revenue Breakdown" subtitle="Click to expand/collapse nodes">
          <div className="py-2">
            {renderNode(kpiTree)}
          </div>
        </ChartCard>
      </div>
    </>
  );
}
