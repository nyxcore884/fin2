'use client';

import { useState } from 'react';
import AIChat from './AIChat';
import { Button } from './ui/button';
import { MessageSquare, Bot } from 'lucide-react';

interface FloatingAIChatProps {
  currentSessionId?: string;
}

export default function FloatingAIChat({ currentSessionId }: FloatingAIChatProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-[28rem] h-[36rem] bg-background rounded-lg shadow-2xl border-2 border-primary/50">
          <AIChat onClose={() => setIsOpen(false)} currentSessionId={currentSessionId} />
        </div>
      )}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent shadow-lg hover:shadow-glow-primary transition-all duration-300 transform hover:scale-110"
        aria-label="Toggle AI Chat"
      >
        <Bot className="h-8 w-8 text-primary-foreground" />
      </Button>
    </div>
  );
}
