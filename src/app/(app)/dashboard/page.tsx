'use server';

import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, App } from 'firebase-admin/app';
import { DashboardClient } from '@/components/dashboard/dashboard-client';

// Initialize Firebase Admin SDK
let adminApp: App;
if (!getApps().length) {
  adminApp = initializeApp();
} else {
  adminApp = getApps()[0]!;
}
const db = getFirestore(adminApp);


async function getDashboardData() {
  // Fetch the last 10 reports for the table
  const reportsQuery = query(
    collection(db, 'budget_results'),
    orderBy('timestamp', 'desc'),
    limit(10)
  );

  const reportsSnapshot = await getDocs(reportsQuery);
  const reports = reportsSnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      name: `Report ${data.sessionId?.slice(0, 8) || 'N/A'}`,
      date: new Date(data.timestamp._seconds * 1000).toLocaleDateString(),
      status: 'Completed', // Assuming all results are completed
    };
  });
  
  const latestReport = reportsSnapshot.docs.length > 0 ? reportsSnapshot.docs[0].data() : null;

  return { reports, latestReport };
}

export default async function DashboardPage() {
  const { reports, latestReport } = await getDashboardData();
  
  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-headline text-3xl md:text-4xl">Dashboard</h1>
          <p className="text-muted-foreground">
            A high-level overview of your latest financial report.
          </p>
        </div>
      </div>
      
      <DashboardClient reports={reports} latestReport={latestReport} />

    </div>
  );
}
