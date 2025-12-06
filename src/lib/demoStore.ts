import { log } from './logger';

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

class DemoStore {
  private requests: Map<string, DemoWhatsAppRequest> = new Map();

  createRequest(data: Omit<DemoWhatsAppRequest, 'createdAt' | 'status'>): DemoWhatsAppRequest {
    const request: DemoWhatsAppRequest = {
      ...data,
      status: 'sent',
      createdAt: new Date(),
    };
    this.requests.set(data.id, request);
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
      log.api.info('[DemoStore] Updated status', { id, status });
    }
  }

  submitForm(id: string, data: Record<string, string>): DemoWhatsAppRequest | null {
    const request = this.requests.get(id);
    if (!request) return null;
    
    request.status = 'submitted';
    request.submittedAt = new Date();
    request.submittedData = data;
    
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
      r => r.status === 'submitted' && r.submittedAt && r.submittedAt > fiveMinutesAgo
    );
  }

  clear(): void {
    this.requests.clear();
  }
}

export const demoStore = new DemoStore();

