/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Enterprise Desktop & Native OS Notification Service for DATIAN CSR HUB
 * Enables real-time desktop toast notifications across Windows, macOS, and Linux
 * even when the browser tab is minimized, in the background, or inactive.
 */

export interface DesktopNotificationPayload {
  title: string;
  body: string;
  chatId?: string;
  senderName?: string;
  senderRole?: string;
  senderAvatar?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  timestamp?: string;
}

let serviceWorkerRegistration: ServiceWorkerRegistration | null = null;
let titleFlashInterval: any = null;
const ORIGINAL_DOCUMENT_TITLE = 'DATIAN CSR HUB - Compliance & Training Management System';

/**
 * Check if the browser supports desktop notifications
 */
export function isDesktopNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Get current permission state: 'granted' | 'denied' | 'default' | 'unsupported'
 */
export function getNotificationPermissionStatus(): NotificationPermission | 'unsupported' {
  if (!isDesktopNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

/**
 * Register Service Worker for background notifications
 */
export async function initNotificationServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    serviceWorkerRegistration = reg;
    console.log('[Desktop Notifications] Service Worker active with scope:', reg.scope);

    // Listen for messages from service worker (e.g. user clicked on notification)
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'NAVIGATE_TO_CHAT' && event.data?.chatId) {
        window.dispatchEvent(
          new CustomEvent('open-chat-from-notification', {
            detail: { chatId: event.data.chatId }
          })
        );
      }
    });

    return reg;
  } catch (err) {
    console.warn('[Desktop Notifications] Service Worker registration failed (falling back to standard Notification API):', err);
    return null;
  }
}

/**
 * Request permission from the user for desktop notifications
 */
export async function requestDesktopNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isDesktopNotificationSupported()) return 'unsupported';

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      localStorage.setItem('csr_desktop_notifications_enabled', 'true');
      await initNotificationServiceWorker();
      playChime();
    } else {
      localStorage.setItem('csr_desktop_notifications_enabled', 'false');
    }
    return permission;
  } catch (err) {
    console.warn('[Desktop Notifications] Request permission error:', err);
    return Notification.permission;
  }
}

/**
 * Play a clear, high-fidelity notification chime using the Web Audio API
 */
export function playChime() {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    // First harmonic note (E5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
    osc1.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5
    gain1.gain.setValueAtTime(0.12, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start();
    osc1.stop(ctx.currentTime + 0.35);

    // Second harmonic sparkle note (C#6)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1108.73, ctx.currentTime + 0.08); // C#6
    gain2.gain.setValueAtTime(0.08, ctx.currentTime + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.08);
    osc2.stop(ctx.currentTime + 0.45);
  } catch (err) {
    // Audio contexts may be suspended before user interaction
  }
}

/**
 * Flash page title to alert the user even if they are in another application or tab
 */
export function flashPageTitle(senderName: string, unreadCount: number = 1) {
  if (typeof document === 'undefined') return;

  if (titleFlashInterval) {
    clearInterval(titleFlashInterval);
  }

  let isAlternate = false;
  titleFlashInterval = setInterval(() => {
    document.title = isAlternate
      ? `(${unreadCount}) 💬 ${senderName} messaged you!`
      : `🔔 New Message | DATIAN CSR HUB`;
    isAlternate = !isAlternate;
  }, 1200);

  const stopFlashing = () => {
    if (titleFlashInterval) {
      clearInterval(titleFlashInterval);
      titleFlashInterval = null;
    }
    document.title = ORIGINAL_DOCUMENT_TITLE;
    window.removeEventListener('focus', stopFlashing);
    document.removeEventListener('visibilitychange', stopFlashing);
  };

  window.addEventListener('focus', stopFlashing);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      stopFlashing();
    }
  });
}

/**
 * Display a Native Desktop / Operating System Notification
 * Appears on the desktop taskbar / notification center even when the browser is minimized
 */
export async function showDesktopChatMessageNotification(payload: DesktopNotificationPayload): Promise<boolean> {
  if (!isDesktopNotificationSupported()) return false;
  if (Notification.permission !== 'granted') return false;

  const title = payload.title || `${payload.senderName || 'Colleague'} • DATIAN CSR HUB`;
  const body = payload.body || 'Sent you a message';
  const icon = payload.icon || '/datian-logo.svg';
  const badge = payload.badge || '/datian-logo.svg';
  const tag = payload.tag || (payload.chatId ? `chat-${payload.chatId}` : `msg-${Date.now()}`);

  // Play audio chime
  playChime();

  // Flash the document title on taskbar if page is not focused
  if (typeof document !== 'undefined' && document.hidden) {
    flashPageTitle(payload.senderName || 'Colleague');
  }

  const notificationOptions: NotificationOptions = {
    body,
    icon,
    badge,
    tag,
    data: {
      chatId: payload.chatId,
      senderName: payload.senderName,
      timestamp: payload.timestamp || new Date().toISOString()
    },
    requireInteraction: payload.requireInteraction ?? false, // Keep visible until user acts
    silent: false
  };

  try {
    // 1. Prefer Service Worker registration (most resilient for background & minimized states)
    if ('serviceWorker' in navigator) {
      const reg = serviceWorkerRegistration || (await navigator.serviceWorker.getRegistration());
      if (reg && 'showNotification' in reg) {
        await reg.showNotification(title, notificationOptions);
        return true;
      }
    }

    // 2. Fallback to standard Desktop Notification object
    const notification = new Notification(title, notificationOptions);

    notification.onclick = (event) => {
      event.preventDefault();
      try {
        window.focus();
      } catch {}
      notification.close();

      if (payload.chatId) {
        window.dispatchEvent(
          new CustomEvent('open-chat-from-notification', {
            detail: { chatId: payload.chatId }
          })
        );
      }
    };

    return true;
  } catch (err) {
    console.warn('[Desktop Notification Error]:', err);
    return false;
  }
}

/**
 * Trigger a sample test desktop notification
 */
export async function triggerTestDesktopNotification(): Promise<boolean> {
  if (Notification.permission !== 'granted') {
    const perm = await requestDesktopNotificationPermission();
    if (perm !== 'granted') return false;
  }

  return showDesktopChatMessageNotification({
    title: 'DATIAN CSR HUB • Desktop Alerts Ready',
    body: '✅ Desktop notifications are enabled! You will receive alerts when colleagues message you even if the system is minimized.',
    senderName: 'DATIAN System',
    chatId: 'general',
    requireInteraction: false
  });
}
