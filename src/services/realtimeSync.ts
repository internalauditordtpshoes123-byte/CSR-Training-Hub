/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Enterprise Multi-PC Real-Time Synchronization Engine for DATIAN CSR HUB
 * Ensures seamless bidirectional synchronization across all PCs, tablets, and sessions
 * accessing the same system link.
 */

import { 
  testFirestoreConnection, 
  saveEntityToFirestore, 
  fetchAllEntitiesFromFirestore, 
  listenToFirestoreSync 
} from './firebase';

export type SyncConnectionStatus = 'connected' | 'connecting' | 'offline' | 'syncing';

export interface SyncEvent {
  type: string;
  entity: string;
  data: any;
  senderClientId?: string;
  timestamp: string;
}

// Persistent Unique Client ID for this browser/PC instance
export function getClientId(): string {
  let id = localStorage.getItem('csr_hub_client_id');
  if (!id) {
    id = `pc_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    localStorage.setItem('csr_hub_client_id', id);
  }
  return id;
}

// Event Listeners for incoming real-time broadcasts
type SyncListener = (event: SyncEvent) => void;
type StatusListener = (status: SyncConnectionStatus, peerCount: number) => void;

const syncListeners = new Set<SyncListener>();
const statusListeners = new Set<StatusListener>();

let eventSource: EventSource | null = null;
let currentStatus: SyncConnectionStatus = 'offline';
let connectedPeerCount = 1;
let reconnectTimer: any = null;
let isInitialized = false;

// Offline Sync Queue for pending changes during temporary network disconnect
const OFFLINE_QUEUE_KEY = 'csr_hub_offline_sync_queue';

function getOfflineQueue(): Array<{ entity: string; data: any; action: string; timestamp: number }> {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setOfflineQueue(queue: Array<{ entity: string; data: any; action: string; timestamp: number }>) {
  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.warn('[Sync Queue] Error saving offline queue:', e);
  }
}

function enqueueOfflineChange(entity: string, data: any, action: string = 'update') {
  const queue = getOfflineQueue();
  // Deduplicate by entity
  const filtered = queue.filter(item => item.entity !== entity);
  filtered.push({ entity, data, action, timestamp: Date.now() });
  setOfflineQueue(filtered);
}

// Update and notify status change
function updateStatus(newStatus: SyncConnectionStatus, peerCount = connectedPeerCount) {
  currentStatus = newStatus;
  connectedPeerCount = peerCount;
  statusListeners.forEach(listener => listener(newStatus, peerCount));
}

let unsubscribeFirestore: (() => void) | null = null;

/**
 * Initialize Master Real-Time SSE Stream & Cloud Firestore with Automatic Reconnect
 */
export function initRealtimeSync(): () => void {
  if (isInitialized && (eventSource || unsubscribeFirestore)) {
    return () => {};
  }
  isInitialized = true;
  const clientId = getClientId();

  // Test and initialize live Cloud Firestore connection
  testFirestoreConnection().catch(e => console.warn('[Firestore Heartbeat Catch]:', e));

  // Listen to Firestore real-time snapshots from other PCs
  try {
    unsubscribeFirestore = listenToFirestoreSync(clientId, (entity, data, senderClientId) => {
      try {
        console.log(`[Firestore Realtime Push Received] Entity: ${entity} from remote PC: ${senderClientId}`);
        try {
          localStorage.setItem(`csr_cached_${entity}`, JSON.stringify(data));
        } catch {}

        syncListeners.forEach(listener => {
          try {
            listener({
              type: 'ENTITY_UPDATED',
              entity,
              data,
              senderClientId,
              timestamp: new Date().toISOString()
            });
          } catch (err) {
            console.error('[Sync Listener Error]:', err);
          }
        });
        updateStatus('connected');
      } catch (err) {
        console.warn('[Firestore Sync Event Processing Error]:', err);
      }
    });
  } catch (e) {
    console.warn('[Firestore Realtime Setup Warning]:', e);
  }

  const connect = () => {
    if (typeof window === 'undefined') return;

    if (eventSource) {
      try { eventSource.close(); } catch {}
      eventSource = null;
    }

    updateStatus('connecting');
    const streamUrl = `/api/realtime/stream?clientId=${encodeURIComponent(clientId)}`;

    try {
      eventSource = new EventSource(streamUrl);

      eventSource.onopen = () => {
        updateStatus('connected');
        console.log('[Realtime Sync] Connected to master synchronization stream.');
        // Process any queued offline changes
        flushOfflineQueue();
      };

      eventSource.onmessage = (e) => {
        try {
          if (!e.data || e.data.startsWith(':')) return; // Ignore ping
          const payload: SyncEvent = JSON.parse(e.data);

          // Handle system status messages
          if (payload.type === 'PEER_COUNT_UPDATED' && payload.data?.connectedCount) {
            updateStatus('connected', payload.data.connectedCount);
          } else if (payload.type === 'CONNECTED' && payload.data?.connectedClients) {
            updateStatus('connected', payload.data.connectedClients);
          }

          // Ignore echoes sent by this own client
          if (payload.senderClientId && payload.senderClientId === getClientId()) {
            return;
          }

          // Broadcast to all local listeners
          syncListeners.forEach(listener => {
            try { listener(payload); } catch (err) { console.error('[Sync Listener Error]:', err); }
          });
        } catch (err) {
          console.warn('[Realtime Sync] Error parsing incoming event:', err);
        }
      };

      eventSource.onerror = () => {
        updateStatus('offline');
        if (eventSource) {
          try { eventSource.close(); } catch {}
          eventSource = null;
        }

        // Schedule auto-reconnect with 3s backoff
        clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(() => {
          connect();
        }, 3000);
      };
    } catch (err) {
      console.warn('[Realtime Sync] Connection failed:', err);
      updateStatus('offline');
      clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(connect, 4000);
    }
  };

  connect();

  // Listen to browser online/offline events
  const handleOnline = () => {
    console.log('[Network] Browser online, reconnecting realtime sync...');
    connect();
  };
  const handleOffline = () => {
    console.log('[Network] Browser offline.');
    updateStatus('offline');
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
    if (unsubscribeFirestore) {
      unsubscribeFirestore();
      unsubscribeFirestore = null;
    }
    isInitialized = false;
  };
}

/**
 * Flush pending offline changes to Cloud Firestore & Server
 */
export async function flushOfflineQueue() {
  const queue = getOfflineQueue();
  if (queue.length === 0) return;

  updateStatus('syncing');
  console.log(`[Realtime Sync] Flushing ${queue.length} offline queued changes to Cloud Firestore & server...`);

  const remaining: typeof queue = [];
  const clientId = getClientId();

  for (const item of queue) {
    try {
      const fsPromise = saveEntityToFirestore(item.entity, item.data, clientId).catch(() => false);
      const serverPromise = fetch('/api/sync/entity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-ID': clientId
        },
        body: JSON.stringify({
          entity: item.entity,
          data: item.data,
          action: item.action,
          senderClientId: clientId
        })
      }).then(r => r.ok).catch(() => false);

      const [fsOk, serverOk] = await Promise.all([fsPromise, serverPromise]);
      if (!fsOk && !serverOk) {
        remaining.push(item);
      }
    } catch {
      remaining.push(item);
    }
  }

  setOfflineQueue(remaining);
  updateStatus(remaining.length === 0 ? 'connected' : 'offline');
}

/**
 * Subscribe to Real-Time incoming updates
 */
export function subscribeToRealtimeSync(listener: SyncListener): () => void {
  syncListeners.add(listener);
  return () => {
    syncListeners.delete(listener);
  };
}

/**
 * Subscribe to connection status changes
 */
export function subscribeToSyncStatus(listener: StatusListener): () => void {
  statusListeners.add(listener);
  // Send immediate current state
  listener(currentStatus, connectedPeerCount);
  return () => {
    statusListeners.delete(listener);
  };
}

/**
 * Helper to get authentication headers with role and section boundary
 */
export function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'X-Client-ID': getClientId()
  };
  try {
    const token = localStorage.getItem('tms_auth_token') || localStorage.getItem('csr_hub_session_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      headers['X-User-Token'] = token;
    }
    const stored = localStorage.getItem('tms_auth_employee') || localStorage.getItem('csr_hub_auth_employee');
    if (stored) {
      const emp = JSON.parse(stored);
      if (emp.role) headers['X-User-Role'] = emp.role;
      if (emp.assignedSection || emp.section) {
        headers['X-User-Section'] = emp.assignedSection || emp.section;
      }
      if (emp.department) headers['X-User-Department'] = emp.department;
      if (emp.id || emp.employeeNo) headers['X-User-ID'] = String(emp.id || emp.employeeNo);
    }
  } catch {}
  return headers;
}

/**
 * Fetch Master Database Bootstrap on startup (Cloud Firestore + Server)
 */
export async function fetchMasterBootstrap(): Promise<any | null> {
  const clientId = getClientId();
  const headers = getAuthHeaders();
  let serverData: any = null;
  let firestoreData: Record<string, any> = {};

  try {
    const [srvResult, fsResult] = await Promise.allSettled([
      fetch('/api/sync/bootstrap', { headers }).then(r => r.ok ? r.json() : null),
      fetchAllEntitiesFromFirestore()
    ]);

    if (srvResult.status === 'fulfilled' && srvResult.value && srvResult.value.data) {
      serverData = srvResult.value.data;
    }
    if (fsResult.status === 'fulfilled' && fsResult.value) {
      firestoreData = fsResult.value;
    }
  } catch (err) {
    console.warn('[Sync Bootstrap Catch]:', err);
  }

  const combined: Record<string, any> = { ...(serverData || {}) };

  // Merge Cloud Firestore entities (these have persistent global durability across all PCs)
  for (const [entityKey, entityVal] of Object.entries(firestoreData)) {
    if (entityVal !== undefined && entityVal !== null) {
      combined[entityKey] = entityVal;
    }
  }

  if (Object.keys(combined).length > 0) {
    updateStatus('connected');
    return combined;
  }

  return null;
}

/**
 * Synchronize Entity Change to Cloud Firestore & Server and Broadcast to all connected PCs
 */
export async function syncEntityToMaster(entity: string, data: any, action: string = 'update'): Promise<boolean> {
  const clientId = getClientId();

  // Optimistically store in local cache
  try {
    localStorage.setItem(`csr_cached_${entity}`, JSON.stringify(data));
  } catch (e) {
    console.warn('[Local Cache] Could not cache entity:', e);
  }

  try {
    updateStatus('syncing');

    // 1. Immediately push to Cloud Firestore
    const firestorePromise = saveEntityToFirestore(entity, data, clientId).catch(err => {
      console.warn(`[Firestore Sync Error for ${entity}]:`, err);
      return false;
    });

    // 2. Simultaneously broadcast via local server / SSE broadcaster
    const serverPromise = fetch('/api/sync/entity', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-ID': clientId
      },
      body: JSON.stringify({
        entity,
        data,
        action,
        senderClientId: clientId
      })
    }).then(r => r.ok).catch(() => false);

    const [fsOk, srvOk] = await Promise.all([firestorePromise, serverPromise]);

    if (fsOk || srvOk) {
      updateStatus('connected');
      return true;
    } else {
      throw new Error('Both Cloud Firestore and server sync failed');
    }
  } catch (err) {
    console.warn(`[Sync Entity] Failed to sync ${entity} online, queueing offline:`, err);
    enqueueOfflineChange(entity, data, action);
    updateStatus('offline');
    return false;
  }
}

/**
 * Upload Shared File to Server & Broadcast to all PCs
 */
export async function uploadSharedFileToServer(fileData: {
  id?: string;
  fileName: string;
  fileType?: string;
  fileSize?: string;
  mimeType?: string;
  dataUrl: string;
  folderId?: string;
  category?: string;
  description?: string;
  uploadedBy?: string;
}): Promise<{ success: boolean; file?: any; downloadUrl?: string; previewUrl?: string; error?: string }> {
  try {
    updateStatus('syncing');
    const clientId = getClientId();
    const response = await fetch('/api/files/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-ID': clientId
      },
      body: JSON.stringify({
        ...fileData,
        senderClientId: clientId
      })
    });

    if (!response.ok) {
      throw new Error(`Upload failed with status: ${response.status}`);
    }

    const resJson = await response.json();
    updateStatus('connected');
    return resJson;
  } catch (err: any) {
    console.error('[Shared File Upload Error]:', err);
    updateStatus('offline');
    return { success: false, error: err.message || 'Upload failed' };
  }
}

/**
 * Delete Shared File from Server & Broadcast to all PCs
 */
export async function deleteSharedFileFromServer(fileId: string): Promise<boolean> {
  try {
    updateStatus('syncing');
    const clientId = getClientId();
    const response = await fetch(`/api/files/${encodeURIComponent(fileId)}`, {
      method: 'DELETE',
      headers: {
        'X-Client-ID': clientId
      }
    });

    if (response.ok) {
      updateStatus('connected');
      return true;
    }
    return false;
  } catch (err) {
    console.error('[Delete Shared File Error]:', err);
    updateStatus('offline');
    return false;
  }
}

/**
 * Record and broadcast an audit trail event across all connected PCs
 */
export async function logAuditEventToServer(log: {
  user: string;
  role: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'UPLOAD' | 'DOWNLOAD' | 'LOGIN' | 'REVERT';
  module: string;
  details: string;
  recordId?: string;
}): Promise<boolean> {
  try {
    const clientId = getClientId();
    const res = await fetch('/api/audit/log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-ID': clientId
      },
      body: JSON.stringify({
        ...log,
        senderClientId: clientId
      })
    });
    return res.ok;
  } catch (err) {
    console.warn('[Audit Log] Failed to push audit log:', err);
    return false;
  }
}

/**
 * Fetch master audit trail logs from cloud database
 */
export async function fetchAuditLogsFromServer(): Promise<any[]> {
  try {
    const res = await fetch('/api/audit/logs', {
      headers: {
        'X-Client-ID': getClientId()
      }
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.logs || [];
  } catch {
    return [];
  }
}

/**
 * Fetch spreadsheet data from cloud database
 */
export async function fetchSpreadsheetFromServer(key: string): Promise<any | null> {
  try {
    const res = await fetch(`/api/spreadsheets/${encodeURIComponent(key)}`, {
      headers: {
        'X-Client-ID': getClientId()
      }
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data || null;
  } catch {
    return null;
  }
}

/**
 * Sync spreadsheet data to cloud database and broadcast to other PCs
 */
export async function syncSpreadsheetToServer(key: string, data: any): Promise<boolean> {
  try {
    const clientId = getClientId();
    const res = await fetch(`/api/spreadsheets/${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-ID': clientId
      },
      body: JSON.stringify({
        data,
        senderClientId: clientId
      })
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Employee Data-Based Authentication against Server Master Directory
 */
export async function loginWithEmployeeCredentials(
  fullName: string,
  password: string,
  employeeId?: string
): Promise<{ success: boolean; token?: string; employee?: any; error?: string }> {
  try {
    const clientId = getClientId();
    const res = await fetch('/api/auth/employee-login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-ID': clientId
      },
      body: JSON.stringify({
        fullName: fullName.trim(),
        password: password.trim(),
        employeeNo: password.trim(),
        employeeId: employeeId ? String(employeeId).trim() : undefined,
        clientId
      })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return {
        success: false,
        error: data.error || 'Invalid password. Please check your password and try again.'
      };
    }

    // Securely cache session token and employee metadata for authenticated RBAC requests
    if (data.token) {
      try {
        localStorage.setItem('tms_auth_token', data.token);
        localStorage.setItem('csr_hub_session_token', data.token);
      } catch {}
    }
    if (data.employee) {
      try {
        localStorage.setItem('tms_auth_employee', JSON.stringify(data.employee));
        localStorage.setItem('csr_hub_auth_employee', JSON.stringify(data.employee));
      } catch {}
    }

    return {
      success: true,
      token: data.token,
      employee: data.employee
    };
  } catch (err: any) {
    return {
      success: false,
      error: 'Unable to connect to Master Authentication Server. Please check your network connection.'
    };
  }
}

/**
 * Fetch a single employee by ID from the server with RBAC checks
 */
export async function fetchEmployeeById(employeeId: string): Promise<{ success: boolean; employee?: any; error?: string }> {
  try {
    const headers = getAuthHeaders();
    const res = await fetch(`/api/employees/${encodeURIComponent(employeeId)}`, {
      headers
    });
    const data = await res.json();
    return data;
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error looking up employee.' };
  }
}

/**
 * Log out active employee and clear server presence
 */
export async function logoutEmployeeSession(employeeId: string): Promise<boolean> {
  try {
    const clientId = getClientId();
    const res = await fetch('/api/auth/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-ID': clientId
      },
      body: JSON.stringify({
        employeeId,
        clientId
      })
    });
    return res.ok;
  } catch (err) {
    console.warn('[Auth Logout Error]:', err);
    return false;
  }
}

