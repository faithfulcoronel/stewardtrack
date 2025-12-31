import type { RealtimeChannel } from '@supabase/supabase-js';

const subscriptions = new Set<RealtimeChannel>();

export const supabaseWrapper = {
  addSubscription(channel: RealtimeChannel) {
    subscriptions.add(channel);
  },

  removeSubscription(channel: RealtimeChannel) {
    if (subscriptions.delete(channel)) {
      channel.unsubscribe();
    }
  },

  clearSubscriptions() {
    for (const channel of subscriptions) {
      channel.unsubscribe();
    }
    subscriptions.clear();
  },
};
