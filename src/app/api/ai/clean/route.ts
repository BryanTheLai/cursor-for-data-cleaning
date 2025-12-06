import { NextRequest, NextResponse } from 'next/server';
import { cleanRowWithAI, cleanBatchWithAI } from '@/lib/groq';
import { log } from '@/lib/logger';

export interface CleanRowRequest {
  rowData: Record<string, string>;
  targetColumns: Array<{
    key: string;
    label: string;
    rules: string | null;
  }>;
}

export interface CleanBatchRequest {
  rows: Record<string, string>[];
  targetColumns: Array<{
    key: string;
    label: string;
    rules: string | null;
  }>;
}

export async function POST(request: NextRequest) {
  log.api.info('POST /api/ai/clean - received');
  
  try {
    const body = await request.json();
    
    const isBatch = Array.isArray(body.rows);
    
    if (isBatch) {
      const batchBody = body as CleanBatchRequest;
      
      log.api.info('Batch cleaning request', {
        rowCount: batchBody.rows.length,
        columnCount: batchBody.targetColumns.length,
      });

      if (!batchBody.rows || batchBody.rows.length === 0) {
        return NextResponse.json(
          { error: 'rows is required and must not be empty' },
          { status: 400 }
        );
      }

      const started = performance.now();
      const results = await cleanBatchWithAI(batchBody.rows, batchBody.targetColumns);
      const durationMs = Math.round(performance.now() - started);
      
      log.api.info('Batch cleaning complete', { resultCount: results.length, durationMs });
      
      return NextResponse.json({ results, durationMs });
    } else {
      const singleBody = body as CleanRowRequest;
      
      log.api.info('Single row cleaning request', {
        columnCount: singleBody.targetColumns.length,
      });

      if (!singleBody.rowData) {
        return NextResponse.json(
          { error: 'rowData is required' },
          { status: 400 }
        );
      }

      const started = performance.now();
      const result = await cleanRowWithAI(singleBody.rowData, singleBody.targetColumns);
      const durationMs = Math.round(performance.now() - started);
      
      log.api.info('Single row cleaning complete', {
        changesCount: result.changes.length,
        errorsCount: result.errors.length,
        durationMs,
      });
      
      return NextResponse.json({ ...result, durationMs });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log.api.error('Clean failed', { error: errorMessage });
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}



