'use client';

import React, { useState } from 'react';
import { ChatContainer } from '@/components/ai-chat';
import { Card } from '@/components/ui/card';

export default function AIAssistantPage() {
  const [sessionId] = useState(() => `session_${Date.now()}`);

  const handleSendMessage = async (message: string, attachments?: File[]) => {
    // Return the fetch response for ChatContainer to handle streaming
    const response = await fetch('/api/ai-chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        sessionId,
        attachments: attachments?.map(f => ({ name: f.name, size: f.size, type: f.type })),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to send message' }));
      throw new Error(errorData.error || 'Failed to send message');
    }

    // Return response for ChatContainer to process the stream
    return response;
  };

  return (
    <div className="h-[calc(100vh-4rem)] w-full">
      <Card className="h-full border-0 md:border rounded-none md:rounded-lg overflow-hidden">
        <ChatContainer onSendMessage={handleSendMessage} />
      </Card>
    </div>
  );
}
