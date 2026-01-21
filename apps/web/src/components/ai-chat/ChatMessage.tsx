'use client';

import React from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Bot, User, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
  isTyping?: boolean;
  components?: any[];
}

export function ChatMessage({ role, content, timestamp, isTyping, components }: ChatMessageProps) {
  const isUser = role === 'user';

  return (
    <div
      className={cn(
        'flex gap-3 mb-4 animate-in fade-in-0 slide-in-from-bottom-2',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* Avatar */}
      <Avatar className={cn('h-8 w-8 shrink-0', isUser ? 'bg-primary' : 'bg-muted')}>
        <AvatarFallback>
          {isUser ? (
            <User className="h-4 w-4" />
          ) : (
            <Bot className="h-4 w-4 text-primary" />
          )}
        </AvatarFallback>
      </Avatar>

      {/* Message Content */}
      <div className={cn('flex flex-col max-w-[85%] sm:max-w-[75%]', isUser ? 'items-end' : 'items-start')}>
        {/* Message Bubble */}
        <div
          className={cn(
            'rounded-2xl px-4 py-2.5 shadow-sm',
            isUser
              ? 'bg-primary text-primary-foreground rounded-tr-sm'
              : 'bg-muted text-foreground rounded-tl-sm'
          )}
        >
          {isTyping ? (
            <div className="flex items-center gap-1">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Thinking...</span>
            </div>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown
                components={{
                  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                  ul: ({ children }) => <ul className="my-2 ml-4 list-disc">{children}</ul>,
                  ol: ({ children }) => <ol className="my-2 ml-4 list-decimal">{children}</ol>,
                  li: ({ children }) => <li className="mb-1">{children}</li>,
                  code: ({ children, className }) => {
                    const isInline = !className;
                    return isInline ? (
                      <code className="bg-background/50 px-1.5 py-0.5 rounded text-sm">{children}</code>
                    ) : (
                      <code className="block bg-background/50 p-2 rounded text-sm overflow-x-auto">
                        {children}
                      </code>
                    );
                  },
                  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                  em: ({ children }) => <em className="italic">{children}</em>,
                }}
              >
                {content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Components rendered by tools */}
        {components && components.length > 0 && (
          <div className="mt-2 space-y-2 w-full">
            {components.map((component, index) => (
              <div
                key={index}
                className="bg-card border rounded-lg p-3 shadow-sm"
              >
                <pre className="text-xs overflow-x-auto">
                  {JSON.stringify(component, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        )}

        {/* Timestamp */}
        {timestamp && (
          <span className="text-xs text-muted-foreground mt-1 px-1">
            {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>
    </div>
  );
}
