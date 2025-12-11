
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY, ADMIN_PASSWORD } from '../constants';
import { AccessKey, DeviceSession, ChatHistoryItem, AiMode, ImageAccessKey, Subject } from '../types';

// Initialize the Supabase client
// Validate URL to prevent crash on load if env vars are missing
const getSupabaseClient = () => {
  const url = SUPABASE_URL;
  const key = SUPABASE_ANON_KEY;
  
  // Strict validation to prevent runtime crashes
  if (!url || !key || url === 'undefined' || key === 'undefined') {
    console.warn('Supabase URL or Key missing/invalid. Using placeholder client.');
    return createClient('https://placeholder.supabase.co', 'placeholder');
  }

  try {
    // Validate URL format
    new URL(url);
    return createClient(url, key);
  } catch (e) {
    console.warn('Invalid Supabase URL. Using placeholder client.');
    return createClient('https://placeholder.supabase.co', 'placeholder');
  }
};

export const supabase = getSupabaseClient();

const isPlaceholderClient = () => {
  // @ts-ignore - Check internal URL property if available or infer from constant
  return SUPABASE_URL === '' || SUPABASE_URL === 'undefined' || !SUPABASE_URL;
};

// Helper to get or create a unique device ID
export const getDeviceId = (): string => {
  const STORAGE_KEY = 'tongai_device_id';
  let deviceId = localStorage.getItem(STORAGE_KEY);
  if (!deviceId) {
    // Fallback for environments where crypto.randomUUID is not available (e.g. non-secure contexts)
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      try {
        deviceId = crypto.randomUUID();
      } catch (e) {
        // Fallback if randomUUID fails execution
        deviceId = 'dev-' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
      }
    } else {
      deviceId = 'dev-' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    }
    localStorage.setItem(STORAGE_KEY, deviceId);
  }
  return deviceId;
};

// User Login: Verify key and log session via RPC
export const loginUser = async (code: string, location?: string): Promise<boolean> => {
  if (isPlaceholderClient()) {
    console.warn("Login bypassed (Placeholder Mode)");
    return true; 
  }

  const deviceId = getDeviceId();
  const userAgent = navigator.userAgent; // Get browser info
  
  const { data, error } = await supabase.rpc('login_with_key', {
    input_code: code,
    input_device_id: deviceId,
    input_user_agent: userAgent,
    input_location: location || 'Unknown' // Pass location
  });

  if (error) {
    console.error('Login error:', error);
    return false;
  }

  return data as boolean;
};

// Verify and Link Image Key
export const verifyImageKey = async (imageCode: string, mainCode: string): Promise<boolean> => {
  if (isPlaceholderClient()) return true;

  const deviceId = getDeviceId();

  const { data, error } = await supabase.rpc('verify_image_key', {
    input_image_code: imageCode,
    input_main_code: mainCode,
    input_device_id: deviceId
  });

  if (error) {
    console.error('Image Key verification error:', error);
    return false;
  }

  return data as boolean;
};

// Record Token Usage
export const recordTokenUsage = async (code: string, tokens: number): Promise<void> => {
  if (isPlaceholderClient()) return;

  const deviceId = getDeviceId();
  await supabase.rpc('increment_token_usage', {
    input_code: code,
    input_device_id: deviceId,
    usage_amount: tokens
  });
};

// Record Image Usage
export const recordImageUsage = async (imageCode: string): Promise<void> => {
  if (isPlaceholderClient()) return;

  await supabase.rpc('increment_image_usage', {
    input_image_code: imageCode
  });
};

// --- History Sync Features ---

export const fetchChatHistory = async (code: string): Promise<ChatHistoryItem[]> => {
  if (isPlaceholderClient()) return [];

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
  if (isPlaceholderClient()) return;

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
  if (isPlaceholderClient()) return 'TongAI';

  const { data } = await supabase
    .from('app_config')
    .select('value')
    .eq('key', 'app_title')
    .single();
  
  return data?.value || 'TongAI';
};

export const updateAppTitle = async (newTitle: string): Promise<void> => {
  if (isPlaceholderClient()) return;

  const { error } = await supabase.rpc('update_config_value', {
    key_name: 'app_title',
    new_value: newTitle
  });
    
  if (error) throw error;
};

