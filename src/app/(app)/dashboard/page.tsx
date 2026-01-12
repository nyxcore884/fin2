import { DashboardClient } from "@/components/dashboard/dashboard-client";
import * as admin from "firebase-admin";

// Initialize Firebase Admin if not already initialized
if (admin.apps.length === 0) {
  try {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
  } catch (error) {
    console.error("Firebase admin initialization error", error);
  }
}

async function getDashboardData() {
  const db = admin.firestore();
  try {
    // Since we don't have users, we fetch the latest reports for any user.
    // In a real multi-user app, you would add .where('userId', '==', currentUserId)
    const reportsSnapshot = await db
      .collection("budget_results")
      .orderBy("timestamp", "desc")
      .limit(10)
      .get();

    const reports = reportsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: `Report for Session ${data.sessionId.substring(0, 8)}`,
        date: new Date(data.timestamp._seconds * 1000).toLocaleDateString(),
        status: "Completed",
        ...data,
      };
    });

    const latestReport = reports[0] || null;

    return { reports, latestReport };
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    // Return empty state in case of error
    return { reports: [], latestReport: null };
  }
}

export default async function DashboardPage() {
  const { reports, latestReport } = await getDashboardData();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-headline text-3xl md:text-4xl">Dashboard</h1>
        <p className="text-muted-foreground">
          {latestReport
            ? `Showing data for the latest report from ${latestReport.date}`
            : "Welcome! No reports found. Upload data to get started."}
        </p>
      </div>
      <DashboardClient reports={reports} latestReport={latestReport} />
    </div>
  );
}