/**
 * Permanently save company logo across server, Firestore, and localStorage
 */
export async function saveCompanyLogoPermanently(logoData: string): Promise<{ success: boolean; logo?: string; error?: string }> {
  try {
    const clientId = getClientId();
    // 1. Cache locally
    try {
      localStorage.setItem('tms_company_logo', logoData);
    } catch {}

    // 2. Push to Firestore
    saveEntityToFirestore('companyLogo', logoData, clientId).catch(() => false);

    // 3. Post to Server API
    const res = await fetch('/api/company-logo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-ID': clientId
      },
      body: JSON.stringify({
        logoData,
        senderClientId: clientId
      })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'Failed to save logo to server.' };
    }

    return { success: true, logo: data.logo || logoData };
  } catch (err: any) {
    console.error('[Save Logo Permanently Error]:', err);
    return { success: false, error: err.message || 'Network error saving logo.' };
  }
}

/**
 * Reset company logo back to official DA TIAN logo
 */
export async function resetCompanyLogoPermanently(): Promise<{ success: boolean; logo?: string; error?: string }> {
  try {
    const clientId = getClientId();
    try {
      localStorage.removeItem('tms_company_logo');
    } catch {}

    saveEntityToFirestore('companyLogo', '/datian-logo.svg', clientId).catch(() => false);

    const res = await fetch('/api/company-logo/reset', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-ID': clientId
      },
      body: JSON.stringify({ senderClientId: clientId })
    });

    const data = await res.json();
    return { success: true, logo: data.logo || '/datian-logo.svg' };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Save / Update employee record permanently without duplicates
 */
