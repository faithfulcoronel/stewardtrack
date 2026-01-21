'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, ChatMessageProps } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export interface ChatContainerProps {
  onSendMessage: (message: string, attachments?: File[]) => Promise<void>;
  initialMessages?: ChatMessageProps[];
}

export function ChatContainer({ onSendMessage, initialMessages = [] }: ChatContainerProps) {
  const [messages, setMessages] = useState<ChatMessageProps[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (message: string, attachments?: File[]) => {
    if (!message.trim() && !attachments?.length) return;

    setError(null);

    // Add user message
    const userMessage: ChatMessageProps = {
      role: 'user',
      content: message,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // Add typing indicator
    setMessages((prev) => [
      ...prev,
      {
        role: 'assistant',
        content: '',
        isTyping: true,
      },
    ]);

    setIsLoading(true);

    try {
      // Call the API
      await onSendMessage(message, attachments);

      // Remove typing indicator
      setMessages((prev) => prev.filter((msg) => !msg.isTyping));

      // Note: The actual assistant response will be added via streaming
      // or in the onSendMessage callback
    } catch (err: any) {
      setError(err.message || 'Failed to send message');

      // Remove typing indicator
      setMessages((prev) => prev.filter((msg) => !msg.isTyping));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    // Optionally retry the last message
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Messages Area */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Welcome Message */}
          {messages.length === 0 && (
            <div className="text-center py-12 space-y-4">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <svg
                  className="h-8 w-8 text-primary"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold">Welcome to StewardTrack AI Assistant!</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  I can help you with members, finances, events, and more. Try asking:
                </p>
                <div className="mt-4 flex flex-wrap gap-2 justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSendMessage("Who has a birthday this month?", [])}
                  >
                    Who has a birthday this month?
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSendMessage("Show me financial categories", [])}
                  >
                    Show financial categories
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSendMessage("Find member John Smith", [])}
                  >
                    Find a member
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map((message, index) => (
            <ChatMessage key={index} {...message} />
          ))}

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="max-w-2xl mx-auto">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>{error}</span>
                <Button variant="ghost" size="sm" onClick={handleRetry}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <ChatInput
        onSendMessage={handleSendMessage}
        disabled={isLoading}
        placeholder="Ask me anything about members, finances, events..."
      />
    </div>
  );
}
