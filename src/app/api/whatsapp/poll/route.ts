import { NextRequest, NextResponse } from 'next/server';
import { demoStore } from '@/lib/demoStore';
import { log } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const rowId = request.nextUrl.searchParams.get('rowId');
  
  log.api.info('GET /api/whatsapp/poll', { rowId });
  
  if (rowId) {
    const submitted = demoStore.getSubmittedForRow(rowId);
    if (submitted && submitted.submittedData) {
      return NextResponse.json({
        hasUpdate: true,
        rowId: submitted.rowId,
        data: submitted.submittedData,
        requestId: submitted.id,
        submittedAt: submitted.submittedAt?.toISOString(),
      });
    }
    return NextResponse.json({ hasUpdate: false });
  }
  
  const recentlySubmitted = demoStore.getRecentlySubmitted();
  
  if (recentlySubmitted.length > 0) {
    recentlySubmitted.forEach(r => demoStore.markAsProcessed(r.id));
    
    return NextResponse.json({
      hasUpdates: true,
      submissions: recentlySubmitted.map(r => ({
        rowId: r.rowId,
        requestId: r.id,
        data: r.submittedData,
        submittedAt: r.submittedAt?.toISOString(),
      })),
    });
  }
  
  return NextResponse.json({ hasUpdates: false, submissions: [] });
}