export const getAppLogo = async (): Promise<string> => {
  if (isPlaceholderClient()) return '';
  
  const { data } = await supabase
    .from('app_config')
    .select('value')
    .eq('key', 'app_logo')
    .single();
    
  return data?.value || '';
};

export const updateAppLogo = async (base64: string): Promise<void> => {
  if (isPlaceholderClient()) return;
  
  const { error } = await supabase.rpc('update_config_value', {
    key_name: 'app_logo',
    new_value: base64
  });
  
  if (error) throw error;
};

// New: Get AI Mode
export const getAiMode = async (): Promise<AiMode> => {
  if (isPlaceholderClient()) return 'solver';

  const { data } = await supabase
    .from('app_config')
    .select('value')
    .eq('key', 'ai_mode')
    .single();
  
  return (data?.value as AiMode) || 'solver';
};

// New: Update AI Mode
export const updateAiMode = async (mode: AiMode): Promise<void> => {
  if (isPlaceholderClient()) return;

  const { error } = await supabase.rpc('update_config_value', {
    key_name: 'ai_mode',
    new_value: mode
  });

  if (error) throw error;
};

// New: Get AI Provider Config
export const getAiProviderConfig = async (): Promise<{apiKey: string, baseUrl: string}> => {
  if (isPlaceholderClient()) return { apiKey: '', baseUrl: '' };
  
  const { data } = await supabase.from('app_config').select('key, value').in('key', ['ai_api_key', 'ai_base_url']);
  
  const config = { apiKey: '', baseUrl: '' };
  if (data) {
    data.forEach(item => {
      if (item.key === 'ai_api_key') config.apiKey = item.value;
      if (item.key === 'ai_base_url') config.baseUrl = item.value;
    });
  }
  return config;
};

export const updateAiProviderConfig = async (apiKey: string, baseUrl: string): Promise<void> => {
  if (isPlaceholderClient()) return;

  if (apiKey) await updateConfigValue('ai_api_key', apiKey);
  if (baseUrl) await updateConfigValue('ai_base_url', baseUrl);
};

// Helper for config updates
const updateConfigValue = async (key: string, value: string) => {
  await supabase.rpc('update_config_value', { key_name: key, new_value: value });
};


// Admin Password Management
export const verifyAdminPassword = async (input: string): Promise<boolean> => {
  // 0. Master Override: Check Environment Variable/Constant FIRST
  if (input === ADMIN_PASSWORD) {
    return true;
  }
  
  if (isPlaceholderClient()) return false;

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
  if (isPlaceholderClient()) return;

  const { error } = await supabase.rpc('update_config_value', {
    key_name: 'admin_password',
    new_value: newPassword
  });

  if (error) throw error;
};

// --- Subjects Management ---

export const fetchSubjects = async (includeInactive = false): Promise<Subject[]> => {
  if (isPlaceholderClient()) return [];

  let query = supabase
    .from('subjects')
    .select('*')
    .order('sort_order', { ascending: true });
    
  if (!includeInactive) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching subjects:', error);
    return [];
  }
  return data || [];
};

export const addSubject = async (subject: Subject): Promise<void> => {
  if (isPlaceholderClient()) return;

  const { error } = await supabase
    .from('subjects')
    .insert([subject]);

  if (error) throw new Error(error.message);
};

export const updateSubject = async (code: string, updates: Partial<Subject>): Promise<void> => {
  if (isPlaceholderClient()) return;

  const { error } = await supabase
    .from('subjects')
    .update(updates)
    .eq('code', code);

  if (error) throw new Error(error.message);
};

export const deleteSubject = async (code: string): Promise<void> => {
  if (isPlaceholderClient()) return;
  
  const { error } = await supabase
    .from('subjects')
    .delete()
    .eq('code', code);
    
  if (error) throw new Error(error.message);
};

// --- Admin Features ---

// Admin: Fetch all keys with device counts
export const fetchKeys = async (): Promise<AccessKey[]> => {
  if (isPlaceholderClient()) {
    console.warn("Returning mock keys (Placeholder Mode)");
    return [];
  }

  const { data, error } = await supabase
    .from('access_keys')
    .select('*, device_sessions(count)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Fetch keys error:', JSON.stringify(error, null, 2));
    throw new Error(error.message);
  }

  return data || [];
};

