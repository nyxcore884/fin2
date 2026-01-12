'use client';

import { useState } from 'react';
import { useChat } from '@/hooks/useChat';
import MessageList from './MessageList';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { X } from 'lucide-react';

interface AIChatProps {
  onClose: () => void;
  currentSessionId?: string;
}

export default function AIChat({ onClose, currentSessionId }: AIChatProps) {
  const { messages, sendMessage, isLoading, inputMessage, setInputMessage } = useChat({ currentSessionId });

  const handleSendMessage = () => {
    if (inputMessage.trim()) {
      sendMessage(inputMessage);
      setInputMessage('');
    }
  };

  const handleQuickAction = (text: string) => {
    setInputMessage(text);
    sendMessage(text);
    setInputMessage('');
  };

  return (
    <div className="flex flex-col h-full bg-background border border-primary rounded-lg">
      <div className="flex items-center justify-between p-4 border-b border-primary">
        <h3 className="text-lg font-semibold text-foreground">AI Financial Assistant</h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-6 w-6 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <MessageList messages={messages} isLoading={isLoading} />
      <div className="p-4 border-t border-border">
        <div className="flex space-x-2">
          <Input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Ask about your financial data..."
            className="flex-1"
            disabled={isLoading}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isLoading}
          >
            Send
          </Button>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" className="text-xs" onClick={() => handleQuickAction("What are the main cost drivers in my latest report?")}>Cost Analysis</Button>
          <Button variant="outline" size="sm" className="text-xs" onClick={() => handleQuickAction("Show me revenue trends across my reports")}>Revenue Trends</Button>
          <Button variant="outline" size="sm" className="text-xs" onClick={() => handleQuickAction("What anomalies were detected in my data?")}>Anomalies</Button>
          <Button variant="outline" size="sm" className="text-xs" onClick={() => handleQuickAction("Give me recommendations for cost optimization")}>Recommendations</Button>
        </div>
      </div>
    </div>
  );
}
