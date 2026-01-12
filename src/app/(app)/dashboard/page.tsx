'use client';

import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, limit, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';
import { Skeleton } from '@/components/ui/skeleton';

// Initialize Firebase
let firebaseApp;
if (!getApps().length) {
  firebaseApp = initializeApp(firebaseConfig);
} else {
  firebaseApp = getApp();
}
const db = getFirestore(firebaseApp);


interface RecentActivity {
    id: string;
    sessionId: string;
    timestamp: Timestamp;
    verifiedMetrics: {
        totalCosts: number;
    }
}

interface UploadStats {
  totalUploads: number;
  successfulUploads: number;
  failedUploads: number;
}

interface DashboardMetrics {
  totalReports: number;
  totalCosts: number;
  totalRevenue: number;
  recentActivity: RecentActivity[];
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalReports: 0,
    totalCosts: 0,
    totalRevenue: 0,
    recentActivity: []
  });
  const [uploadStats, setUploadStats] = useState<UploadStats>({
    totalUploads: 0,
    successfulUploads: 0,
    failedUploads: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listener for budget_results
    const reportsQuery = query(
      collection(db, 'budget_results'),
      orderBy('timestamp', 'desc')
    );

    const unsubscribeReports = onSnapshot(reportsQuery, (querySnapshot) => {
      const reports: RecentActivity[] = [];
      let totalCosts = 0;
      let totalRevenue = 0;

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        reports.push({ id: doc.id, ...data } as RecentActivity);
        totalCosts += data.verifiedMetrics?.totalCosts || 0;
        totalRevenue += (data.verifiedMetrics?.retailRevenue || 0) + 
                       (data.verifiedMetrics?.wholesaleRevenue || 0);
      });

      setMetrics({
        totalReports: querySnapshot.size,
        totalCosts,
        totalRevenue,
        recentActivity: reports.slice(0, 5) // Limit to 5 recent activities
      });
      setLoading(false);
    });

    // Listener for upload_sessions
    const sessionsQuery = query(collection(db, 'upload_sessions'));
    const unsubscribeSessions = onSnapshot(sessionsQuery, (querySnapshot) => {
        let successful = 0;
        let failed = 0;
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.status === 'completed') successful++;
            if (data.status === 'error') failed++;
        });

        setUploadStats({
            totalUploads: querySnapshot.size,
            successfulUploads: successful,
            failedUploads: failed,
        });
    });


    return () => {
      unsubscribeReports();
      unsubscribeSessions();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col gap-8">
        <Skeleton className="h-10 w-1/4" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="font-headline text-3xl md:text-4xl">Dashboard</h1>
            <p className="text-muted-foreground">A high-level overview of your financial landscape.</p>
        </div>
        <Button asChild>
          <Link href="/upload">Upload New Data</Link>
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{metrics.totalReports}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Aggregate Costs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">${metrics.totalCosts.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Aggregate Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">${metrics.totalRevenue.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Upload Success Rate</CardTitle>
            </CardHeader>
            <CardContent>
                 <p className="text-2xl font-bold">
                    {uploadStats.totalUploads > 0
                        ? `${Math.round((uploadStats.successfulUploads / uploadStats.totalUploads) * 100)}%`
                        : '100%'}
                </p>
                <p className="text-xs text-muted-foreground">
                    {uploadStats.successfulUploads} successful / {uploadStats.failedUploads} failed
                </p>
            </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Recent Reports</CardTitle>
        </CardHeader>
        <CardContent>
          {metrics.recentActivity.length > 0 ? (
            <div className="space-y-4">
              {metrics.recentActivity.map((activity) => (
                <div key={activity.id} className="flex justify-between items-center p-4 border rounded-lg hover:bg-muted/50">
                  <div>
                    <h3 className="font-semibold">Report {activity.sessionId?.slice(0, 8)}...</h3>
                    <p className="text-sm text-muted-foreground">
                      {activity.timestamp?.toDate().toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">${activity.verifiedMetrics?.totalCosts.toLocaleString()}</p>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/reports`}>View Details</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No reports yet</p>
              <Button asChild>
                <Link href="/upload">Upload Your First Report</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
