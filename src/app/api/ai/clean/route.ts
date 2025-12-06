import { NextRequest, NextResponse } from 'next/server';
import { cleanRowWithAI, cleanBatchWithAI } from '@/lib/groq';
import { log } from '@/lib/logger';
import { createServerSupabaseClient } from '@/lib/supabase';
import { PAYROLL_RULES, getTargetSchemaFromRules } from '@/lib/rulesEngine';

export interface CleanRowRequest {
  rowData: Record<string, string>;
  targetColumns?: Array<{
    key: string;
    label: string;
    rules: string | null;
  }>;
  workspaceId?: string;
}

export interface CleanBatchRequest {
  rows: Record<string, string>[];
  targetColumns?: Array<{
    key: string;
    label: string;
    rules: string | null;
  }>;
  workspaceId?: string;
}

type TargetColumn = {
  key: string;
  label: string;
  rules: string | null;
};

async function loadTargetColumns(workspaceId?: string): Promise<TargetColumn[]> {
  if (!workspaceId) {
    return getTargetSchemaFromRules(PAYROLL_RULES).map((col) => ({
      key: col.key,
      label: col.label,
      rules: col.rules,
    }));
  }

  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('target_columns')
      .select('key,label,rules,sort_order')
      .eq('workspace_id', workspaceId)
      .order('sort_order');

    if (error || !data || data.length === 0) {
      return getTargetSchemaFromRules(PAYROLL_RULES).map((col) => ({
        key: col.key,
        label: col.label,
        rules: col.rules,
      }));
    }

    return data.map((row) => ({
      key: row.key,
      label: row.label,
      rules: row.rules ?? null,
    }));
  } catch (err) {
    log.api.warn('Falling back to default rules for cleaning', {
      workspaceId,
      error: err instanceof Error ? err.message : String(err),
    });
    return getTargetSchemaFromRules(PAYROLL_RULES).map((col) => ({
      key: col.key,
      label: col.label,
      rules: col.rules,
    }));
  }
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
        columnCount: batchBody.targetColumns?.length ?? 0,
      });

      if (!batchBody.rows || batchBody.rows.length === 0) {
        return NextResponse.json(
          { error: 'rows is required and must not be empty' },
          { status: 400 }
        );
      }

      const targetColumns = (batchBody.targetColumns && batchBody.targetColumns.length > 0)
        ? batchBody.targetColumns
        : await loadTargetColumns(batchBody.workspaceId);

      const started = performance.now();
      const results = await cleanBatchWithAI(batchBody.rows, targetColumns);
      const durationMs = Math.round(performance.now() - started);
      
      log.api.info('Batch cleaning complete', { resultCount: results.length, durationMs });
      
      return NextResponse.json({ results, durationMs });
    } else {
      const singleBody = body as CleanRowRequest;
      
      log.api.info('Single row cleaning request', {
        columnCount: singleBody.targetColumns?.length ?? 0,
      });

      if (!singleBody.rowData) {
        return NextResponse.json(
          { error: 'rowData is required' },
          { status: 400 }
        );
      }

      const targetColumns = (singleBody.targetColumns && singleBody.targetColumns.length > 0)
        ? singleBody.targetColumns
        : await loadTargetColumns(singleBody.workspaceId);

      const started = performance.now();
      const result = await cleanRowWithAI(singleBody.rowData, targetColumns);
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




