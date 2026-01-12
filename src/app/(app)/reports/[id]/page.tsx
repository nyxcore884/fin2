'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { ref, getDownloadURL } from 'firebase/storage';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Download, File as FileIcon, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
// Import db and storage from the centralized client-side Firebase initialization file
import { db, storage } from '@/firebase/client';

type FileDetail = {
  name: string;
  path: string;
  uploadedAt: { seconds: number; nanoseconds: number };
};

type UploadSession = {
  sessionId: string;
  status: string;
  createdAt: any;
  files: Record<string, FileDetail>;
  resultId: string;
};

export default function ReportDetailPage({ params: { id } }: { params: { id: string } }) {
  const [session, setSession] = useState<UploadSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchReport() {
      if (!id) return;
      try {
        const sessionRef = doc(db, 'upload_sessions', id);
        const sessionSnap = await getDoc(sessionRef);

        if (!sessionSnap.exists()) {
          setError('Report not found.');
          return notFound();
        }
        setSession(sessionSnap.data() as UploadSession);
      } catch (err) {
        console.error('Error fetching report:', err);
        setError('Failed to load report details.');
      } finally {
        setLoading(false);
      }
    }

    fetchReport();
  }, [id]);

  const handleDownload = async (filePath: string, fileName: string) => {
    try {
      const fileRef = ref(storage, filePath);
      const url = await getDownloadURL(fileRef);

      // Create a temporary link to trigger the download
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank'; // Open in new tab to avoid navigation issues
      link.rel = 'noopener noreferrer';
      link.download = fileName; // Set a default file name
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Could not download file. See console for details.');
    }
  };

  const getFormattedDate = (timestamp: any) => {
    if (timestamp && typeof timestamp.seconds === 'number') {
      return new Date(timestamp.seconds * 1000).toLocaleString();
    }
    return 'Pending...';
  };


  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return <div className="text-destructive text-center py-10">{error}</div>;
  }

  if (!session) {
    return null;
  }

  const fileEntries = Object.entries(session.files || {});

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Button variant="ghost" asChild className="mb-4">
            <Link href="/dashboard"><ArrowLeft className="mr-2 h-4 w-4"/> Back to Dashboard</Link>
        </Button>
        <h1 className="font-headline text-3xl md:text-4xl">Report Details</h1>
        <p className="text-muted-foreground">
          Detailed information for session ID: {session.sessionId.substring(0, 8)}...
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
            <CardHeader>
                <CardTitle>Session Info</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Session ID:</span>
                    <span className="font-mono">{session.sessionId}</span>
                </div>
                 <div className="flex justify-between">
                    <span className="text-muted-foreground">Result ID:</span>
                    <span className="font-mono">{session.resultId || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Created At:</span>
                    <span>{getFormattedDate(session.createdAt)}</span>
                </div>
                 <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge variant={session.status === 'completed' ? 'secondary' : 'default'} className="border-green-400/50 text-green-400">
                        {session.status}
                    </Badge>
                </div>
            </CardContent>
        </Card>

        <Card className="lg:col-span-2">
            <CardHeader>
                <CardTitle>Uploaded Files</CardTitle>
                <CardDescription>
                    These are the files that were processed for this report. You can download them for verification.
                </CardDescription>
            </CardHeader>
            <CardContent>
                 <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead>File Type</TableHead>
                        <TableHead>File Name</TableHead>
                        <TableHead>Uploaded At</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {fileEntries.length > 0 ? fileEntries.map(([type, file]) => (
                        <TableRow key={type}>
                            <TableCell className="font-medium flex items-center gap-2"><FileIcon className="h-4 w-4 text-muted-foreground"/> {type}</TableCell>
                            <TableCell>{file.name}</TableCell>
                            <TableCell>{getFormattedDate(file.uploadedAt)}</TableCell>
                            <TableCell className="text-right">
                                <Button variant="outline" size="sm" onClick={() => handleDownload(file.path, file.name)}>
                                    <Download className="mr-2 h-4 w-4"/>
                                    Download
                                </Button>
                            </TableCell>
                        </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center text-muted-foreground">No files associated with this session.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
