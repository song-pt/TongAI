
import { SILICONFLOW_API_KEY, SILICONFLOW_BASE_URL, AI_MODEL, AI_VISION_MODEL, SYSTEM_PROMPT } from '../constants';
import { prompts } from '../utils/translations';
import { ApiResponse, ApiError, Language, AiMode } from '../types';
import { recordTokenUsage, recordImageUsage } from './supabase';

export const solveMathProblem = async (
  problem: string, 
  grade?: string, 
  subject: string = 'math', 
  accessKey?: string,
  language: Language = 'zh-cn',
  aiMode: AiMode = 'solver',
  imageData?: string, // Base64 string of image
  imageKey?: string   // Image access key code
): Promise<string> => {
  const url = `${SILICONFLOW_BASE_URL}/chat/completions`;
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SILICONFLOW_API_KEY}`
  };

  // Determine Model: Switch to Vision model if image is present
  const modelToUse = imageData ? AI_VISION_MODEL : AI_MODEL;

  let promptContent = '';

  if (aiMode === 'normal') {
    // Normal Mode: Just send the problem as is, no persona prefix
    promptContent = problem;
  } else {
    // Solver Mode: Use Persona and Grade Logic
    const promptSet = prompts[language];
    let prefix = promptSet.userPrefix;
    
    if (subject === 'chinese') {
      prefix = promptSet.chinesePrefix;
    } else if (subject === 'english') {
      prefix = promptSet.englishPrefix;
    }

    promptContent = `${prefix}${problem}`;
    
    if (grade) {
      const gradeMapZh: Record<string, string> = {
        '1': '一年级', '2': '二年级', '3': '三年级',
        '4': '四年级', '5': '五年级', '6': '六年级',
        '7': '七年级', '8': '八年级', '9': '九年级'
      };
      const gradeMapEn: Record<string, string> = {
        '1': 'Grade 1', '2': 'Grade 2', '3': 'Grade 3',
        '4': 'Grade 4', '5': 'Grade 5', '6': 'Grade 6',
        '7': 'Grade 7', '8': 'Grade 8', '9': 'Grade 9'
      };
      
      // Use grade map based on language
      const gradeMap = language === 'en' ? gradeMapEn : gradeMapZh;
      const methodText = language === 'en' ? 'Solve using methods for' : (language === 'zh-tw' ? '用' : '用');
      const methodSuffix = language === 'en' ? '.' : (language === 'zh-tw' ? '的方法解答。' : '的方法解答。');

      if (gradeMap[grade]) {
        promptContent += ` ${methodText}${gradeMap[grade]}${methodSuffix}`;
      }
    }
  }

  // Construct Message Content (Text vs Vision)
  let messages: any[] = [];
  if (imageData) {
    // Vision Payload
    messages = [
      { role: "system", content: SYSTEM_PROMPT },
      { 
        role: "user", 
        content: [
          { type: "image_url", image_url: { url: imageData } }, // Put image first for Qwen usually
          { type: "text", text: promptContent }
        ] 
      }
    ];
  } else {
    // Standard Text Payload
    messages = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: promptContent }
    ];
  }

  const body = {
    model: modelToUse,
    messages: messages,
    stream: false,
    temperature: 0.7
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as ApiError;
      throw new Error(errorData.error?.message || `API Request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as ApiResponse;
    
    if (data.choices && data.choices.length > 0 && data.choices[0].message) {
      
      // 1. Track Token Usage (Main Key)
      if (accessKey) {
         if (data.usage?.total_tokens) {
           recordTokenUsage(accessKey, data.usage.total_tokens).catch(console.error);
         } else {
           // Fallback estimation
           const estimated = Math.ceil((promptContent.length + data.choices[0].message.content.length) / 3);
           recordTokenUsage(accessKey, estimated).catch(console.error);
         }
      }

      // 2. Track Image Usage (Image Key)
      if (imageData && imageKey) {
        recordImageUsage(imageKey).catch(console.error);
      }

      return data.choices[0].message.content;
    } else {
      throw new Error("Invalid response format from AI service.");
    }

  } catch (error) {
    console.error("Error calling SiliconFlow API:", error);
    throw error;
  }
};