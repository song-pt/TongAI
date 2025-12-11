
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface ApiResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface ApiError {
  error: {
    message: string;
    type: string;
    code: string;
  };
}

// Database Types
export interface AccessKey {
  id: string;
  code: string;
  note: string | null;
  is_active: boolean;
  created_at: string;
  total_tokens: number; 
  token_limit: number | null; // Added field: null means unlimited
  device_sessions?: { count: number }[];
}

export interface ImageAccessKey {
  id: string;
  code: string;
  note: string | null;
  is_active: boolean;
  created_at: string;
  total_images: number;
  image_limit: number | null;
}

export interface Subject {
  code: string;
  label: string;
  color: string; // 'indigo', 'emerald', 'violet', 'rose', 'amber', 'sky'
  icon: string; // 'calculator', 'pen', 'languages', 'atom', 'globe', 'music'
  prompt_prefix: string;
  background_chars: string;
  char_opacity?: number; // 0.0 to 1.0, default 0.15
  char_size_scale?: number; // default 1.0
  is_active: boolean;
  sort_order: number;
}

export interface DeviceSession {
  id: string;
  key_code: string;
  device_id: string;
  last_seen: string;
  device_info: string;
  total_tokens: number;
  is_banned: boolean;
  image_key_code?: string | null; // Linked image key
  location?: string; // New: User selected location
}

// History Type for Database
export interface ChatHistoryItem {
  id: string;
  key_code: string;
  question: string;
  answer: string;
  subject: string;
  grade_label?: string;
  device_id?: string;
  created_at: string;
}

// System Config Type
export interface AppConfig {
  key: string;
  value: string;
}

// New: Key Usage Data for User Display
export interface KeyUsageData {
  total_tokens: number;
  token_limit: number | null;
}

// Language Type
export type Language = 'zh-cn' | 'zh-tw' | 'en';

// AI Mode Type
export type AiMode = 'solver' | 'normal';