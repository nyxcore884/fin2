"use client";

import { StatCard } from "@/components/dashboard/stat-card";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { CostByHolderChart } from "@/components/dashboard/cost-by-holder-chart";
import { ReportsTable } from "@/components/dashboard/reports-table";
import { AnomaliesList } from "@/components/dashboard/anomalies-list";
import { Sparkles } from "lucide-react";

// This component now receives the live data as props
export function DashboardClient({ reports, latestReport }: { reports: any[], latestReport: any }) {

  if (!latestReport) {
    return (
        <div className="flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed py-24 text-center">
            <Sparkles className="h-12 w-12 text-muted-foreground" />
            <h2 className="text-2xl font-semibold">No Data Available</h2>
            <p className="text-muted-foreground">Upload your financial files to see your dashboard.</p>
        </div>
    )
  }

  const verifiedMetrics = latestReport.verifiedMetrics || {};
  const aiAnalysis = latestReport.aiAnalysis || {};

  const stats = [
    { name: 'Total Revenue', value: `$${(verifiedMetrics.retailRevenue + verifiedMetrics.wholesaleRevenue).toLocaleString()}`, change: '', changeType: 'neutral' },
    { name: 'Total Costs', value: `$${(verifiedMetrics.totalCosts || 0).toLocaleString()}`, change: '', changeType: 'neutral' },
    { name: 'Net Income', value: `$${((verifiedMetrics.retailRevenue + verifiedMetrics.wholesaleRevenue) - verifiedMetrics.totalCosts).toLocaleString()}`, change: '', changeType: 'neutral' },
    { name: 'Anomalies Found', value: (aiAnalysis.anomalies || []).length, change: '', changeType: 'neutral' },
  ];
  
  const anomalies = (aiAnalysis.anomalies || []).map((desc: string, i: number) => ({
      id: `ANOM-${i}`,
      metric: 'AI Detected',
      description: desc,
      severity: 'high' as 'high' | 'medium' | 'low', // Default severity
      date: new Date(latestReport.timestamp._seconds * 1000).toLocaleDateString()
  }));

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* Stat Cards */}
      {stats.map((stat) => (
        <div key={stat.name} className="lg:col-span-3">
          <StatCard {...stat} />
        </div>
      ))}

      {/* Charts */}
      <div className="lg:col-span-7">
        <CostByHolderChart data={verifiedMetrics.holderDistribution || []} />
      </div>
      <div className="lg:col-span-5">
        <RevenueChart data={verifiedMetrics} />
      </div>

      {/* Anomalies List */}
      <div className="lg:col-span-5">
        <AnomaliesList anomalies={anomalies} />
      </div>

      {/* Reports Table */}
      <div className="lg:col-span-7">
        <ReportsTable reports={reports} />
      </div>
    </div>
  );
}
