import { syncDataToCloud, SyncPayload } from './firebaseService';

export interface LocalRecord<T> {
  id: string;
  data: T;
  syncPending: boolean;
  collection: string;
}

export class SyncManager {
  private static getKey(collection: string) {
    return `sync_store_${collection}`;
  }

  static getRecords<T>(collection: string): LocalRecord<T>[] {
    if (typeof window === 'undefined') return [];
    const saved = localStorage.getItem(this.getKey(collection));
    return saved ? JSON.parse(saved) : [];
  }

  static saveRecords<T>(collection: string, records: LocalRecord<T>[]) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.getKey(collection), JSON.stringify(records));
    }
  }

  static async saveRecord<T>(collection: string, data: T, id?: string): Promise<LocalRecord<T>> {
    const recordId = id || crypto.randomUUID();
    const isOnline = navigator.onLine;
    
    let record: LocalRecord<T> = {
      id: recordId,
      data,
      syncPending: !isOnline,
      collection,
    };

    const records = this.getRecords<T>(collection);
    const existingIndex = records.findIndex(r => r.id === recordId);
    
    if (existingIndex >= 0) {
      records[existingIndex] = record;
    } else {
      records.push(record);
    }
    
    this.saveRecords(collection, records);

    if (isOnline) {
      try {
        await syncDataToCloud({ id: recordId, collection, data });
        // Update pending flag locally upon success
        const updatedRecords = this.getRecords<T>(collection);
        const idx = updatedRecords.findIndex(r => r.id === recordId);
        if (idx >= 0) {
          updatedRecords[idx].syncPending = false;
          this.saveRecords(collection, updatedRecords);
        }
      } catch (error) {
        console.error("Cloud sync failed despite being online, flagging for later:", error);
        const updatedRecords = this.getRecords<T>(collection);
        const idx = updatedRecords.findIndex(r => r.id === recordId);
        if (idx >= 0) {
          updatedRecords[idx].syncPending = true;
          this.saveRecords(collection, updatedRecords);
        }
      }
    }

    return record;
  }

  static async backgroundSync() {
    console.log("Running background sync...");
    // Let's iterate through known collections
    const collections = ['flashcards', 'errorLedger'];
    for (const collection of collections) {
      const records = this.getRecords<any>(collection);
      const pendingRecords = records.filter(r => r.syncPending);
      
      for (const record of pendingRecords) {
        try {
          await syncDataToCloud({ id: record.id, collection, data: record.data });
          record.syncPending = false;
        } catch (error) {
          console.error(`Failed background sync for ${record.id}`, error);
        }
      }
      this.saveRecords(collection, records);
    }
  }
}
