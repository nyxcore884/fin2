
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/firebase/client';
import { Label } from '../ui/label';

interface FeedbackDialogProps {
  sessionId?: string;
  aiResponse?: string;
  userQuestion?: string;
  trigger?: React.ReactNode;
  isPositive?: boolean;
}

type FeedbackType = 'rating' | 'correction' | 'suggestion' | 'bug_report';
type FeedbackCategory = 'ai_analysis' | 'data_processing' | 'ui_ux' | 'mapping' | 'performance';
type FeedbackPriority = 'low' | 'medium' | 'high' | 'critical';

export function FeedbackDialog({ 
  sessionId, 
  aiResponse, 
  userQuestion, 
  trigger,
  isPositive = false
}: FeedbackDialogProps) {
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState({
    type: 'rating' as FeedbackType,
    category: 'ai_analysis' as FeedbackCategory,
    rating: isPositive ? 5 : 1,
    comment: '',
    priority: 'medium' as FeedbackPriority
  });
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  // Using a placeholder user since auth is removed
  const userId = 'anonymous-user'; 

  const submitFeedback = async () => {
    if (!userId || !feedback.comment.trim()) {
        toast({
            variant: 'destructive',
            title: 'Incomplete Feedback',
            description: 'Please provide a comment before submitting.',
        });
        return;
    }

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'feedback'), {
        userId,
        sessionId,
        timestamp: serverTimestamp(),
        type: feedback.type,
        category: feedback.category,
        rating: feedback.rating,
        comment: feedback.comment,
        priority: feedback.priority,
        context: {
          aiResponse,
          userQuestion,
        },
        status: 'new',
        metadata: {
          appVersion: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
          browser: navigator.userAgent,
          deviceType: navigator.platform
        }
      });
      
      setOpen(false);
      setFeedback({
        type: 'rating',
        category: 'ai_analysis',
        rating: 0,
        comment: '',
        priority: 'medium'
      });
      toast({
        title: 'Feedback Submitted',
        description: 'Thank you for helping us improve!',
      });
      
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast({
        variant: 'destructive',
        title: 'Submission Failed',
        description: 'Could not submit feedback. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button variant="outline" size="sm">Provide Feedback</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Provide Feedback</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>How would you rate this response?</Label>
            <div className="flex space-x-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setFeedback({...feedback, rating: star})}
                  className={`text-3xl transition-colors ${feedback.rating >= star ? 'text-yellow-400' : 'text-muted-foreground hover:text-yellow-300'}`}
                  aria-label={`Rate ${star} out of 5 stars`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="feedback-comment">
              Additional Comments
            </Label>
            <Textarea
              id="feedback-comment"
              name="feedback-comment"
              value={feedback.comment}
              onChange={(e) => setFeedback({...feedback, comment: e.target.value})}
              placeholder="What did you like or dislike? How can we improve?"
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label htmlFor="feedback-type">Feedback Type</Label>
                <Select
                  value={feedback.type}
                  onValueChange={(value: FeedbackType) => setFeedback({...feedback, type: value})}
                >
                  <SelectTrigger id="feedback-type" name="feedback-type">
                      <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="rating">Rating</SelectItem>
                      <SelectItem value="correction">Data Correction</SelectItem>
                      <SelectItem value="suggestion">Suggestion</SelectItem>
                      <SelectItem value="bug_report">Bug Report</SelectItem>
                  </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <Label htmlFor="feedback-category">Category</Label>
                <Select
                  value={feedback.category}
                  onValueChange={(value: FeedbackCategory) => setFeedback({...feedback, category: value})}
                >
                  <SelectTrigger id="feedback-category" name="feedback-category">
                      <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="ai_analysis">AI Analysis</SelectItem>
                      <SelectItem value="data_processing">Data Processing</SelectItem>
                      <SelectItem value="ui_ux">UI/UX</SelectItem>
                  </SelectContent>
                </Select>
            </div>
          </div>

        </div>
        <DialogFooter>
            <DialogClose asChild>
                <Button variant="ghost">Cancel</Button>
            </DialogClose>
            <Button 
                onClick={submitFeedback} 
                disabled={submitting || !feedback.comment.trim()}
            >
                {submitting ? 'Submitting...' : 'Submit Feedback'}
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
