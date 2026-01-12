'use client';

import { useState } from 'react';
import { useChat } from '@/hooks/useChat';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ThumbsDown, ThumbsUp, X } from 'lucide-react';
import { Message } from '@/types/chat';
import { Loader } from 'lucide-react';
import { FeedbackDialog } from './feedback/feedback-dialog';


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
      
      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div key={index} className={`flex items-end gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
             {message.role === 'assistant' && (
                <div className="flex flex-col gap-1">
                    <FeedbackDialog 
                        sessionId={currentSessionId} 
                        aiResponse={message.content}
                        userQuestion={messages[index-1]?.content}
                        trigger={<Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary"><ThumbsUp className="h-4 w-4"/></Button>}
                        isPositive={true}
                    />
                    <FeedbackDialog 
                        sessionId={currentSessionId} 
                        aiResponse={message.content}
                        userQuestion={messages[index-1]?.content}
                        trigger={<Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"><ThumbsDown className="h-4 w-4"/></Button>}
                        isPositive={false}
                    />
                </div>
             )}
            <div
              className={`max-w-xs px-4 py-2 rounded-lg ${
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              <p className="text-sm">{message.content}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
              <div className="flex items-center gap-2 max-w-xs px-4 py-2 rounded-lg bg-muted text-muted-foreground">
                  <Loader className="h-4 w-4 animate-spin"/>
                  <p className="text-sm">Analyzing...</p>
              </div>
          </div>
        )}
      </div>


      {/* Input Area */}
      <div className="p-4 border-t border-border">
        <div className="grid grid-cols-2 gap-2 mb-2">
          <Button variant="outline" size="sm" className="text-xs" onClick={() => handleQuickAction("What are the main cost drivers in my latest report?")}>Cost Analysis</Button>
          <Button variant="outline" size="sm" className="text-xs" onClick={() => handleQuickAction("Show me revenue trends across my reports")}>Revenue Trends</Button>
          <Button variant="outline" size="sm" className="text-xs" onClick={() => handleQuickAction("What anomalies were detected in my data?")}>Anomalies</Button>
          <Button variant="outline" size="sm" className="text-xs" onClick={() => handleQuickAction("Give me recommendations for cost optimization")}>Recommendations</Button>
        </div>
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
      </div>
    </div>
  );
}
