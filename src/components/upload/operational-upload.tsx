'use client';

import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '../ui/button';
import { Loader, Sparkles, Wand, FileCheck, UploadCloud } from 'lucide-react';
import { useUploadFile } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';

interface OperationalUploadProps {
  onUploadComplete: (sessionId: string) => void;
}

export function OperationalUpload({ onUploadComplete }: OperationalUploadProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analysisRequest, setAnalysisRequest] = useState('');
  
  const { uploadFile, createUploadSession, markSessionAsReady } = useUploadFile();
  const { toast } = useToast();

  const handleUpload = async () => {
    const userId = "anonymous_user"; // Since auth is removed
    if (!selectedFile || !analysisRequest.trim()) {
        toast({
            variant: 'destructive',
            title: 'Missing Information',
            description: 'Please select a file and provide an analysis request.',
        });
        return;
    }

    const sessionId = uuidv4();
    setIsProcessing(true);
    setProgress(0);

    try {
      await createUploadSession(userId, sessionId);
      
      const storagePath = `user_uploads/${userId}/${sessionId}/operational/${selectedFile.name}`;
      await uploadFile(storagePath, selectedFile, (progress) => {
        setProgress(progress);
      });

      // Mark session as ready for processing with the analysis request
      await markSessionAsReady(sessionId, {
        files: {
          operationalFile: {
            name: selectedFile.name,
            path: storagePath,
            uploadedAt: new Date()
          }
        },
        analysisRequest: analysisRequest.trim(),
        mode: 'operational'
      });

      onUploadComplete(sessionId);

    } catch (error: any) {
       toast({
        variant: 'destructive',
        title: 'Upload Failed',
        description: error.message || 'An unexpected error occurred.',
      });
       setIsProcessing(false);
    }
  };
  
  if (isProcessing) {
     return (
        <div className="space-y-4 rounded-lg border bg-card/80 p-6">
            <h3 className="text-lg font-medium text-center">Analyzing Data...</h3>
            <div className="w-full space-y-2 mt-4">
                <Progress value={progress} className="h-2 w-full bg-accent/20" />
                <p className="text-sm text-muted-foreground text-center">Uploading: <strong>{selectedFile?.name}</strong></p>
            </div>
        </div>
    )
  }

  return (
    <div className="rounded-lg border bg-card/80 p-6 space-y-8">
        <div className="space-y-4">
            {/* File Upload */}
            <div className="space-y-2">
                <Label>Financial Data File <span className="text-destructive">*</span></Label>
                <p className="text-xs text-muted-foreground">
                    Upload your complete financial Excel file with multiple sheets.
                </p>
                {selectedFile ? (
                     <div className="flex items-center justify-between text-sm text-green-400 border border-green-400/30 bg-green-950/50 rounded-md px-3 py-2">
                        <span className="truncate flex items-center gap-2"><FileCheck className="h-4 w-4"/> {selectedFile.name}</span>
                        <button onClick={() => setSelectedFile(null)} className="text-muted-foreground hover:text-destructive text-lg leading-none">&times;</button>
                    </div>
                ) : (
                     <label htmlFor="operational-file" className="flex h-24 w-full cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md border-2 border-dashed bg-muted/50 px-4 py-2 text-sm font-medium ring-offset-background transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50">
                        <UploadCloud className="h-8 w-8 text-muted-foreground"/>
                        <span>Click to browse or drag & drop file</span>
                        <input
                            id="operational-file"
                            type="file"
                            accept=".xlsx,.xls"
                            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                            disabled={isProcessing}
                            className="hidden"
                        />
                    </label>
                )}
            </div>

            {/* Analysis Request */}
            <div className="space-y-2">
                <Label htmlFor="analysis-request">Analysis Request <span className="text-destructive">*</span></Label>
                 <p className="text-xs text-muted-foreground">
                    What would you like to analyze? Be specific for better results.
                </p>
                <Textarea
                    id="analysis-request"
                    value={analysisRequest}
                    onChange={(e) => setAnalysisRequest(e.target.value)}
                    placeholder="e.g., 'Find any miscounted personnel costs', 'Show me fuel spending by region last quarter', 'Compare actual vs budget for IT department'"
                    rows={4}
                    disabled={isProcessing}
                />
            </div>
        </div>
        
        <div className="flex justify-end">
            <Button
                size="lg"
                onClick={handleUpload}
                disabled={isProcessing || !selectedFile || !analysisRequest.trim()}
                 className="group relative overflow-hidden transition-all duration-300 hover:shadow-glow-accent"
            >
                {isProcessing ? (
                    <><Loader className="mr-2 h-5 w-5 animate-spin" /> Processing...</>
                ) : (
                    <>
                     <Wand className="mr-2 h-5 w-5 transition-transform duration-300 group-hover:-translate-x-1" />
                        Analyze with AI
                     <Sparkles className="absolute right-2 h-5 w-5 opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0" />
                    </>
                )}
            </Button>
        </div>
    </div>
  );
}