export async function saveEmployeePermanently(employee: any): Promise<{ success: boolean; employee?: any; error?: string }> {
  try {
    const clientId = getClientId();
    const headers = {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    };
    const res = await fetch('/api/employees/save', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        employee,
        senderClientId: clientId
      })
    });

    const data = await res.json();
    return data;
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Send presence heartbeat for authenticated employee
 */
export async function sendPresenceHeartbeat(
  employee: any,
  status: 'online' | 'away' = 'online'
): Promise<any[]> {
  try {
    const clientId = getClientId();
    const res = await fetch('/api/presence/heartbeat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-ID': clientId
      },
      body: JSON.stringify({
        employee,
        clientId,
        status
      })
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.onlineUsers || [];
  } catch {
    return [];
  }
}

/**
 * Fetch list of currently online employees
 */
export async function fetchOnlinePresenceList(): Promise<any[]> {
  try {
    const res = await fetch('/api/presence/online', {
      headers: {
        'X-Client-ID': getClientId()
      }
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.onlineUsers || [];
  } catch {
    return [];
  }
}

/**
 * Send chat message to server and broadcast in real time
 */
export async function sendChatMessage(
  chatId: string,
  message: any
): Promise<boolean> {
  try {
    const clientId = getClientId();
    const res = await fetch('/api/chat/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-ID': clientId,
        'X-Employee-ID': message.senderId || '',
        'X-Employee-No': message.senderEmployeeNo || ''
      },
      body: JSON.stringify({
        chatId,
        message,
        senderClientId: clientId
      })
    });
    return res.ok;
  } catch (err) {
    console.warn('[Chat Send Error]:', err);
    return false;
  }
}

