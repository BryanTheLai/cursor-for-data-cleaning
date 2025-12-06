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

const COUNTRY_CODES: Record<string, string> = {
  MY: '+60',
  SG: '+65',
  ID: '+62',
  TH: '+66',
  PH: '+63',
  VN: '+84',
  US: '+1',
  UK: '+44',
  AU: '+61',
  IN: '+91',
  CN: '+86',
  JP: '+81',
  KR: '+82',
};

export function normalizePhoneNumber(phone: string, defaultCountry: string = 'MY'): string | null {
  if (!phone) return null;
  
  let cleaned = phone.replace(/[\s\-\(\)\.]/g, '');
  
  if (cleaned.startsWith('whatsapp:')) {
    cleaned = cleaned.replace('whatsapp:', '');
  }
  
  if (cleaned.startsWith('+')) {
    return cleaned;
  }
  
  if (cleaned.startsWith('00')) {
    return '+' + cleaned.slice(2);
  }
  
  if (cleaned.startsWith('0')) {
    const countryCode = COUNTRY_CODES[defaultCountry] || '+60';
    return countryCode + cleaned.slice(1);
  }
  
  if (/^\d{9,15}$/.test(cleaned)) {
    const countryCode = COUNTRY_CODES[defaultCountry] || '+60';
    return countryCode + cleaned;
  }
  
  log.whatsapp.warn('Could not normalize phone number', { original: phone, cleaned });
  return null;
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

