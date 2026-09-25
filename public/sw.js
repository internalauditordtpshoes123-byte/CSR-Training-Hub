// Service Worker for DATIAN CSR HUB Background & Desktop Notifications
const CACHE_NAME = 'datian-csr-hub-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle incoming messages from the app to display background notifications
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    event.waitUntil(
      self.registration.showNotification(title, {
        ...options,
        icon: options.icon || '/datian-logo.svg',
        badge: options.badge || '/datian-logo.svg',
        vibrate: [200, 100, 200]
      })
    );
  }
});

// Handle click on desktop notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const chatId = event.notification.data?.chatId;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a browser tab or window is already open, focus it and navigate to chat
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          client.postMessage({
            type: 'NAVIGATE_TO_CHAT',
            chatId: chatId
          });
          return;
        }
      }
      // If no window is open, open a fresh window pointing to the chat
      if (self.clients.openWindow) {
        const targetUrl = chatId ? `/?tab=messages&chatId=${encodeURIComponent(chatId)}` : '/?tab=messages';
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