/**
 * Upload an image attachment and send as a chat message in real time
 */
export async function uploadChatImageToServer(payload: {
  chatId: string;
  fileName: string;
  fileType: string;
  dataUrl: string;
  senderId: string;
  senderName: string;
  senderEmployeeNo?: string;
  senderDepartment?: string;
  senderPosition?: string;
  senderAvatar?: string;
  senderRole?: string;
  recipientId?: string;
  recipientEmployeeNo?: string;
  recipientName?: string;
  caption?: string;
}): Promise<{ success: boolean; message?: any; error?: string }> {
  try {
    const clientId = getClientId();
    const res = await fetch('/api/chat/upload-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-ID': clientId,
        'X-Employee-ID': payload.senderId || '',
        'X-Employee-No': payload.senderEmployeeNo || ''
      },
      body: JSON.stringify({
        ...payload,
        senderClientId: clientId
      })
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      return { success: false, error: json.error || 'Failed to upload image' };
    }
    return { success: true, message: json.message };
  } catch (err: any) {
    console.error('[Chat Image Upload Error]:', err);
    return { success: false, error: err.message || 'Network error during image upload' };
  }
}

/**
 * Fetch messages for a specific chat channel or DM with privacy checks
 */
export async function fetchChatMessages(
  chatId: string,
  userAuth?: { id?: string; employeeNo?: string; role?: string }
): Promise<any[]> {
  try {
    const headers: Record<string, string> = {
      'X-Client-ID': getClientId()
    };
    if (userAuth?.id) headers['X-Employee-ID'] = userAuth.id;
    if (userAuth?.employeeNo) headers['X-Employee-No'] = userAuth.employeeNo;
    if (userAuth?.role) headers['X-User-Role'] = userAuth.role;

    const res = await fetch(`/api/chat/messages/${encodeURIComponent(chatId)}`, {
      headers
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.messages || [];
  } catch {
    return [];
  }
}

/**
 * Mark messages in a chat as seen / read and broadcast to other clients in real time
 */
export async function markChatMessagesAsRead(
  chatId: string,
  reader: { id?: string; employeeNo?: string; name?: string },
  messageIds?: string[]
): Promise<boolean> {
  try {
    const clientId = getClientId();
    const res = await fetch('/api/chat/messages/read', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-ID': clientId
      },
      body: JSON.stringify({
        chatId,
        readerId: reader.id || '',
        readerEmployeeNo: reader.employeeNo || '',
        readerName: reader.name || '',
        messageIds,
        senderClientId: clientId
      })
    });
    return res.ok;
  } catch (err) {
    console.warn('[Mark Read Error]:', err);
    return false;
  }
}

