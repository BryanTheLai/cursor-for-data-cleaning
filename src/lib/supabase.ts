import { createBrowserClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { log } from './logger';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export function createBrowserSupabaseClient() {
  log.supabase.info('Creating browser client');
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

export function createServerSupabaseClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!serviceRoleKey) {
    log.supabase.warn('No service role key, using anon key for server client');
    return createSupabaseClient(supabaseUrl, supabaseAnonKey);
  }
  
  log.supabase.info('Creating server client with service role');
  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export type SupabaseClient = ReturnType<typeof createBrowserSupabaseClient>;

export interface Workspace {
  id: string;
  name: string;
  created_at: string;
  status: 'active' | 'completed' | 'archived';
}

export interface TargetColumn {
  id: string;
  workspace_id: string;
  key: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'phone';
  rules: string | null;
  required: boolean;
  sort_order: number;
}

export interface SpreadsheetRow {
  id: string;
  workspace_id: string;
  raw_data: Record<string, string>;
  clean_data: Record<string, string>;
  validation_status: 'pending' | 'valid' | 'invalid' | 'processing';
  flags: CellFlag[];
  whatsapp_status: 'idle' | 'sent' | 'replied';
  whatsapp_thread_id: string | null;
  phone_number: string | null;
  row_index: number;
  created_at: string;
  updated_at: string;
}

export interface CellFlag {
  col: string;
  type: 'yellow' | 'orange' | 'red' | 'purple' | 'green';
  message: string;
  original?: string;
  suggestion?: string;
  confidence?: number;
}

export interface WhatsAppRequest {
  id: string;
  workspace_id: string;
  row_id: string;
  phone_number: string;
  missing_fields: string[];
  status: 'sent' | 'clicked' | 'submitted' | 'expired';
  form_url: string | null;
  sent_at: string;
  submitted_at: string | null;
  submitted_data: Record<string, string> | null;
}

