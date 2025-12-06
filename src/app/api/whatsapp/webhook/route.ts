import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { log } from '@/lib/logger';
import crypto from 'crypto';

interface TwilioWebhookBody {
  MessageSid: string;
  AccountSid: string;
  From: string;
  To: string;
  Body: string;
  NumMedia: string;
  ProfileName?: string;
  WaId?: string;
}

function validateTwilioSignature(
  signature: string | null,
  url: string,
  params: Record<string, string>
): boolean {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    log.whatsapp.warn('No TWILIO_AUTH_TOKEN set, skipping signature validation');
    return true;
  }

  if (!signature) {
    log.whatsapp.warn('No X-Twilio-Signature header');
    return false;
  }

  const sortedKeys = Object.keys(params).sort();
  let data = url;
  for (const key of sortedKeys) {
    data += key + params[key];
  }

  const expectedSignature = crypto
    .createHmac('sha1', authToken)
    .update(Buffer.from(data, 'utf-8'))
    .digest('base64');

  return signature === expectedSignature;
}

function normalizePhoneFromWhatsApp(from: string): string {
  return from.replace('whatsapp:', '');
}

export async function POST(request: NextRequest) {
  log.api.info('POST /api/whatsapp/webhook - received');

  try {
    const formData = await request.formData();
    const body: TwilioWebhookBody = {
      MessageSid: formData.get('MessageSid') as string || '',
      AccountSid: formData.get('AccountSid') as string || '',
      From: formData.get('From') as string || '',
      To: formData.get('To') as string || '',
      Body: formData.get('Body') as string || '',
      NumMedia: formData.get('NumMedia') as string || '0',
      ProfileName: formData.get('ProfileName') as string | undefined,
      WaId: formData.get('WaId') as string | undefined,
    };

    log.whatsapp.info('Webhook payload', {
      from: body.From,
      body: body.Body?.substring(0, 50),
      messageSid: body.MessageSid,
    });

    const signature = request.headers.get('X-Twilio-Signature');
    const url = request.url;
    
    const params: Record<string, string> = {};
    formData.forEach((value, key) => {
      if (typeof value === 'string') {
        params[key] = value;
      }
    });

    if (process.env.NODE_ENV === 'production') {
      const isValid = validateTwilioSignature(signature, url, params);
      if (!isValid) {
        log.whatsapp.error('Invalid Twilio signature');
        return new NextResponse('Forbidden', { status: 403 });
      }
    }

    const phoneNumber = normalizePhoneFromWhatsApp(body.From);
    const messageBody = body.Body?.trim() || '';

    if (!messageBody) {
      log.whatsapp.info('Empty message body, sending help response');
      return createTwiMLResponse(
        "Hi! Please click the link in our previous message to fill out the form, or reply with the requested information."
      );
    }

    const supabase = createServerSupabaseClient();

    const { data: pendingRequest, error: findError } = await supabase
      .from('whatsapp_requests')
      .select('*, spreadsheet_rows(*)')
      .eq('phone_number', phoneNumber)
      .in('status', ['sent', 'clicked'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (findError || !pendingRequest) {
      log.whatsapp.info('No pending request found for phone', { 
        phone: phoneNumber.slice(-4),
        error: findError?.message 
      });
      return createTwiMLResponse(
        "Thanks for your message! We don't have a pending request for your number. If you received a form link, please use that instead."
      );
    }

    const missingField = pendingRequest.missing_fields?.[0];
    if (!missingField) {
      log.whatsapp.warn('No missing field in request');
      return createTwiMLResponse(
        "Your request has already been processed. Thank you!"
      );
    }

    const { error: updateRequestError } = await supabase
      .from('whatsapp_requests')
      .update({
        status: 'submitted',
        submitted_at: new Date().toISOString(),
        submitted_data: { [missingField]: messageBody },
      })
      .eq('id', pendingRequest.id);

    if (updateRequestError) {
      log.supabase.error('Failed to update WhatsApp request', { 
        error: updateRequestError.message 
      });
    }

    const row = pendingRequest.spreadsheet_rows;
    if (row) {
      const updatedCleanData = {
        ...row.clean_data,
        [missingField]: messageBody,
      };

      const { error: rowUpdateError } = await supabase
        .from('spreadsheet_rows')
        .update({
          clean_data: updatedCleanData,
          whatsapp_status: 'replied',
        })
        .eq('id', row.id);

      if (rowUpdateError) {
        log.supabase.error('Failed to update row', { 
          error: rowUpdateError.message 
        });
      }
    }

    log.whatsapp.info('WhatsApp reply processed', {
      requestId: pendingRequest.id,
      field: missingField,
      value: messageBody.substring(0, 20),
    });

    return createTwiMLResponse(
      `Thank you! We've received your ${missingField.replace(/([A-Z])/g, ' $1').toLowerCase()}: "${messageBody}". Your payment will be processed shortly.`
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log.api.error('Webhook error', { error: errorMessage });
    
    return createTwiMLResponse(
      "Sorry, we encountered an error processing your message. Please try again or use the form link."
    );
  }
}

function createTwiMLResponse(message: string): NextResponse {
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${escapeXml(message)}</Message>
</Response>`;

  return new NextResponse(twiml, {
    status: 200,
    headers: {
      'Content-Type': 'text/xml',
    },
  });
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Twilio WhatsApp webhook endpoint',
    usage: 'Configure this URL in Twilio Console: POST /api/whatsapp/webhook',
  });
}