/**
 * Delete / Clear all messages in a conversation
 */
export async function deleteChatConversation(
  chatId: string,
  userAuth?: { id?: string; employeeNo?: string; role?: string }
): Promise<boolean> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Client-ID': getClientId()
    };
    if (userAuth?.id) headers['X-Employee-ID'] = userAuth.id;
    if (userAuth?.employeeNo) headers['X-Employee-No'] = userAuth.employeeNo;
    if (userAuth?.role) headers['X-User-Role'] = userAuth.role;

    const res = await fetch(`/api/chat/conversations/${encodeURIComponent(chatId)}`, {
      method: 'DELETE',
      headers
    });
    return res.ok;
  } catch (err) {
    console.warn('[Delete Conversation Error]:', err);
    return false;
  }
}

/**
 * Toggle emoji reaction on a message
 */
export async function toggleChatMessageReaction(
  chatId: string,
  messageId: string,
  emoji: string,
  userId: string
): Promise<{ success: boolean; reactions?: Record<string, number>; reactedUsers?: Record<string, string[]> }> {
  try {
    const clientId = getClientId();
    const res = await fetch('/api/chat/messages/react', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-ID': clientId
      },
      body: JSON.stringify({
        chatId,
        messageId,
        emoji,
        userId,
        senderClientId: clientId
      })
    });
    const json = await res.json();
    return json;
  } catch (err) {
    console.warn('[React Message Error]:', err);
    return { success: false };
  }
}

/**
 * Helper to get current connection status
 */
export function getCurrentSyncStatus() {
  return {
    status: currentStatus,
    peerCount: connectedPeerCount,
    clientId: getClientId(),
    pendingQueueCount: getOfflineQueue().length
  };
}
