'use client';

import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { FileInput } from './file-input';
import { Button } from '../ui/button';
import { Sparkles, Wand, Loader } from 'lucide-react';
import { useUploadFile } from '@/lib/storage';
import { MOCK_UPLOAD_FILES } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Terminal } from 'lucide-react';
import { useUser } from '@/firebase/firebase';

type FileInfo = {
  id: string;
  title: string;
  description: string;
  required: boolean;
};

type FileState = {
  file: File | null;
  progress: number;
  uploadState: 'empty' | 'selected' | 'loading' | 'success' | 'error';
};

export function UploadArea() {
  const [filesState, setFilesState] = useState<Record<string, FileState>>(
    MOCK_UPLOAD_FILES.reduce((acc, file) => {
      acc[file.id] = { file: null, progress: 0, uploadState: 'empty' };
      return acc;
    }, {} as Record<string, FileState>)
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const { user } = useUser();
  const { uploadFile, createUploadSession, updateSessionFiles, markSessionAsReady } = useUploadFile();
  const { toast } = useToast();

  const handleFileChange = (id: string, file: File | null) => {
    setFilesState(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        file,
        uploadState: file ? 'selected' : 'empty',
      },
    }));
  };

  const handleRemoveFile = (id: string) => {
    setFilesState(prev => ({
      ...prev,
      [id]: { file: null, progress: 0, uploadState: 'empty' },
    }));
  };

  const handleProcessFiles = async () => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be signed in to upload files.' });
      return;
    }

    setIsProcessing(true);
    const newSessionId = uuidv4();

    const filesToUpload = Object.entries(filesState)
      .filter(([, state]) => state.uploadState === 'selected' && state.file)
      .map(([id, state]) => ({ id, file: state.file! }));

    if (filesToUpload.length === 0) {
      toast({ variant: 'destructive', title: 'No files selected', description: 'Please select at least one file to process.' });
      setIsProcessing(false);
      return;
    }

    try {
      // 1. Create the session document in Firestore
      await createUploadSession(user.uid, newSessionId);
      toast({ title: "Upload Session Created", description: `Session ID: ${newSessionId}` });

      // 2. Upload all files in parallel
      const uploadPromises = filesToUpload.map(({ id, file }) => {
        setFilesState(prev => ({ ...prev, [id]: { ...prev[id], uploadState: 'loading', progress: 0 } }));
        const storagePath = `user_uploads/${user.uid}/${newSessionId}/${id}/${file.name}`;
        
        return uploadFile(storagePath, file, (progress) => {
          setFilesState(prev => ({ ...prev, [id]: { ...prev[id], progress } }));
        }).then(async () => {
          setFilesState(prev => ({ ...prev, [id]: { ...prev[id], uploadState: 'success' } }));
          // Update the session doc with this file's info
          await updateSessionFiles(newSessionId, id, file.name, storagePath);
          return { id, status: 'success' };
        }).catch((error) => {
          console.error(`Upload failed for ${id}:`, error);
          setFilesState(prev => ({ ...prev, [id]: { ...prev[id], uploadState: 'error' } }));
          return { id, status: 'error' };
        });
      });

      const results = await Promise.all(uploadPromises);

      if (results.some(r => r.status === 'error')) {
        throw new Error('Some files failed to upload.');
      }

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
    } finally {
      setIsProcessing(false);
    }
  };

  const requiredFilesMet = MOCK_UPLOAD_FILES
    .filter(f => f.required)
    .every(f => filesState[f.id].file !== null);

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
        {MOCK_UPLOAD_FILES.map((fileInfo: FileInfo) => (
          <FileInput
            key={fileInfo.id}
            {...fileInfo}
            file={filesState[fileInfo.id].file}
            onFileChange={(file) => handleFileChange(fileInfo.id, file)}
            onRemoveFile={() => handleRemoveFile(fileInfo.id)}
            uploadState={filesState[fileInfo.id].uploadState}
            progress={filesState[fileInfo.id].progress}
          />
        ))}
      </div>
      <div className="flex justify-end">
        <Button size="lg" className="group relative overflow-hidden transition-all duration-300 hover:shadow-glow-accent" onClick={handleProcessFiles} disabled={isProcessing || !requiredFilesMet}>
          {isProcessing ? (
            <>
              <Loader className="mr-2 h-5 w-5 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Wand className="mr-2 h-5 w-5 transition-transform duration-300 group-hover:-translate-x-1" />
              Process Files
              <Sparkles className="absolute right-2 h-5 w-5 opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
