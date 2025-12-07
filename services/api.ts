
import { SILICONFLOW_API_KEY, SILICONFLOW_BASE_URL, AI_MODEL, SYSTEM_PROMPT } from '../constants';
import { prompts } from '../utils/translations';
import { ApiResponse, ApiError, Language, AiMode } from '../types';
import { recordTokenUsage } from './supabase';

export const solveMathProblem = async (
  problem: string, 
  grade?: string, 
  subject: string = 'math', 
  accessKey?: string,
  language: Language = 'zh-cn',
  aiMode: AiMode = 'solver'
): Promise<string> => {
  const url = `${SILICONFLOW_BASE_URL}/chat/completions`;
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SILICONFLOW_API_KEY}`
  };

  let content = '';

  if (aiMode === 'normal') {
    // Normal Mode: Just send the problem as is, no persona prefix
    content = problem;
  } else {
    // Solver Mode: Use Persona and Grade Logic
    const promptSet = prompts[language];
    let prefix = promptSet.userPrefix;
    
    if (subject === 'chinese') {
      prefix = promptSet.chinesePrefix;
    } else if (subject === 'english') {
      prefix = promptSet.englishPrefix;
    }

    content = `${prefix}${problem}`;
    
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
        content += ` ${methodText}${gradeMap[grade]}${methodSuffix}`;
      }
    }
  }

  const body = {
    model: AI_MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: content }
    ],
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
      // Track usage if accessKey is provided
      if (accessKey && data.usage?.total_tokens) {
        // Asynchronously record usage, don't block the UI
        recordTokenUsage(accessKey, data.usage.total_tokens).catch(console.error);
      } else if (accessKey) {
        // Fallback estimation if API doesn't return usage (approx 1 token per 4 chars)
        const estimated = Math.ceil((content.length + data.choices[0].message.content.length) / 3);
        recordTokenUsage(accessKey, estimated).catch(console.error);
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
