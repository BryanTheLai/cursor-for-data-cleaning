import { NextRequest, NextResponse } from 'next/server';
import { sendWhatsAppMessage, buildFormLink, buildWhatsAppMessage, buildPaymentDetailsMessage, isTwilioConfigured } from '@/lib/twilio';
import { createServerSupabaseClient } from '@/lib/supabase';
import { log } from '@/lib/logger';
import { v4 as uuidv4 } from 'uuid';
import { demoStore } from '@/lib/demoStore';

export interface SendWhatsAppRequest {
  workspaceId: string;
  rowId: string;
  phoneNumber: string;
  recipientName: string;
  missingFields: string[];
  existingData?: Record<string, string>;
  details?: {
    amount?: string;
    bank?: string;
    accountNumber?: string;
    date?: string;
  };
}

function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

function normalizePhone(phone: string): string | null {
  if (!phone) return null;
  let cleaned = phone.replace(/[\s\-\(\)\.]/g, '');
  if (cleaned.startsWith('+')) return cleaned;
  if (cleaned.startsWith('0')) return '+60' + cleaned.slice(1);
  if (/^\d{9,15}$/.test(cleaned)) return '+60' + cleaned;
  return cleaned.length >= 4 ? '+60' + cleaned : null;
}

export async function POST(request: NextRequest) {
  log.api.info('POST /api/whatsapp/send - received');
  
  try {
    const body: SendWhatsAppRequest = await request.json();
    
    const isDemoMode = process.env.DEMO_MODE === 'true' || !isTwilioConfigured();
    
    const skipDatabase = !isValidUUID(body.workspaceId) || !process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    const normalizedPhone = normalizePhone(body.phoneNumber);
    
    log.whatsapp.info('WhatsApp send request', {
      workspaceId: body.workspaceId,
      rowId: body.rowId,
      phoneNumber: normalizedPhone?.slice(-4),
      missingFields: body.missingFields,
      demoMode: isDemoMode,
    });

    if (!body.phoneNumber) {
      return NextResponse.json(
        { error: 'phoneNumber is required' },
        { status: 400 }
      );
    }

    const hasMissingFields = Array.isArray(body.missingFields) && body.missingFields.length > 0;
    const hasDetails = !!body.details && Object.keys(body.details).length > 0;

    if (!hasMissingFields && !hasDetails) {
      return NextResponse.json(
        { error: 'Provide missingFields or details to build the message' },
        { status: 400 }
      );
    }

    const requestId = uuidv4();
    const formLink = buildFormLink(requestId);
    const message = hasDetails
      ? buildPaymentDetailsMessage(
          body.recipientName || 'there',
          body.details || {},
          formLink
        )
      : buildWhatsAppMessage(
          body.recipientName || 'there',
          body.missingFields || [],
          formLink
        );

    log.whatsapp.info('Built message', { 
      requestId, 
      formLink,
      messageLength: message.length 
    });

    // Always store in demoStore for local tracking (form submissions work without DB)
    demoStore.createRequest({
      id: requestId,
      rowId: body.rowId,
      recipientName: body.recipientName || 'Unknown',
      phoneNumber: normalizedPhone || body.phoneNumber,
      missingFields: body.missingFields || [],
      existingData: body.existingData || {},
      formUrl: formLink,
    });

    // Demo mode: don't send real WhatsApp, just return the form link
    if (isDemoMode) {
      log.whatsapp.info('Demo mode - WhatsApp simulated', { requestId, reason: 'DEMO_MODE=true or Twilio not configured' });
      
      return NextResponse.json({
        success: true,
        requestId,
        formLink,
        messageSid: `demo_${requestId}`,
        demoMode: true,
        message: 'Demo mode: WhatsApp message simulated. Use the form link to test.',
      });
    }

    // Production mode: Send real WhatsApp message
    if (!normalizedPhone) {
      return NextResponse.json(
        { error: 'Invalid phone number format' },
        { status: 400 }
      );
    }

    log.whatsapp.info('Sending real WhatsApp message', { 
      to: normalizedPhone.slice(-4),
      skipDatabase 
    });

    // Optionally store in database if configured
    if (!skipDatabase) {
      const supabase = createServerSupabaseClient();

      const { error: insertError } = await supabase
        .from('whatsapp_requests')
        .insert({
          id: requestId,
          workspace_id: body.workspaceId,
          row_id: body.rowId,
          phone_number: normalizedPhone,
          missing_fields: body.missingFields,
          status: 'sent',
          form_url: formLink,
        })
        .select()
        .single();

      if (insertError) {
        log.supabase.warn('Failed to insert WhatsApp request (continuing anyway)', { error: insertError.message });
      }

      await supabase
        .from('spreadsheet_rows')
        .update({
          whatsapp_status: 'sent',
          whatsapp_thread_id: requestId,
        })
        .eq('id', body.rowId);
    }

    // Send the actual WhatsApp message via Twilio
    const result = await sendWhatsAppMessage(normalizedPhone, message);

    if (!result.success) {
      log.whatsapp.error('Twilio send failed', { error: result.error });

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