// Admin: Fetch all IMAGE keys
export const fetchImageKeys = async (): Promise<ImageAccessKey[]> => {
  if (isPlaceholderClient()) return [];

  const { data, error } = await supabase
    .from('image_access_keys')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Fetch image keys error:', error);
    throw new Error(error.message);
  }
  return data || [];
};

// Admin: Fetch devices (augmented with image key info)
export const fetchDevices = async (): Promise<DeviceSession[]> => {
  if (isPlaceholderClient()) return [];

  const { data, error } = await supabase
    .from('device_sessions')
    .select('*')
    .order('last_seen', { ascending: false });

  if (error) {
    console.error('Fetch devices error:', JSON.stringify(error, null, 2));
    throw new Error(error.message);
  }
  return data || [];
};

// Admin: Fetch history logs filtered by key or device
export const fetchAdminHistory = async (filterType: 'key' | 'device', value: string): Promise<ChatHistoryItem[]> => {
  if (isPlaceholderClient()) return [];

  let query = supabase
    .from('chat_history')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100); 

  if (filterType === 'key') {
    query = query.eq('key_code', value);
  } else if (filterType === 'device') {
    query = query.eq('device_id', value);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
};

// Admin: Add new key
export const addKey = async (code: string, note: string): Promise<void> => {
  if (isPlaceholderClient()) return;

  const { error } = await supabase
    .from('access_keys')
    .insert([{ code, note }]);

  if (error) throw new Error(error.message);
};

// Admin: Add new IMAGE key
export const addImageKey = async (code: string, note: string): Promise<void> => {
  if (isPlaceholderClient()) return;

  const { error } = await supabase
    .from('image_access_keys')
    .insert([{ code, note }]);
  
  if (error) throw new Error(error.message);
};

// Admin: Toggle key status
export const toggleKeyStatus = async (id: string, currentStatus: boolean): Promise<void> => {
  if (isPlaceholderClient()) return;

  const { error } = await supabase
    .from('access_keys')
    .update({ is_active: !currentStatus })
    .eq('id', id);

  if (error) throw new Error(error.message);
};

// Admin: Toggle IMAGE key status
export const toggleImageKeyStatus = async (id: string, currentStatus: boolean): Promise<void> => {
  if (isPlaceholderClient()) return;

  const { error } = await supabase
    .from('image_access_keys')
    .update({ is_active: !currentStatus })
    .eq('id', id);

  if (error) throw new Error(error.message);
};

// Admin: Update key limit
export const updateKeyLimit = async (id: string, limit: number | null): Promise<void> => {
  if (isPlaceholderClient()) return;

  const { error } = await supabase
    .from('access_keys')
    .update({ token_limit: limit })
    .eq('id', id);

  if (error) throw new Error(error.message);
};

// Admin: Update IMAGE key limit
export const updateImageKeyLimit = async (id: string, limit: number | null): Promise<void> => {
  if (isPlaceholderClient()) return;

  const { error } = await supabase
    .from('image_access_keys')
    .update({ image_limit: limit })
    .eq('id', id);

  if (error) throw new Error(error.message);
};


// Admin: Toggle device ban status
export const toggleDeviceBan = async (keyCode: string, deviceId: string, currentStatus: boolean): Promise<void> => {
  if (isPlaceholderClient()) return;

  const { error } = await supabase
    .from('device_sessions')
    .update({ is_banned: !currentStatus })
    .match({ key_code: keyCode, device_id: deviceId });

  if (error) throw new Error(error.message);
};

// Admin: Delete key
export const deleteKey = async (code: string): Promise<void> => {
  if (isPlaceholderClient()) return;

  const { error } = await supabase
    .from('access_keys')
    .delete()
    .eq('code', code);

  if (error) throw new Error(error.message);
};

// Admin: Delete IMAGE key
export const deleteImageKey = async (code: string): Promise<void> => {
  if (isPlaceholderClient()) return;

  const { error } = await supabase
    .from('image_access_keys')
    .delete()
    .eq('code', code);

  if (error) throw new Error(error.message);
};
