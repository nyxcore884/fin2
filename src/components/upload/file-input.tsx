// This component is now a controlled component.
// The parent (UploadArea) will manage its state.
"use client"

import { useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, FileUp, Loader, X, File as FileIcon, UploadCloud } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

type FileInputProps = {
  id: string;
  title: string;
  description: string;
  required: boolean;
  file: File | null;
  onFileChange: (file: File | null) => void;
  onRemoveFile: () => void;
  uploadState: 'empty' | 'selected' | 'loading' | 'success';
  progress: number;
};

export function FileInput({
  id,
  title,
  description,
  required,
  file,
  onFileChange,
  onRemoveFile,
  uploadState,
  progress,
}: FileInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onFileChange(event.target.files?.[0] || null);
  };

  const triggerFileSelect = () => {
    inputRef.current?.click();
  };

  return (
    <Card className="flex h-full flex-col justify-between bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          {uploadState === 'success' ? <CheckCircle className="text-green-400" /> : <FileUp />}
          {title}
          {required && <span className="text-xs text-destructive">*</span>}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {uploadState === 'empty' && (
          <div
            onClick={triggerFileSelect}
            className="flex h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border text-center transition-colors hover:border-primary hover:bg-muted/50"
          >
            <UploadCloud className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Click or drag file to upload</p>
            <input type="file" ref={inputRef} onChange={handleFileChange} className="hidden" accept=".csv,.xlsx,.xls,.pdf" />
          </div>
        )}
        {file && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-md border bg-muted/30 p-3">
              <FileIcon className="h-6 w-6 shrink-0 text-muted-foreground" />
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(2)} KB</p>
              </div>
              {uploadState !== 'loading' && (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRemoveFile}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            {uploadState === 'loading' && (
              <div className="flex items-center gap-3">
                <Loader className="h-4 w-4 animate-spin text-accent" />
                <Progress value={progress} className="h-2 w-full bg-accent/20" />
              </div>
            )}
            {uploadState === 'success' && (
              <div className="flex items-center gap-2 text-sm text-green-400">
                <CheckCircle className="h-4 w-4" />
                <span>Upload Complete</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
