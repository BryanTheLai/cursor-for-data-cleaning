import { NextRequest, NextResponse } from 'next/server';
import { sendWhatsAppMessage, buildFormLink, buildWhatsAppMessage } from '@/lib/twilio';
import { createServerSupabaseClient } from '@/lib/supabase';
import { log } from '@/lib/logger';
import { v4 as uuidv4 } from 'uuid';

export interface SendWhatsAppRequest {
  workspaceId: string;
  rowId: string;
  phoneNumber: string;
  recipientName: string;
  missingFields: string[];
}

export async function POST(request: NextRequest) {
  log.api.info('POST /api/whatsapp/send - received');
  
  try {
    const body: SendWhatsAppRequest = await request.json();
    
    log.whatsapp.info('WhatsApp send request', {
      workspaceId: body.workspaceId,
      rowId: body.rowId,
      phoneNumber: body.phoneNumber?.slice(-4),
      missingFields: body.missingFields,
    });

    if (!body.phoneNumber) {
      return NextResponse.json(
        { error: 'phoneNumber is required' },
        { status: 400 }
      );
    }

    if (!body.missingFields || body.missingFields.length === 0) {
      return NextResponse.json(
        { error: 'missingFields is required and must not be empty' },
        { status: 400 }
      );
    }

    const requestId = uuidv4();
    const formLink = buildFormLink(requestId);
    const message = buildWhatsAppMessage(
      body.recipientName || 'there',
      body.missingFields,
      formLink
    );

    log.whatsapp.info('Built message', { 
      requestId, 
      formLink,
      messageLength: message.length 
    });

    const supabase = createServerSupabaseClient();

    const { data: whatsappRequest, error: insertError } = await supabase
      .from('whatsapp_requests')
      .insert({
        id: requestId,
        workspace_id: body.workspaceId,
        row_id: body.rowId,
        phone_number: body.phoneNumber,
        missing_fields: body.missingFields,
        status: 'sent',
        form_url: formLink,
      })
      .select()
      .single();

    if (insertError) {
      log.supabase.error('Failed to insert WhatsApp request', { error: insertError.message });
      return NextResponse.json(
        { error: 'Failed to create WhatsApp request record' },
        { status: 500 }
      );
    }

    log.supabase.info('WhatsApp request record created', { requestId });

    const { error: updateError } = await supabase
      .from('spreadsheet_rows')
      .update({
        whatsapp_status: 'sent',
        whatsapp_thread_id: requestId,
      })
      .eq('id', body.rowId);

    if (updateError) {
      log.supabase.warn('Failed to update row WhatsApp status', { error: updateError.message });
    }

    const result = await sendWhatsAppMessage(body.phoneNumber, message);

    if (!result.success) {
      log.whatsapp.error('Twilio send failed', { error: result.error });
      
      await supabase
        .from('whatsapp_requests')
        .update({ status: 'expired' })
        .eq('id', requestId);

      return NextResponse.json(
        { error: result.error || 'Failed to send WhatsApp message' },
        { status: 500 }
      );
    }

    log.whatsapp.info('WhatsApp sent successfully', { 
      requestId,
      messageSid: result.messageSid 
    });

    return NextResponse.json({
      success: true,
      requestId,
      formLink,
      messageSid: result.messageSid,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log.api.error('WhatsApp send failed', { error: errorMessage });
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

