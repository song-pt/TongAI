
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY, ADMIN_PASSWORD } from '../constants';
import { AccessKey, DeviceSession, ChatHistoryItem, AiMode } from '../types';

// Initialize the Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Helper to get or create a unique device ID
export const getDeviceId = (): string => {
  const STORAGE_KEY = 'tongai_device_id';
  let deviceId = localStorage.getItem(STORAGE_KEY);
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, deviceId);
  }
  return deviceId;
};

// User Login: Verify key and log session via RPC
export const loginUser = async (code: string): Promise<boolean> => {
  const deviceId = getDeviceId();
  const userAgent = navigator.userAgent; // Get browser info
  
  const { data, error } = await supabase.rpc('login_with_key', {
    input_code: code,
    input_device_id: deviceId,
    input_user_agent: userAgent
  });

  if (error) {
    console.error('Login error:', error);
    return false;
  }

  return data as boolean;
};

// Record Token Usage
export const recordTokenUsage = async (code: string, tokens: number): Promise<void> => {
  const deviceId = getDeviceId();
  await supabase.rpc('increment_token_usage', {
    input_code: code,
    input_device_id: deviceId,
    usage_amount: tokens
  });
};

// --- History Sync Features ---

export const fetchChatHistory = async (code: string): Promise<ChatHistoryItem[]> => {
  const { data, error } = await supabase
    .from('chat_history')
    .select('*')
    .eq('key_code', code)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error fetching history:', error);
    return [];
  }
  return data || [];
};

export const saveChatMessage = async (
  code: string, 
  question: string, 
  answer: string, 
  subject: string, 
  gradeLabel?: string
): Promise<void> => {
  const deviceId = getDeviceId(); // Get current device ID
  
  const { error } = await supabase.rpc('add_chat_message', {
    p_key_code: code,
    p_question: question,
    p_answer: answer,
    p_subject: subject,
    p_grade_label: gradeLabel || null,
    p_device_id: deviceId // Pass device ID to DB
  });

  if (error) {
    console.error('Error saving message:', error);
  }
};

// --- System Configuration ---

export const getAppTitle = async (): Promise<string> => {
  const { data } = await supabase
    .from('app_config')
    .select('value')
    .eq('key', 'app_title')
    .single();
  
  return data?.value || 'TongAI';
};

export const updateAppTitle = async (newTitle: string): Promise<void> => {
  // Use RPC to bypass RLS issues for anon client
  const { error } = await supabase.rpc('update_config_value', {
    key_name: 'app_title',
    new_value: newTitle
  });
    
  if (error) throw error;
};

// New: Get AI Mode
export const getAiMode = async (): Promise<AiMode> => {
  const { data } = await supabase
    .from('app_config')
    .select('value')
    .eq('key', 'ai_mode')
    .single();
  
  return (data?.value as AiMode) || 'solver';
};

// New: Update AI Mode
export const updateAiMode = async (mode: AiMode): Promise<void> => {
  const { error } = await supabase.rpc('update_config_value', {
    key_name: 'ai_mode',
    new_value: mode
  });

  if (error) throw error;
};

// Admin Password Management
export const verifyAdminPassword = async (input: string): Promise<boolean> => {
  // 0. Master Override: Check Environment Variable/Constant FIRST
  // This ensures that if the user sets VITE_ADMIN_PASSWORD, it always works regardless of DB state.
  if (input === ADMIN_PASSWORD) {
    return true;
  }

  // 1. Try to check DB config
  try {
    const { data } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'admin_password')
      .single();
    
    if (data && data.value) {
      return data.value === input;
    }
  } catch (e) {
    // Ignore DB error
  }

  return false;
};

export const updateAdminPassword = async (newPassword: string): Promise<void> => {
  // Use RPC to bypass RLS issues for anon client
  const { error } = await supabase.rpc('update_config_value', {
    key_name: 'admin_password',
    new_value: newPassword
  });

  if (error) throw error;
};


// --- Admin Features ---

// Admin: Fetch all keys with device counts
export const fetchKeys = async (): Promise<AccessKey[]> => {
  const { data, error } = await supabase
    .from('access_keys')
    .select('*, device_sessions(count)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Fetch keys error:', error);
    throw error;
  }

  return data || [];
};

// Admin: Fetch all devices
export const fetchDevices = async (): Promise<DeviceSession[]> => {
  const { data, error } = await supabase
    .from('device_sessions')
    .select('*')
    .order('last_seen', { ascending: false });

  if (error) throw error;
  return data || [];
};

// Admin: Fetch history logs filtered by key or device
export const fetchAdminHistory = async (filterType: 'key' | 'device', value: string): Promise<ChatHistoryItem[]> => {
  let query = supabase
    .from('chat_history')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100); // Limit to last 100 items for performance

  if (filterType === 'key') {
    query = query.eq('key_code', value);
  } else if (filterType === 'device') {
    query = query.eq('device_id', value);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

// Admin: Add new key
export const addKey = async (code: string, note: string): Promise<void> => {
  const { error } = await supabase
    .from('access_keys')
    .insert([{ code, note }]);

  if (error) throw error;
};

// Admin: Toggle key status
export const toggleKeyStatus = async (id: string, currentStatus: boolean): Promise<void> => {
  const { error } = await supabase
    .from('access_keys')
    .update({ is_active: !currentStatus })
    .eq('id', id);

  if (error) throw error;
};

// Admin: Update key limit
export const updateKeyLimit = async (id: string, limit: number | null): Promise<void> => {
  const { error } = await supabase
    .from('access_keys')
    .update({ token_limit: limit })
    .eq('id', id);

  if (error) throw error;
};

// Admin: Toggle device ban status
export const toggleDeviceBan = async (keyCode: string, deviceId: string, currentStatus: boolean): Promise<void> => {
  // Since device_sessions has a composite unique key (key_code, device_id), we use .match()
  const { error } = await supabase
    .from('device_sessions')
    .update({ is_banned: !currentStatus })
    .match({ key_code: keyCode, device_id: deviceId });

  if (error) throw error;
};

// Admin: Delete key
export const deleteKey = async (code: string): Promise<void> => {
  const { error } = await supabase
    .from('access_keys')
    .delete()
    .eq('code', code);

  if (error) throw error;
};
