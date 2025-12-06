import { log } from './logger';
import * as fs from 'fs';
import * as path from 'path';

export interface DemoWhatsAppRequest {
  id: string;
  rowId: string;
  recipientName: string;
  phoneNumber: string;
  missingFields: string[];
  existingData: Record<string, string>;
  formUrl: string;
  status: 'sent' | 'clicked' | 'submitted' | 'expired';
  createdAt: Date;
  submittedAt?: Date;
  submittedData?: Record<string, string>;
}

interface StoredRequest {
  id: string;
  rowId: string;
  recipientName: string;
  phoneNumber: string;
  missingFields: string[];
  existingData: Record<string, string>;
  formUrl: string;
  status: 'sent' | 'clicked' | 'submitted' | 'expired';
  createdAt: string;
  submittedAt?: string;
  submittedData?: Record<string, string>;
}

const STORE_FILE = path.join(process.cwd(), '.demo-store.json');

class DemoStore {
  private requests: Map<string, DemoWhatsAppRequest> = new Map();
  private processedSubmissions: Set<string> = new Set();

  constructor() {
    this.loadFromDisk();
  }

  private loadFromDisk(): void {
    try {
      if (fs.existsSync(STORE_FILE)) {
        const data = fs.readFileSync(STORE_FILE, 'utf-8');
        const stored: StoredRequest[] = JSON.parse(data);
        for (const item of stored) {
          this.requests.set(item.id, {
            ...item,
            createdAt: new Date(item.createdAt),
            submittedAt: item.submittedAt ? new Date(item.submittedAt) : undefined,
          });
        }
        log.api.info('[DemoStore] Loaded from disk', { count: stored.length });
      }
    } catch (error) {
      log.api.warn('[DemoStore] Failed to load from disk', { error: String(error) });
    }
  }

  private saveToDisk(): void {
    try {
      const data: StoredRequest[] = Array.from(this.requests.values()).map(r => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
        submittedAt: r.submittedAt?.toISOString(),
      }));
      fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
      log.api.warn('[DemoStore] Failed to save to disk', { error: String(error) });
    }
  }

  createRequest(data: Omit<DemoWhatsAppRequest, 'createdAt' | 'status'>): DemoWhatsAppRequest {
    const request: DemoWhatsAppRequest = {
      ...data,
      status: 'sent',
      createdAt: new Date(),
    };
    this.requests.set(data.id, request);
    this.saveToDisk();
    log.api.info('[DemoStore] Created request', { id: data.id, rowId: data.rowId });
    return request;
  }

  getRequest(id: string): DemoWhatsAppRequest | undefined {
    return this.requests.get(id);
  }

  updateStatus(id: string, status: DemoWhatsAppRequest['status']): void {
    const request = this.requests.get(id);
    if (request) {
      request.status = status;
      this.saveToDisk();
      log.api.info('[DemoStore] Updated status', { id, status });
    }
  }

  submitForm(id: string, data: Record<string, string>): DemoWhatsAppRequest | null {
    const request = this.requests.get(id);
    if (!request) return null;
    
    request.status = 'submitted';
    request.submittedAt = new Date();
    request.submittedData = data;
    this.saveToDisk();
    
    log.api.info('[DemoStore] Form submitted', { id, data });
    return request;
  }

  getSubmittedForRow(rowId: string): DemoWhatsAppRequest | undefined {
    for (const request of this.requests.values()) {
      if (request.rowId === rowId && request.status === 'submitted') {
        return request;
      }
    }
    return undefined;
  }

  getPendingRequests(): DemoWhatsAppRequest[] {
    return Array.from(this.requests.values()).filter(
      r => r.status === 'sent' || r.status === 'clicked'
    );
  }

  getRecentlySubmitted(): DemoWhatsAppRequest[] {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return Array.from(this.requests.values()).filter(
      r => r.status === 'submitted' && 
           r.submittedAt && 
           r.submittedAt > fiveMinutesAgo &&
           !this.processedSubmissions.has(r.id)
    );
  }

  markAsProcessed(id: string): void {
    this.processedSubmissions.add(id);
    log.api.info('[DemoStore] Marked as processed', { id });
  }

  isProcessed(id: string): boolean {
    return this.processedSubmissions.has(id);
  }

  clear(): void {
    this.requests.clear();
    this.saveToDisk();
  }
}

export const demoStore = new DemoStore();

