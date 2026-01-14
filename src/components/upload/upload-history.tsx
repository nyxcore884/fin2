'use client';

import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { ScrollArea } from '../ui/scroll-area';
import { db } from '@/firebase/client';
import { Skeleton } from '../ui/skeleton';


interface UploadSession {
  id: string;
  userId: string;
  createdAt: Timestamp;
  status: 'uploading' | 'ready_for_processing' | 'processing' | 'completed' | 'error';
  files: Record<string, { name: string; path: string; uploadedAt: Date }>;
  resultId?: string;
  errorMessage?: string;
}

interface UploadHistoryProps {
  newSessionId: string | null;
}

export default function UploadHistory({ newSessionId }: UploadHistoryProps) {
  const [sessions, setSessions] = useState<UploadSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const q = query(
      collection(db, 'upload_sessions'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const sessionsData: UploadSession[] = [];
      querySnapshot.forEach((doc) => {
        sessionsData.push({ id: doc.id, ...doc.data() } as UploadSession);
      });
      setSessions(sessionsData);
      setLoading(false);
    }, (error) => {
        console.error("Error fetching upload sessions:", error);
        setLoading(false);
    });

    return () => unsubscribe();
  }, []); // Rerun effect when a new upload is completed

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return <Badge variant="secondary" className="border-green-400/50 text-green-400">Completed</Badge>;
      case 'processing': return <Badge variant="outline" className="border-blue-400/50 text-blue-400">Processing</Badge>;
      case 'ready_for_processing': return <Badge variant="outline" className="border-yellow-400/50 text-yellow-400">Queued</Badge>;
      case 'error': return <Badge variant="destructive">Error</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  if (loading) {
    return (
        <Card>
            <CardHeader><CardTitle>Upload History</CardTitle></CardHeader>
            <CardContent className="space-y-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
            </CardContent>
        </Card>
    )
  }

  if (sessions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Upload History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-10">No uploads yet. Your upload history will appear here.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload History</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px]">
            <div className="space-y-4 pr-4">
            {sessions.map((session) => (
                <div key={session.id} className="border rounded-lg p-4 transition-colors hover:bg-muted/50">
                <div className="flex justify-between items-start mb-2">
                    <div>
                    <h3 className="font-semibold">Session {session.id.slice(0, 8)}...</h3>
                    <p className="text-sm text-muted-foreground">
                        {session.createdAt?.toDate().toLocaleString()}
                    </p>
                    </div>
                    {getStatusBadge(session.status)}
                </div>
                
                <div className="text-xs text-muted-foreground mb-3">
                    {Object.keys(session.files || {}).length} files uploaded
                </div>

                {session.errorMessage && (
                    <div className="bg-destructive/10 border border-destructive/20 rounded p-2 mb-3">
                    <p className="text-destructive text-xs font-mono">{session.errorMessage}</p>
                    </div>
                )}

                <div className="flex space-x-2">
                    {session.resultId && (
                        <Button variant="outline" size="sm" asChild>
                            <Link href={`/reports`}>
                                View Report
                            </Link>
                        </Button>
                    )}
                     <Button variant="secondary" size="sm" asChild>
                        <Link href={`/reports/${session.id}`}>
                            File Details
                        </Link>
                    </Button>
                </div>
                </div>
            ))}
            </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}