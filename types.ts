
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

export interface DeviceSession {
  id: string;
  key_code: string;
  device_id: string;
  last_seen: string;
  device_info: string;
  total_tokens: number;
  is_banned: boolean;
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

// Language Type
export type Language = 'zh-cn' | 'zh-tw' | 'en';

// AI Mode Type
export type AiMode = 'solver' | 'normal';
