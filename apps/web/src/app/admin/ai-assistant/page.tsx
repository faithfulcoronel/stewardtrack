'use client';

import React, { useState } from 'react';
import { ChatContainer } from '@/components/ai-chat';
import { Card } from '@/components/ui/card';

export default function AIAssistantPage() {
  const [sessionId] = useState(() => `session_${Date.now()}`);

  const handleSendMessage = async (message: string, attachments?: File[]) => {
    try {
      // Call the API
      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          sessionId,
          // TODO: Handle attachments upload
          attachments: attachments?.map(f => ({ name: f.name, size: f.size, type: f.type })),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();

      // TODO: Handle streaming responses
      // For now, add the response to messages
      console.log('AI Response:', data);
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] w-full">
      <Card className="h-full border-0 md:border rounded-none md:rounded-lg overflow-hidden">
        <ChatContainer onSendMessage={handleSendMessage} />
      </Card>
    </div>
  );
}
