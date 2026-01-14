"use client";

import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot, Timestamp } from 'firebase/firestore';
import { StatCard } from "@/components/dashboard/stat-card";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { CostByHolderChart } from "@/components/dashboard/cost-by-holder-chart";
import { ReportsTable } from "@/components/dashboard/reports-table";
import { AnomaliesList } from "@/components/dashboard/anomalies-list";
import { Sparkles, Loader2 } from "lucide-react";
import { db } from '@/firebase/client';
import { Skeleton } from '../ui/skeleton';


export function DashboardClient() {
  const [reports, setReports] = useState<any[]>([]);
  const [latestReport, setLatestReport] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const reportsQuery = query(
        collection(db, 'budget_results'),
        orderBy('timestamp', 'desc'),
        limit(10)
    );

    const unsubscribe = onSnapshot(reportsQuery, (snapshot) => {
        const reportsData = snapshot.docs.map(doc => ({
            id: doc.data().sessionId || doc.id,
            name: `Report ${doc.data().sessionId?.slice(0, 8) || 'N/A'}`,
            date: new Date(doc.data().timestamp.seconds * 1000).toLocaleDateString(),
            status: 'Completed',
        }));
        
        setReports(reportsData);

        if (snapshot.docs.length > 0) {
            const latest = snapshot.docs[0].data();
            setLatestReport({
                ...latest,
                id: snapshot.docs[0].id // Add the document ID to the report object
            });
        } else {
            setLatestReport(null);
        }
        
        setLoading(false);
    }, (error) => {
        console.error("Error fetching dashboard data:", error);
        setLoading(false);
    });

    return () => unsubscribe();
  }, []);


  if (loading) {
     return (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {Array.from({length: 4}).map((_, i) => (
            <div key={i} className="lg:col-span-3"><Skeleton className="h-28 w-full" /></div>
        ))}
        <div className="lg:col-span-7"><Skeleton className="h-96 w-full" /></div>
        <div className="lg:col-span-5"><Skeleton className="h-96 w-full" /></div>
        <div className="lg:col-span-5"><Skeleton className="h-96 w-full" /></div>
        <div className="lg:col-span-7"><Skeleton className="h-96 w-full" /></div>
      </div>
    );
  }

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
    { name: 'Total Revenue', value: `$${((verifiedMetrics.retailRevenue || 0) + (verifiedMetrics.wholesaleRevenue || 0)).toLocaleString()}`, change: '', changeType: 'neutral' as const },
    { name: 'Total Costs', value: `$${(verifiedMetrics.totalCosts || 0).toLocaleString()}`, change: '', changeType: 'neutral' as const },
    { name: 'Net Income', value: `$${(((verifiedMetrics.retailRevenue || 0) + (verifiedMetrics.wholesaleRevenue || 0)) - (verifiedMetrics.totalCosts || 0)).toLocaleString()}`, change: '', changeType: 'neutral' as const },
    { name: 'Anomalies Found', value: (aiAnalysis.anomalies || []).length, change: '', changeType: 'neutral' as const },
  ];
  
  const anomalies = (aiAnalysis.anomalies || []).map((desc: string, i: number) => ({
      id: `ANOM-${i}`,
      metric: 'AI Detected',
      description: desc,
      severity: 'high' as 'high' | 'medium' | 'low', // Default severity
      date: new Date(latestReport.timestamp.seconds * 1000).toLocaleDateString()
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
        <AnomaliesList anomalies={anomalies} sessionId={latestReport.sessionId} />
      </div>

      {/* Reports Table */}
      <div className="lg:col-span-7">
        <ReportsTable reports={reports} />
      </div>
    </div>
  );
}
