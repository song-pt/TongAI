
import { SILICONFLOW_API_KEY, SILICONFLOW_BASE_URL, AI_MODEL, AI_VISION_MODEL, SYSTEM_PROMPT } from '../constants';
import { prompts } from '../utils/translations';
import { ApiResponse, ApiError, Language, AiMode, Message } from '../types';
import { recordTokenUsage, recordImageUsage, getAiProviderConfig, getFollowUpContextLimit } from './supabase';

export const solveMathProblem = async (
  problem: string, 
  levelLabel?: string, // CHANGED: This now accepts the Label string directly (e.g. "七年级")
  subject: string = 'math', 
  accessKey?: string,
  language: Language = 'zh-cn',
  aiMode: AiMode = 'solver',
  imageData?: string, // Base64 string of image
  imageKey?: string,   // Image access key code
  customPromptPrefix?: string, // NEW: Optional custom prefix from dynamic subject config
  useSearch: boolean = false // NEW: Enable web search
): Promise<{answer: string, tokens: number}> => {
  
  // 1. Fetch Dynamic Configuration
  const providerConfig = await getAiProviderConfig();
  
  // 2. Resolve API Config (DB Priority > Constant Fallback)
  const baseUrl = (providerConfig.baseUrl && providerConfig.baseUrl.trim() !== '') ? providerConfig.baseUrl : SILICONFLOW_BASE_URL;
  const apiKey = (providerConfig.apiKey && providerConfig.apiKey.trim() !== '') ? providerConfig.apiKey : SILICONFLOW_API_KEY;
  const textModel = (providerConfig.textModel && providerConfig.textModel.trim() !== '') ? providerConfig.textModel : AI_MODEL;
  const visionModel = (providerConfig.visionModel && providerConfig.visionModel.trim() !== '') ? providerConfig.visionModel : AI_VISION_MODEL;

  const url = `${baseUrl}/chat/completions`;
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`
  };

  // Determine Model: Switch to Vision model if image is present
  const modelToUse = imageData ? visionModel : textModel;

  let promptContent = '';

  if (aiMode === 'normal') {
    // Normal Mode: Just send the problem as is, no persona prefix
    promptContent = problem;
  } else {
    // Solver Mode: Use Persona and Grade Logic
    
    // Priority: Custom Prefix (from DB) > Built-in defaults
    let prefix = customPromptPrefix;

    if (!prefix) {
       // Fallback to hardcoded prompts if no custom prefix provided
       const promptSet = prompts[language];
       prefix = promptSet.userPrefix; // Default Math
       
       if (subject === 'chinese') {
         prefix = promptSet.chinesePrefix;
       } else if (subject === 'english') {
         prefix = promptSet.englishPrefix;
       }
    }

    promptContent = `${prefix}${problem}`;
    
    if (levelLabel) {
      // Dynamic Level/Grade Logic
      // If levelLabel exists (e.g. "七年级"), append the instruction.
      const methodText = language === 'en' ? 'Solve using methods for' : (language === 'zh-tw' ? '用' : '用');
      const methodSuffix = language === 'en' ? '.' : (language === 'zh-tw' ? '的方法解答。' : '的方法解答。');
      
      promptContent += ` ${methodText}${levelLabel}${methodSuffix}`;
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

  const body: any = {
    model: modelToUse,
    messages: messages,
    stream: false,
    temperature: 0.7
  };
  
  // Add tools if search is enabled and we are not using vision (vision models often struggle with tools mixed in payload)
  if (useSearch && !imageData) {
    body.tools = [{ type: 'web_search' }];
  }

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
      const content = data.choices[0].message.content;
      const totalTokens = data.usage?.total_tokens || Math.ceil((promptContent.length + content.length) / 3);
      
      return {
        answer: content,
        tokens: totalTokens
      };
    } else {
      throw new Error("Invalid response format from AI service.");
    }

  } catch (error) {
    console.error("Error calling SiliconFlow API:", error);
    throw error;
  }
};

// NEW: Follow-up conversation API
export const continueConversation = async (
  currentMessages: Message[],
  newMessage: string,
  accessKey?: string
): Promise<{answer: string, tokens: number}> => {
  const providerConfig = await getAiProviderConfig();
  const contextLimit = await getFollowUpContextLimit();
  
  const baseUrl = (providerConfig.baseUrl && providerConfig.baseUrl.trim() !== '') ? providerConfig.baseUrl : SILICONFLOW_BASE_URL;
  const apiKey = (providerConfig.apiKey && providerConfig.apiKey.trim() !== '') ? providerConfig.apiKey : SILICONFLOW_API_KEY;
  const textModel = (providerConfig.textModel && providerConfig.textModel.trim() !== '') ? providerConfig.textModel : AI_MODEL;

  const url = `${baseUrl}/chat/completions`;
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`
  };

  // Limit Context: System + Last N messages + New Message
  // Remove System messages from history first to add fresh one
  const conversationHistory = currentMessages
    .filter(m => m.role !== 'system')
    .slice(-contextLimit)
    .map(m => ({ role: m.role, content: m.content }));

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...conversationHistory,
    { role: "user", content: newMessage }
  ];

  const body = {
    model: textModel,
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
      const content = data.choices[0].message.content;
      const totalTokens = data.usage?.total_tokens || Math.ceil((newMessage.length + content.length) / 3);
      
      return {
        answer: content,
        tokens: totalTokens
      };
    } else {
      throw new Error("Invalid response format from AI service.");
    }
  } catch (error) {
    console.error("Error in follow-up API:", error);
    throw error;
  }
};
