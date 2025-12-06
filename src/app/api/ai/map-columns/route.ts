import { NextRequest, NextResponse } from 'next/server';
import { mapColumnsWithAI } from '@/lib/groq';
import { log } from '@/lib/logger';

export interface MapColumnsRequest {
  sourceHeaders: string[];
  sampleRows: Record<string, string>[];
  targetSchema: Array<{
    key: string;
    label: string;
    type: string;
    required: boolean;
  }>;
}

export async function POST(request: NextRequest) {
  log.api.info('POST /api/ai/map-columns - received');
  
  try {
    const body: MapColumnsRequest = await request.json();
    
    log.api.info('Request body', {
      sourceHeaderCount: body.sourceHeaders.length,
      sampleRowCount: body.sampleRows.length,
      targetColumnCount: body.targetSchema.length,
    });

    if (!body.sourceHeaders || body.sourceHeaders.length === 0) {
      log.api.warn('No source headers provided');
      return NextResponse.json(
        { error: 'sourceHeaders is required and must not be empty' },
        { status: 400 }
      );
    }

    if (!body.sampleRows || body.sampleRows.length === 0) {
      log.api.warn('No sample rows provided');
      return NextResponse.json(
        { error: 'sampleRows is required and must not be empty' },
        { status: 400 }
      );
    }

    if (!body.targetSchema || body.targetSchema.length === 0) {
      log.api.warn('No target schema provided');
      return NextResponse.json(
        { error: 'targetSchema is required and must not be empty' },
        { status: 400 }
      );
    }

    const started = performance.now();

    const result = await mapColumnsWithAI(
      body.sourceHeaders,
      body.sampleRows,
      body.targetSchema
    );

    const durationMs = Math.round(performance.now() - started);

    log.api.info('Mapping complete', {
      mappedCount: Object.values(result.mappings).filter(v => v !== null).length,
      unmappedCount: Object.values(result.mappings).filter(v => v === null).length,
      durationMs,
    });

    return NextResponse.json({ ...result, durationMs });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log.api.error('Map columns failed', { error: errorMessage });
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}




