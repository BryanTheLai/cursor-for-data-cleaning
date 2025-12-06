import twilio from 'twilio';
import { log, measureTime } from './logger';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';

let twilioClient: twilio.Twilio | null = null;

function getTwilioClient(): twilio.Twilio {
  if (!twilioClient) {
    if (!accountSid || !authToken) {
      throw new Error('TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be set');
    }
    twilioClient = twilio(accountSid, authToken);
    log.whatsapp.info('Twilio client initialized');
  }
  return twilioClient;
}

export interface WhatsAppMessageResult {
  success: boolean;
  messageSid?: string;
  error?: string;
}

export async function sendWhatsAppMessage(
  to: string,
  body: string
): Promise<WhatsAppMessageResult> {
  const client = getTwilioClient();
  
  const formattedTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
  
  log.whatsapp.info('Sending WhatsApp message', { to: formattedTo, bodyLength: body.length });

  try {
    const result = await measureTime('WhatsApp send', log.whatsapp, async () => {
      const message = await client.messages.create({
        from: whatsappNumber,
        to: formattedTo,
        body,
      });
      return message;
    });

    log.whatsapp.info('WhatsApp message sent', { 
      messageSid: result.sid, 
      status: result.status 
    });

    return {
      success: true,
      messageSid: result.sid,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log.whatsapp.error('WhatsApp send failed', { error: errorMessage });
    
    return {
      success: false,
      error: errorMessage,
    };
  }
}

export function buildFormLink(requestId: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${baseUrl}/verify/${requestId}`;
}

export function buildWhatsAppMessage(
  recipientName: string,
  missingFields: string[],
  formLink: string
): string {
  const fieldList = missingFields.join(', ');
  
  return `Hi ${recipientName},

We need some additional information to process your payment.

Missing: ${fieldList}

Please fill out this secure form:
${formLink}

This link expires in 24 hours.

- RytFlow`;
}

