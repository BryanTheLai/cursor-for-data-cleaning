import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { log } from '@/lib/logger';
import { demoStore } from '@/lib/demoStore';
import { PAYROLL_RULES, getTargetSchemaFromRules } from '@/lib/rulesEngine';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uuid: string }> }
) {
  const { uuid } = await params;
  log.api.info('GET /api/form/[uuid] - received', { uuid });
  
  const demoRequest = demoStore.getRequest(uuid);
  if (demoRequest) {
    log.api.info('Demo mode - returning from demoStore', { uuid });
    
    if (demoRequest.status === 'submitted') {
      return NextResponse.json(
        { error: 'Form has already been submitted' },
        { status: 400 }
      );
    }

    if (demoRequest.status === 'sent') {
      demoStore.updateStatus(uuid, 'clicked');
    }

    const targetColumns = getTargetSchemaFromRules(PAYROLL_RULES);

    return NextResponse.json({
      requestId: uuid,
      recipientName: demoRequest.recipientName,
      workspaceName: 'Demo Workspace',
      existingData: demoRequest.existingData,
      missingFields: demoRequest.missingFields,
      targetColumns: targetColumns.map(col => ({
        key: col.key,
        label: col.label,
        type: col.type,
        required: col.required,
      })),
    });
  }

  try {
    const supabase = createServerSupabaseClient();

    const { data: whatsappRequest, error: requestError } = await supabase
      .from('whatsapp_requests')
      .select('*, spreadsheet_rows(*), workspaces(*)')
      .eq('id', uuid)
      .single();

    if (requestError || !whatsappRequest) {
      log.supabase.warn('WhatsApp request not found', { uuid, error: requestError?.message });
      return NextResponse.json(
        { error: 'Form not found or expired' },
        { status: 404 }
      );
    }

    if (whatsappRequest.status === 'submitted') {
      log.api.info('Form already submitted', { uuid });
      return NextResponse.json(
        { error: 'Form has already been submitted' },
        { status: 400 }
      );
    }

    if (whatsappRequest.status === 'expired') {
      log.api.info('Form expired', { uuid });
      return NextResponse.json(
        { error: 'Form has expired' },
        { status: 400 }
      );
    }

    if (whatsappRequest.status === 'sent') {
      await supabase
        .from('whatsapp_requests')
        .update({ status: 'clicked' })
        .eq('id', uuid);
    }

    const row = whatsappRequest.spreadsheet_rows;
    const workspace = whatsappRequest.workspaces;

    const { data: targetColumns } = await supabase
      .from('target_columns')
      .select('*')
      .eq('workspace_id', workspace.id)
      .order('sort_order');

    log.api.info('Form data retrieved', {
      uuid,
      missingFields: whatsappRequest.missing_fields,
      columnCount: targetColumns?.length || 0,
    });

    return NextResponse.json({
      requestId: uuid,
      recipientName: row.clean_data?.name || row.raw_data?.name || 'Unknown',
      workspaceName: workspace.name,
      existingData: row.clean_data || row.raw_data,
      missingFields: whatsappRequest.missing_fields,
      targetColumns: targetColumns || [],
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log.api.error('Form GET failed', { error: errorMessage });
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ uuid: string }> }
) {
  const { uuid } = await params;
  log.api.info('POST /api/form/[uuid] - received', { uuid });
  
  try {
    const body = await request.json();
    const submittedData: Record<string, string> = body.data;

    log.api.info('Form submission', { 
      uuid, 
      fieldCount: Object.keys(submittedData).length 
    });

    if (!submittedData || Object.keys(submittedData).length === 0) {
      return NextResponse.json(
        { error: 'No data submitted' },
        { status: 400 }
      );
    }

    const demoRequest = demoStore.getRequest(uuid);
    if (demoRequest) {
      log.api.info('Demo mode - submitting to demoStore', { uuid });
      
      if (demoRequest.status === 'submitted') {
        return NextResponse.json(
          { error: 'Form has already been submitted' },
          { status: 400 }
        );
      }

      demoStore.submitForm(uuid, submittedData);
      
      return NextResponse.json({
        success: true,
        message: 'Data submitted successfully',
        rowId: demoRequest.rowId,
        data: submittedData,
      });
    }

    const supabase = createServerSupabaseClient();

    const { data: whatsappRequest, error: requestError } = await supabase
      .from('whatsapp_requests')
      .select('*, spreadsheet_rows(*)')
      .eq('id', uuid)
      .single();

    if (requestError || !whatsappRequest) {
      log.supabase.warn('WhatsApp request not found for POST', { uuid });
      return NextResponse.json(
        { error: 'Form not found or expired' },
        { status: 404 }
      );
    }

    if (whatsappRequest.status === 'submitted') {
      return NextResponse.json(
        { error: 'Form has already been submitted' },
        { status: 400 }
      );
    }

    const { error: requestUpdateError } = await supabase
      .from('whatsapp_requests')
      .update({
        status: 'submitted',
        submitted_at: new Date().toISOString(),
        submitted_data: submittedData,
      })
      .eq('id', uuid);

    if (requestUpdateError) {
      log.supabase.error('Failed to update WhatsApp request', { error: requestUpdateError.message });
    }

    const row = whatsappRequest.spreadsheet_rows;
    const updatedCleanData = {
      ...row.clean_data,
      ...submittedData,
    };

    const updatedFlags = (row.flags || []).map((flag: { col: string; type: string }) => {
      if (submittedData[flag.col] && flag.type === 'red') {
        return {
          ...flag,
          type: 'purple',
          message: 'Provided via WhatsApp form',
        };
      }
      return flag;
    });

    const { error: rowUpdateError } = await supabase
      .from('spreadsheet_rows')
      .update({
        clean_data: updatedCleanData,
        flags: updatedFlags,
        whatsapp_status: 'replied',
        validation_status: 'valid',
      })
      .eq('id', row.id);

    if (rowUpdateError) {
      log.supabase.error('Failed to update row', { error: rowUpdateError.message });
      return NextResponse.json(
        { error: 'Failed to update row data' },
        { status: 500 }
      );
    }

    log.api.info('Form submission successful', { 
      uuid, 
      rowId: row.id,
      fieldsUpdated: Object.keys(submittedData),
    });

    return NextResponse.json({
      success: true,
      message: 'Data submitted successfully',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log.api.error('Form POST failed', { error: errorMessage });
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

