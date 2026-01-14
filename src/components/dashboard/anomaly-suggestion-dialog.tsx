'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Lightbulb, Loader, Zap } from 'lucide-react';
import { provideAnomalySuggestions } from '@/ai/flows/provide-anomaly-suggestions';
import { useToast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '@/hooks/use-auth';

type Anomaly = {
    id: string;
    metric: string;
    description: string;
    severity: 'high' | 'medium' | 'low';
    date: string;
}

type AnomalySuggestionDialogProps = {
  anomaly: Anomaly;
  sessionId?: string;
};

export function AnomalySuggestionDialog({ anomaly, sessionId }: AnomalySuggestionDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const { toast } = useToast();
  const { user, anonymousId } = useAuth();

  async function handleGetSuggestions() {
    if (suggestion) return;

    setIsLoading(true);
    try {
      const userId = user?.uid || anonymousId || 'unknown_user';
      const result = await provideAnomalySuggestions({
        userId: userId, 
        message: `Provide potential reasons, suggestions, and recommended actions for this financial anomaly: "${anomaly.description}"`,
        sessionId: sessionId,
      });
      
      setSuggestion(result.response);

    } catch(error) {
       toast({
        variant: 'destructive',
        title: 'AI Insight Failed',
        description: 'Could not generate AI-powered insights for this anomaly.',
      });
    } finally {
      setIsLoading(false);
    }
  }

  function onOpenChange(open: boolean) {
    setIsOpen(open);
    if (open) {
        handleGetSuggestions();
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Zap className="mr-2 h-4 w-4 text-accent" />
          AI Insight
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-headline flex items-center gap-2 text-2xl">
             <Lightbulb className="text-accent"/>
            AI Analysis: {anomaly.metric}
          </DialogTitle>
          <DialogDescription>
            {anomaly.description}
          </DialogDescription>
        </DialogHeader>
        {isLoading && (
            <div className="flex flex-col items-center justify-center gap-4 py-16">
                <Loader className="h-10 w-10 animate-spin text-primary" />
                <p className="text-muted-foreground">Generating insights...</p>
            </div>
        )}
        {suggestion && !isLoading && (
            <div className="prose prose-sm dark:prose-invert max-h-[60vh] overflow-y-auto rounded-lg bg-muted/30 p-4">
               <ReactMarkdown>{suggestion}</ReactMarkdown>
            </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
