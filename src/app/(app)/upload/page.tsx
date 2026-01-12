'use client';

import { useState } from 'react';
import { UploadArea } from "@/components/upload/upload-area";
import UploadHistory from "@/components/upload/upload-history";

export default function UploadPage() {
    const [uploadCompleted, setUploadCompleted] = useState<string | null>(null);

    const handleUploadComplete = (sessionId: string) => {
        setUploadCompleted(sessionId); // This will trigger a re-render of UploadHistory
    };

    return (
        <div className="flex flex-col gap-8">
            <div>
                <h1 className="font-headline text-3xl md:text-4xl">Upload Data</h1>
                <p className="text-muted-foreground">
                Upload your financial files to begin processing and generate a new report.
                </p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <UploadArea onUploadComplete={handleUploadComplete} />
                </div>
                <div className="lg:col-span-1">
                     <UploadHistory newSessionId={uploadCompleted} />
                </div>
            </div>
        </div>
    );
}
