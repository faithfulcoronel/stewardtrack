import { useMessageStore } from '../components/MessageHandler';

export class NotificationService {
  static showSuccess(text: string, duration = 3000) {
    const { addMessage } = useMessageStore.getState();
    addMessage({ type: 'success', text, duration });
  }

  static showError(text: string, duration = 5000) {
    const { addMessage } = useMessageStore.getState();
    addMessage({ type: 'error', text, duration });
  }

  static showInfo(text: string, duration = 3000) {
    const { addMessage } = useMessageStore.getState();
    addMessage({ type: 'info', text, duration });
  }
}
