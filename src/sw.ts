/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching'

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: { url: string; revision: string | null }[] }

// Precache all Vite build outputs
precacheAndRoute(self.__WB_MANIFEST)

// Relay notification requests from the page
self.addEventListener('message', (event: ExtendableMessageEvent) => {
  if (event.data?.type === 'SHOW_NOTIFICATION') {
    const { title, body, tag } = event.data as { type: string; title: string; body: string; tag: string }
    self.registration.showNotification(title, {
      body,
      tag,
      icon: './icons/icon-192.png',
      badge: './icons/icon-192.png',
    })
  }
})

// On notification click, focus or open the app
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus()
      }
      if (self.clients.openWindow) return self.clients.openWindow('./')
    }),
  )
})
