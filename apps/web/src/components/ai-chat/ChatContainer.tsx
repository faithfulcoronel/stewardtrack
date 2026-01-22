'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, ChatMessageProps } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { MemberCard } from './MemberCard';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export interface ChatContainerProps {
  onSendMessage: (message: string, attachments?: File[]) => Promise<Response | void>;
  initialMessages?: ChatMessageProps[];
}

export function ChatContainer({ onSendMessage, initialMessages = [] }: ChatContainerProps) {
  const [messages, setMessages] = useState<ChatMessageProps[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [thinkingMessage, setThinkingMessage] = useState<string | null>(null);
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
      const response = await onSendMessage(message, attachments);

      // Remove typing indicator
      setMessages((prev) => prev.filter((msg) => !msg.isTyping));

      // Handle streaming response if Response object is returned
      if (response && typeof response === 'object' && 'body' in response) {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error('No response body');
        }

        let buffer = '';
        let assistantContent = '';
        let currentComponents: any[] = [];
        const assistantMessageId = `assistant-${Date.now()}`;

        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.substring(6));

                switch (data.type) {
                  case 'progress':
                    const step = data.step;
                    if (step.type === 'thinking' || step.type === 'tool_use') {
                      // Show ephemeral thinking/progress messages
                      setThinkingMessage(step.content);
                    } else if (step.type === 'response') {
                      // Clear thinking message and show actual response
                      setThinkingMessage(null);
                      assistantContent = step.content;

                      setMessages(prev => {
                        const existing = prev.find((m: any) => m.id === assistantMessageId);
                        if (existing) {
                          return prev.map((m: any) =>
                            m.id === assistantMessageId
                              ? { ...m, content: assistantContent }
                              : m
                          );
                        } else {
                          return [
                            ...prev,
                            {
                              id: assistantMessageId,
                              role: 'assistant' as const,
                              content: assistantContent,
                              timestamp: new Date(),
                            },
                          ];
                        }
                      });
                    }
                    break;

                  case 'complete':
                    setThinkingMessage(null);
                    currentComponents = data.components || [];
                    setMessages(prev =>
                      prev.map((m: any) =>
                        m.id === assistantMessageId
                          ? { ...m, content: assistantContent, components: currentComponents }
                          : m
                      )
                    );
                    break;

                  case 'error':
                    throw new Error(data.error);
                }
              } catch (parseError) {
                console.error('Failed to parse SSE data:', line, parseError);
              }
            }
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send message');

      // Remove typing indicator
      setMessages((prev) => prev.filter((msg) => !msg.isTyping));
    } finally {
      setIsLoading(false);
      setThinkingMessage(null);
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
            <div key={index} className="space-y-4">
              <ChatMessage role={message.role} content={message.content} timestamp={message.timestamp} isTyping={message.isTyping} />

              {/* Render rich components */}
              {message.components?.map((component, compIndex) => (
                <div key={`${index}-component-${compIndex}`}>
                  {component.type === 'MemberCard' && component.data?.member && (
                    <MemberCard member={component.data.member} />
                  )}
                  {/* Fallback: Show JSON for unknown component types during development */}
                  {component.type !== 'MemberCard' && (
                    <div className="bg-card border rounded-lg p-3 shadow-sm max-w-2xl mx-auto">
                      <pre className="text-xs overflow-x-auto">
                        {JSON.stringify(component, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}

          {/* Thinking Message - Ephemeral */}
          {thinkingMessage && (
            <div className="max-w-2xl mx-auto">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                <div className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                  <svg className="h-3 w-3 text-primary animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
                <span className="text-sm text-muted-foreground italic flex-1">{thinkingMessage}</span>
              </div>
            </div>
          )}

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
