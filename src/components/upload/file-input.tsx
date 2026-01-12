'use client';

import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '../ui/button';
import { Sparkles, Wand, Loader, CheckCircle, UploadCloud } from 'lucide-react';
import { useUploadFile } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Terminal } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

const fileTypes = [
  {
    id: 'glEntries',
    label: 'General Ledger (GL) Entries',
    description: 'Your main financial transactions from your accounting system.',
    required: true,
    accept: '.csv,.xlsx,.pdf'
  },
  {
    id: 'budgetHolderMapping',
    label: 'Budget Holder Mapping',
    description: 'Links budget categories to department owners.',
    required: true,
    accept: '.csv,.xlsx'
  },
  {
    id: 'costItemMap',
    label: 'Cost Item Map',
    description: 'Translates ledger codes into standard categories.',
    required: true,
    accept: '.csv,.xlsx'
  },
  {
    id: 'regionalMapping',
    label: 'Regional Mapping',
    description: 'Links departments to geographical regions.',
    required: true,
    accept: '.csv,.xlsx'
  },
  {
    id: 'corrections',
    label: 'Corrections (Optional)',
    description: 'Manual overrides for special cases.',
    required: false,
    accept: '.csv,.xlsx'
  },
  {
    id: 'revenueReport',
    label: 'Revenue Report (Optional)',
    description: 'Additional data to help classify revenue.',
    required: false,
    accept: '.csv,.xlsx,.pdf'
  },
];


export function UploadArea() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Record<string, File | null>>(
    Object.fromEntries(fileTypes.map(f => [f.id, null]))
  );

  const { uploadFile, createUploadSession, updateSessionFiles, markSessionAsReady } = useUploadFile();
  const { toast } = useToast();

  const handleFileChange = (fileType: string, file: File | null) => {
    setSelectedFiles(prev => ({ ...prev, [fileType]: file }));
  };

  const handleProcessFiles = async () => {
    const userId = "anonymous_user"; // Since auth is removed
    setIsProcessing(true);
    setProgress(0);
    const newSessionId = uuidv4();

    const filesToUpload = fileTypes.map(ft => ({ id: ft.id, file: selectedFiles[ft.id], required: ft.required, label: ft.label }))
      .filter(f => f.file);

    if (filesToUpload.length === 0) {
      toast({ variant: 'destructive', title: 'No files selected', description: 'Please select at least one file to process.' });
      setIsProcessing(false);
      return;
    }

    try {
      // 1. Create the session document in Firestore
      await createUploadSession(userId, newSessionId);
      toast({ title: "Upload Session Created", description: `Session ID: ${newSessionId.substring(0,8)}...` });

      // 2. Upload all files sequentially to track progress
      for (const [index, fileToUpload] of filesToUpload.entries()) {
        const { id, file, label } = fileToUpload;
        if (!file) continue;

        setActiveFile(label);
        const storagePath = `user_uploads/${userId}/${newSessionId}/${id}/${file.name}`;
        
        await uploadFile(storagePath, file, (fileProgress) => {
            const overallProgress = (index / filesToUpload.length) * 100 + (fileProgress / filesToUpload.length);
            setProgress(Math.round(overallProgress));
        });
        
        await updateSessionFiles(newSessionId, id, file.name, storagePath);
      }
      
      setActiveFile(null);

      // 3. Mark the session as ready for processing
      await markSessionAsReady(newSessionId);

      toast({
          title: 'Upload Complete & Processing Started',
          description: 'The backend is now processing your files. Check the dashboard for status updates.',
      });
      setSessionId(newSessionId);

    } catch (error: any) {
       toast({
        variant: 'destructive',
        title: 'Processing Failed',
        description: error.message || 'An unexpected error occurred.',
      });
       setIsProcessing(false); // Re-enable button on failure
    }
  };

  const canUpload = fileTypes.filter(ft => ft.required).every(ft => selectedFiles[ft.id]);

  if (sessionId) {
    return (
        <Alert>
            <Terminal className="h-4 w-4" />
            <AlertTitle>Processing Initiated!</AlertTitle>
            <AlertDescription>
                Your files have been securely uploaded. The backend process has been triggered, and you can monitor the status on your dashboard.
                <div className="mt-2 text-xs text-muted-foreground">Session ID: {sessionId}</div>
            </AlertDescription>
        </Alert>
    )
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {fileTypes.map((fileType) => (
            <div key={fileType.id} className="rounded-lg border bg-card/80 p-4 text-card-foreground shadow-sm backdrop-blur-sm">
                <label className="block text-sm font-medium mb-1">
                {fileType.label}
                {fileType.required && <span className="text-destructive ml-1">*</span>}
                </label>
                <p className="text-xs text-muted-foreground mb-3">
                {fileType.description} Accepts: {fileType.accept}
                </p>
                {selectedFiles[fileType.id] ? (
                    <div className="flex items-center justify-between text-sm text-green-400 border border-green-400/30 bg-green-950/50 rounded-md px-3 py-2">
                        <span className="truncate">{selectedFiles[fileType.id]?.name}</span>
                        <CheckCircle className="h-4 w-4 shrink-0"/>
                    </div>
                ) : (
                    <div className="flex items-center space-x-2">
                    <input
                        type="file"
                        id={fileType.id}
                        accept={fileType.accept}
                        onChange={(e) => handleFileChange(fileType.id, e.target.files?.[0] || null)}
                        disabled={isProcessing}
                        className="hidden"
                    />
                    <label htmlFor={fileType.id} className="flex h-10 w-full cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md border border-dashed bg-muted/50 px-4 py-2 text-sm font-medium ring-offset-background transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50">
                        <UploadCloud className="h-4 w-4"/>
                        Choose file...
                    </label>
                    </div>
                )}
            </div>
        ))}
      </div>
      
      <div className="flex flex-col items-end gap-4">
        {isProcessing && (
            <div className="w-full space-y-2">
                <Progress value={progress} className="h-2 w-full bg-accent/20" />
                {activeFile && (
                    <p className="text-sm text-muted-foreground">Uploading: <strong>{activeFile}</strong></p>
                )}
            </div>
        )}
        <Button size="lg" className="group relative overflow-hidden transition-all duration-300 hover:shadow-glow-accent" onClick={handleProcessFiles} disabled={isProcessing || !canUpload}>
          {isProcessing ? (
            <>
              <Loader className="mr-2 h-5 w-5 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Wand className="mr-2 h-5 w-5 transition-transform duration-300 group-hover:-translate-x-1" />
              Generate Report
              <Sparkles className="absolute right-2 h-5 w-5 opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0" />
            </>
          )}
        </Button>
         {!canUpload && !isProcessing && (
          <p className="text-sm text-destructive">
            Please upload all required files (marked with *) to proceed.
          </p>
        )}
      </div>
    </div>
  );
}