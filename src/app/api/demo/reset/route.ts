import { NextResponse } from 'next/server';
import { demoStore } from '@/lib/demoStore';
import { log } from '@/lib/logger';

export async function POST() {
  log.api.info('POST /api/demo/reset - clearing demo store');
  
  demoStore.clear();
  
  return NextResponse.json({ success: true, message: 'Demo store cleared' });
}
