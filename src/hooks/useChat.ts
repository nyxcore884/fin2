'use client';

import { useState } from 'react';
import { provideAnomalySuggestions } from '@/ai/flows/provide-anomaly-suggestions';
import { Message } from '@/types/chat';
import { useAuth } from '@/hooks/use-auth';

type UseChatProps = {
    currentSessionId?: string;
};

export function useChat({ currentSessionId }: UseChatProps = {}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const { user, anonymousId } = useAuth();

  const sendMessage = async (content: string) => {
    if (!content.trim()) return;

    setIsLoading(true);
    
    const userMessage: Message = { role: 'user', content };
    setMessages(prev => [...prev, userMessage]);
    
    try {
      const userId = user?.uid || anonymousId || 'unknown_user';

      const result = await provideAnomalySuggestions({
        message: content,
        userId: userId,
        sessionId: currentSessionId,
      });
      
      const assistantMessage: Message = { role: 'assistant', content: result.response };
      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      console.error('Error calling AI assistant:', error);
      const errorMessage: Message = { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again.' 
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return { messages, sendMessage, isLoading, inputMessage, setInputMessage };
}
