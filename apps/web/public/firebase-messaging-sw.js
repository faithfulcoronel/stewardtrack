/**
 * Firebase Messaging Service Worker
 *
 * This service worker handles background push notifications from Firebase Cloud Messaging.
 * It must be placed in the public folder to be served at the root of the domain.
 *
 * IMPORTANT: Service workers cannot access environment variables. The Firebase config
 * below must match your NEXT_PUBLIC_FIREBASE_* values in .env
 */

/* eslint-disable no-undef */

// Import Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Initialize Firebase with your config
// These values must match your NEXT_PUBLIC_FIREBASE_* environment variables
firebase.initializeApp({
  apiKey: 'AIzaSyB497wwx-RO0f-HhGrRXFDkO1DN2NM3nvI',
  authDomain: 'stewardtrack-push.firebaseapp.com',
  projectId: 'stewardtrack-push',
  storageBucket: 'stewardtrack-push.firebasestorage.app',
  messagingSenderId: '456964118726',
  appId: '1:456964118726:web:e1de932a31a8a65eec1fc7',
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);

  const notificationTitle = payload.notification?.title || 'New Notification';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    tag: payload.data?.eventId || 'default',
    data: payload.data || {},
    actions: [
      {
        action: 'open',
        title: 'Open',
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
      },
    ],
    requireInteraction: true,
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification click:', event);

  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  // Get the action URL from notification data or default to home
  const actionUrl = event.notification.data?.actionUrl || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already an open window and focus it
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          if (actionUrl !== '/') {
            client.navigate(actionUrl);
          }
          return;
        }
      }

      // Otherwise, open a new window
      if (clients.openWindow) {
        return clients.openWindow(actionUrl);
      }
    })
  );
});

// Handle push subscription change
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('[firebase-messaging-sw.js] Push subscription changed');

  event.waitUntil(
    // Re-subscribe and update the token on the server
    self.registration.pushManager.subscribe(event.oldSubscription.options).then((subscription) => {
      // Send the new subscription to the server
      return fetch('/api/notifications/device-tokens/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          oldToken: event.oldSubscription,
          newToken: subscription,
        }),
      });
    })
  );
});
