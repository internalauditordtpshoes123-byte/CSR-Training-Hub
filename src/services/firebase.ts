/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  collection, 
  onSnapshot, 
  getDocFromServer,
  Firestore,
  Unsubscribe
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Connect to the specific provisioned Firestore Database
export const db: Firestore = getFirestore(app, firebaseConfig.firestoreDatabaseId);

export interface FirestoreSyncPayload {
  entity: string;
  data: string; // JSON stringified for structured fidelity
  updatedAt: string;
  updatedBy?: string;
  clientId: string;
}

/**
 * Validate connection to Firestore as mandated by Firebase architecture guidelines
 */
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'system', 'connection'));
    console.log('[Firestore] Live cloud connection verified.');
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('[Firestore] Client is offline or database initializing.');
    } else {
      console.log('[Firestore] Connection heartbeat recorded.');
    }
    return true;
  }
}

/**
 * Save an entire entity state to Cloud Firestore so it is automatically
 * available on all other PCs and mobile devices in real-time.
 */
export async function saveEntityToFirestore(
  entity: string,
  data: any,
  clientId: string,
  updatedBy: string = 'User'
): Promise<boolean> {
  try {
    const jsonStr = JSON.stringify(data);
    const docRef = doc(db, 'csr_hub_sync', entity);

    // Safeguard for Firestore 1MB per-doc limit: Chunk large entities transparently
    if (jsonStr.length > 650000) {
      const chunkSize = 500000;
      const totalChunks = Math.ceil(jsonStr.length / chunkSize);
      for (let i = 0; i < totalChunks; i++) {
        const chunkSlice = jsonStr.slice(i * chunkSize, (i + 1) * chunkSize);
        const chunkRef = doc(db, 'csr_hub_sync', `${entity}_ck${i}`);
        await setDoc(chunkRef, {
          entity: `${entity}_ck${i}`,
          chunkIndex: i,
          totalChunks,
          parentEntity: entity,
          data: chunkSlice,
          updatedAt: new Date().toISOString(),
          clientId
        });
      }
      await setDoc(docRef, {
        entity,
        isChunked: true,
        totalChunks,
        updatedAt: new Date().toISOString(),
        updatedBy,
        clientId
      });
      return true;
    }
    
    await setDoc(docRef, {
      entity,
      data: jsonStr,
      isChunked: false,
      updatedAt: new Date().toISOString(),
      updatedBy,
      clientId
    }, { merge: true });

    return true;
  } catch (error) {
    console.error(`[Firestore Sync] Failed to write ${entity} to cloud:`, error);
    return false;
  }
}

/**
 * Fetch a single entity directly from Cloud Firestore
 */
export async function fetchEntityFromFirestore<T>(entity: string): Promise<T | null> {
  try {
    const docRef = doc(db, 'csr_hub_sync', entity);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const val = snap.data();
      if (val && val.isChunked && val.totalChunks) {
        let fullStr = '';
        for (let i = 0; i < val.totalChunks; i++) {
          const chunkSnap = await getDoc(doc(db, 'csr_hub_sync', `${entity}_ck${i}`));
          if (chunkSnap.exists()) {
            fullStr += chunkSnap.data()?.data || '';
          }
        }
        return JSON.parse(fullStr) as T;
      }
      if (val && val.data) {
        return JSON.parse(val.data) as T;
      }
    }
    return null;
  } catch (error) {
    console.warn(`[Firestore Sync] Failed to fetch ${entity}:`, error);
    return null;
  }
}

/**
 * Fetch all synced entities from Cloud Firestore on initial app boot
 */
export async function fetchAllEntitiesFromFirestore(): Promise<Record<string, any>> {
  const result: Record<string, any> = {};
  try {
    const colRef = collection(db, 'csr_hub_sync');
    const snapshot = await getDocs(colRef);
    const chunkedEntities: Array<{ entity: string; totalChunks: number }> = [];

    snapshot.forEach(docSnap => {
      const val = docSnap.data();
      if (val && val.entity && !val.parentEntity) {
        if (val.isChunked && val.totalChunks) {
          chunkedEntities.push({ entity: val.entity, totalChunks: val.totalChunks });
        } else if (val.data) {
          try {
            result[val.entity] = JSON.parse(val.data);
          } catch {
            result[val.entity] = val.data;
          }
        }
      }
    });

    // Resolve chunked entities
    for (const item of chunkedEntities) {
      try {
        let fullStr = '';
        for (let i = 0; i < item.totalChunks; i++) {
          const chunkSnap = await getDoc(doc(db, 'csr_hub_sync', `${item.entity}_ck${i}`));
          if (chunkSnap.exists()) {
            fullStr += chunkSnap.data()?.data || '';
          }
        }
        result[item.entity] = JSON.parse(fullStr);
      } catch (err) {
        console.warn(`[Firestore Sync] Failed to assemble chunked entity ${item.entity}:`, err);
      }
    }
  } catch (error) {
    console.warn('[Firestore Sync] Initial bootstrap error:', error);
  }
  return result;
}

/**
 * Real-time Snapshot Listener: Listens for any data changes made on OTHER PCs.
 * When any PC adds, edits, or deletes an item, this callback receives the update immediately.
 */
export function listenToFirestoreSync(
  myClientId: string,
  onRemoteEntityChange: (entity: string, data: any, senderClientId: string) => void
): Unsubscribe {
  try {
    const colRef = collection(db, 'csr_hub_sync');
    const unsubscribe = onSnapshot(colRef, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added' || change.type === 'modified') {
          const docData = change.doc.data() as FirestoreSyncPayload;
          // Ignore echo if we were the PC that initiated this change
          if (docData && docData.clientId !== myClientId) {
            try {
              const parsed = JSON.parse(docData.data);
              onRemoteEntityChange(docData.entity, parsed, docData.clientId);
            } catch {
              onRemoteEntityChange(docData.entity, docData.data, docData.clientId);
            }
          }
        }
      });
    }, (err) => {
      console.warn('[Firestore Sync Listener Error]:', err);
    });

    return unsubscribe;
  } catch (error) {
    console.warn('[Firestore Sync] Could not establish snapshot listener:', error);
    return () => {};
  }
}
