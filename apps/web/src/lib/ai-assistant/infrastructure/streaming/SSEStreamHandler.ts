/**
 * SSEStreamHandler Implementation
 * Handles Server-Sent Events (SSE) streaming for AI responses
 *
 * SOLID: Single Responsibility - Only handles stream communication
 */

import { IStreamHandler, StreamEvent } from '../../core/interfaces/IStreamHandler';

export class SSEStreamHandler implements IStreamHandler {
  private encoder = new TextEncoder();
  private isClosed = false;

  constructor(private controller: ReadableStreamDefaultController) {}

  /**
   * Send a stream event to the client
   */
  sendEvent(event: StreamEvent): void {
    // Don't attempt to send if stream is closed
    if (this.isClosed) {
      return;
    }

    const sseMessage = `data: ${JSON.stringify({
      type: event.type,
      ...event.data,
    })}\n\n`;

    try {
      this.controller.enqueue(this.encoder.encode(sseMessage));
    } catch (error: any) {
      // Mark as closed if we get an error (likely controller already closed)
      if (error?.code === 'ERR_INVALID_STATE') {
        this.isClosed = true;
      } else {
        throw error;
      }
    }
  }

  /**
   * Send start event
   */
  sendStart(sessionId?: string): void {
    this.sendEvent({
      type: 'start',
      data: { sessionId },
    });
  }

  /**
   * Send progress event
   */
  sendProgress(step: any): void {
    this.sendEvent({
      type: 'progress',
      data: { step },
    });
  }

  /**
   * Send completion event
   */
  sendComplete(components: any[], tokensUsed: any): void {
    console.log(`📡 SSE sending complete event with ${components?.length || 0} components:`, JSON.stringify(components, null, 2));
    this.sendEvent({
      type: 'complete',
      data: { components, tokensUsed },
    });
  }

  /**
   * Send error event
   */
  sendError(error: string): void {
    this.sendEvent({
      type: 'error',
      data: { error },
    });
  }

  /**
   * Send title update event
   */
  sendTitleUpdate(title: string): void {
    console.log(`📡 SSE sending title_update event: "${title}"`);
    this.sendEvent({
      type: 'title_update',
      data: { title },
    });
  }

  /**
   * Close the stream
   */
  close(): void {
    if (this.isClosed) {
      return;
    }

    this.isClosed = true;
    try {
      this.controller.close();
    } catch (error) {
      // Stream may already be closed
      console.error('Error closing stream:', error);
    }
  }
}
