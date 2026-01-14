'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/client';

// Initialize Firebase
let firebaseApp;
if (!getApps().length) {
  firebaseApp = initializeApp(firebaseConfig);
} else {
  firebaseApp = getApp();
}
const db = getFirestore(firebaseApp);


interface FinancialReport {
  id: string;
  sessionId: string;
  timestamp: Timestamp;
  verifiedMetrics: {
    totalCosts: number;
    retailRevenue: number;
    wholesaleRevenue: number;
    costsByHolder: { [key: string]: number };
    costsByRegion: { [key: string]: number };
  };
  aiAnalysis: {
    anomalies: string[];
    insights: string[];
  };
}

export default function ReportsPage() {
  const [reports, setReports] = useState<FinancialReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<FinancialReport | null>(null);
  const [timeRange, setTimeRange] = useState<'7days' | '30days' | '90days' | 'all'>('30days');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const now = new Date();
    let startDate = new Date();
    
    switch (timeRange) {
      case '7days':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30days':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90days':
        startDate.setDate(now.getDate() - 90);
        break;
      case 'all':
      default:
        startDate = new Date(0); // Unix epoch for all time
        break;
    }

    const q = query(
      collection(db, 'budget_results'),
      where('timestamp', '>=', startDate),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const reportsData: FinancialReport[] = [];
      querySnapshot.forEach((doc) => {
        reportsData.push({ id: doc.id, ...doc.data() } as FinancialReport);
      });
      setReports(reportsData);
      
      if (reportsData.length > 0 && !selectedReport) {
        setSelectedReport(reportsData[0]);
      } else if (reportsData.length === 0) {
        setSelectedReport(null);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error fetching reports:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [timeRange, selectedReport]);

  const aggregateMetrics = reports.reduce((acc, report) => {
    const metrics = report.verifiedMetrics || {};
    acc.totalCosts += metrics.totalCosts || 0;
    acc.retailRevenue += metrics.retailRevenue || 0;
    acc.wholesaleRevenue += metrics.wholesaleRevenue || 0;
    acc.reportCount += 1;
    return acc;
  }, { totalCosts: 0, retailRevenue: 0, wholesaleRevenue: 0, reportCount: 0 });


  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
            <h1 className="font-headline text-3xl md:text-4xl">Financial Reports</h1>
            <p className="text-muted-foreground">Drill-down into historical report data and AI analysis.</p>
        </div>
        <Select value={timeRange} onValueChange={(value) => setTimeRange(value as any)}>
            <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select a time range" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="7days">Last 7 Days</SelectItem>
                <SelectItem value="30days">Last 30 Days</SelectItem>
                <SelectItem value="90days">Last 90 Days</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
            <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Reports</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-8 w-16"/> : <div className="text-2xl font-bold">{aggregateMetrics.reportCount}</div>}
            </CardContent>
        </Card>
         <Card>
            <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Costs</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-8 w-32"/> : <div className="text-2xl font-bold">{aggregateMetrics.totalCosts.toLocaleString()}</div>}
            </CardContent>
        </Card>
         <Card>
            <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Retail Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-8 w-32"/> : <div className="text-2xl font-bold">{aggregateMetrics.retailRevenue.toLocaleString()}</div>}
            </CardContent>
        </Card>
         <Card>
            <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Wholesale Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-8 w-32"/> : <div className="text-2xl font-bold">{aggregateMetrics.wholesaleRevenue.toLocaleString()}</div>}
            </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Report List */}
        <Card className="lg:col-span-1">
            <CardHeader>
                <CardTitle className="font-headline text-xl">Report History</CardTitle>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[500px]">
                    <div className="space-y-2">
                    {loading ? Array.from({length: 5}).map((_, i) => <Skeleton key={i} className="h-20 w-full" />) 
                    : reports.map((report) => (
                        <div
                            key={report.id}
                            className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            selectedReport?.id === report.id
                                ? 'border-primary bg-primary/10'
                                : 'border-border hover:bg-muted/50'
                            }`}
                            onClick={() => setSelectedReport(report)}
                        >
                            <h3 className="font-semibold truncate">Session {report.sessionId?.slice(0, 8)}...</h3>
                            <p className="text-sm text-muted-foreground">
                            {report.timestamp?.toDate().toLocaleDateString()}
                            </p>
                            <p className="text-sm font-medium">Costs: ${report.verifiedMetrics?.totalCosts.toLocaleString()}</p>
                        </div>
                        ))}
                    {reports.length === 0 && !loading && <p className="text-muted-foreground text-center py-10">No reports found for this period.</p>}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>

        {/* Report Details */}
        <Card className="lg:col-span-2">
            <CardHeader>
                <CardTitle className="font-headline text-xl">Report Details</CardTitle>
            </CardHeader>
            <CardContent>
             {loading ? <div className="space-y-6"> <Skeleton className="h-8 w-1/2"/> <Skeleton className="h-24 w-full"/> <Skeleton className="h-24 w-full"/> </div>
             : selectedReport ? (
                <ScrollArea className="h-[500px]">
                <div className="space-y-6 pr-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                        <h3 className="text-sm font-medium text-muted-foreground">Total Costs</h3>
                        <div className="text-2xl font-bold">${selectedReport.verifiedMetrics.totalCosts.toLocaleString()}</div>
                        </div>
                        <div>
                        <h3 className="text-sm font-medium text-muted-foreground">Total Revenue</h3>
                        <div className="text-2xl font-bold">
                            ${(selectedReport.verifiedMetrics.retailRevenue + selectedReport.verifiedMetrics.wholesaleRevenue).toLocaleString()}
                        </div>
                        </div>
                    </div>
                    <Separator/>
                    <div>
                        <h3 className="text-lg font-semibold mb-2">Costs by Department</h3>
                        <div className="space-y-2 text-sm">
                        {Object.entries(selectedReport.verifiedMetrics.costsByHolder).map(([holder, amount]) => (
                            <div key={holder} className="flex justify-between">
                            <span className="text-muted-foreground">{holder}</span>
                            <span className="font-medium">${Number(amount).toLocaleString()}</span>
                            </div>
                        ))}
                        </div>
                    </div>
                    <Separator/>
                     <div>
                        <h3 className="text-lg font-semibold mb-2">Costs by Region</h3>
                        <div className="space-y-2 text-sm">
                        {Object.entries(selectedReport.verifiedMetrics.costsByRegion).map(([region, amount]) => (
                            <div key={region} className="flex justify-between">
                            <span className="text-muted-foreground">{region}</span>
                            <span className="font-medium">${Number(amount).toLocaleString()}</span>
                            </div>
                        ))}
                        </div>
                    </div>
                    <Separator/>
                    {selectedReport.aiAnalysis?.anomalies?.length > 0 && (
                        <div>
                        <h3 className="text-lg font-semibold mb-2">Anomalies Detected</h3>
                        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                            {selectedReport.aiAnalysis.anomalies.map((anomaly, index) => (
                            <li key={index}>{anomaly}</li>
                            ))}
                        </ul>
                        </div>
                    )}

                    {selectedReport.aiAnalysis?.insights?.length > 0 && (
                        <div>
                        <h3 className="text-lg font-semibold mb-2">AI Insights</h3>
                        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                            {selectedReport.aiAnalysis.insights.map((insight, index) => (
                            <li key={index}>{insight}</li>
                            ))}
                        </ul>
                        </div>
                    )}
                </div>
                </ScrollArea>
          ) : (
            <div className="flex h-[500px] items-center justify-center">
                <p className="text-muted-foreground">Select a report to view details</p>
            </div>
          )}
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
