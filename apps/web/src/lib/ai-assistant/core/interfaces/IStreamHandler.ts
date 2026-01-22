/**
 * IStreamHandler Interface
 * Contract for handling Server-Sent Events (SSE) streaming
 */

export interface StreamEvent {
  type: 'start' | 'progress' | 'complete' | 'error' | 'title_update';
  data: any;
}

export interface IStreamHandler {
  /**
   * Send a stream event to the client
   * @param event - Stream event to send
   */
  sendEvent(event: StreamEvent): void;

  /**
   * Send start event
   * @param sessionId - Session identifier
   */
  sendStart(sessionId?: string): void;

  /**
   * Send progress event
   * @param step - Execution step
   */
  sendProgress(step: any): void;

  /**
   * Send completion event
   * @param components - UI components
   * @param tokensUsed - Token usage stats
   */
  sendComplete(components: any[], tokensUsed: any): void;

  /**
   * Send error event
   * @param error - Error message
   */
  sendError(error: string): void;

  /**
   * Send title update event
   * @param title - New conversation title
   */
  sendTitleUpdate(title: string): void;

  /**
   * Close the stream
   */
  close(): void;
}
