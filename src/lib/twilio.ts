import twilio from 'twilio';
import { log, measureTime } from './logger';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';

let twilioClient: twilio.Twilio | null = null;

export function isTwilioConfigured(): boolean {
  return !!(accountSid && authToken && accountSid.startsWith('AC'));
}

function getTwilioClient(): twilio.Twilio {
  if (!twilioClient) {
    if (!accountSid || !authToken) {
      throw new Error(
        'Twilio not configured. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in .env.local'
      );
    }
    
    if (!accountSid.startsWith('AC')) {
      throw new Error(
        'Invalid TWILIO_ACCOUNT_SID format. Should start with "AC"'
      );
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
    const errorCode = (error as { code?: number })?.code;
    
    log.whatsapp.error('WhatsApp send failed', { 
      error: errorMessage,
      code: errorCode,
      to: formattedTo,
    });

    // Provide helpful error messages
    let userMessage = errorMessage;
    if (errorMessage.includes('not a valid phone number')) {
      userMessage = 'Invalid phone number format. Must be E.164 format (e.g. +60123456789)';
    } else if (errorMessage.includes('not registered') || errorMessage.includes('sandbox')) {
      userMessage = 'Recipient must first join Twilio sandbox. Send "join do-wooden" to +1 415 523 8886 on WhatsApp.';
    } else if (errorMessage.includes('authenticate')) {
      userMessage = 'Twilio authentication failed. Check your TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.';
    } else if (errorMessage.includes('Message rate limit exceeded')) {
      userMessage = 'Message rate limit exceeded. Please try again later.';
    }
    
    return {
      success: false,
      error: userMessage,
    };
  }
}

export function buildFormLink(requestId: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${baseUrl}/verify/${requestId}`;
}

export function buildPaymentDetailsMessage(
  recipientName: string,
  details: {
    amount?: string;
    bank?: string;
    accountNumber?: string;
    date?: string;
  },
  formLink: string
): string {
  const amount = details.amount || 'N/A';
  const bank = details.bank || 'N/A';
  const accountNumber = details.accountNumber || 'N/A';
  const date = details.date || 'N/A';

  return `Hi ${recipientName},

Here are your payment details for confirmation:
- Amount: ${amount}
- Bank: ${bank}
- Account: ${accountNumber}
- Date: ${date}

If this looks correct, reply OK.
If anything is wrong, update it here:
${formLink}

This link expires in 24 hours.

- RytFlow`;
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

