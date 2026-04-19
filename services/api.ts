
import { SYSTEM_PROMPT } from '../constants';
import { prompts } from '../utils/translations';
import { ApiResponse, ApiError, Language, AiMode, Message } from '../types';
import { recordTokenUsage, recordImageUsage, getAiProviderConfig, getFollowUpContextLimit } from './supabase';

/**
 * Handle Streaming and Non-Streaming calls to the local /api/chat proxy.
 * This proxy handles hiding keys and IP bypassing.
 */
async function callChatProxy(
  body: any, 
  onChunk?: (chunk: string) => void
): Promise<{answer: string, tokens: number}> {
  const url = '/api/chat';
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, stream: !!onChunk })
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `API Request failed: ${response.status}`;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.error?.message || errorMessage;
    } catch {
      errorMessage = errorText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  if (onChunk && response.body) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullAnswer = '';
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const dataStr = line.slice(6).trim();
          if (dataStr === '[DONE]') continue;
          
          try {
            const data = JSON.parse(dataStr);
            const content = data.choices?.[0]?.delta?.content || "";
            if (content) {
              fullAnswer += content;
              onChunk(content);
            }
          } catch (e) {
            // Ignore parse errors for partial chunks
          }
        }
      }
    }
    
    return {
      answer: fullAnswer,
      tokens: Math.ceil((JSON.stringify(body.messages).length + fullAnswer.length) / 3) // Estimated
    };
  } else {
    // Standard JSON response
    const data = await response.json() as ApiResponse;
    if (data.choices && data.choices.length > 0 && data.choices[0].message) {
      const content = data.choices[0].message.content;
      const totalTokens = data.usage?.total_tokens || Math.ceil((JSON.stringify(body.messages).length + content.length) / 3);
      return { answer: content, tokens: totalTokens };
    }
    throw new Error("Invalid response format from AI service.");
  }
}

export const solveMathProblem = async (
  problem: string, 
  levelLabel?: string,
  subject: string = 'math', 
  accessKey?: string,
  language: Language = 'zh-cn',
  aiMode: AiMode = 'solver',
  imageData?: string,
  imageKey?: string,
  customPromptPrefix?: string,
  useSearch: boolean = false,
  onChunk?: (chunk: string) => void // NEW: Streaming support
): Promise<{answer: string, tokens: number}> => {
  
  const providerConfig = await getAiProviderConfig();
  const textModel = providerConfig.textModel || 'deepseek-ai/DeepSeek-V3';
  const visionModel = providerConfig.visionModel || 'Qwen/Qwen3-VL-30B-A3B-Instruct';

  const modelToUse = imageData ? visionModel : textModel;

  let promptContent = '';
  if (aiMode === 'normal') {
    promptContent = problem;
  } else {
    let prefix = customPromptPrefix;
    if (prefix === null || prefix === undefined) {
       const promptSet = prompts[language];
       prefix = (subject === 'chinese' ? promptSet.chinesePrefix : (subject === 'english' ? promptSet.englishPrefix : promptSet.userPrefix));
    }
    promptContent = `${prefix}${problem}`;
    if (levelLabel) {
      const methodText = language === 'en' ? 'Solve using methods for' : '用';
      const methodSuffix = language === 'en' ? '.' : '的方法解答。';
      promptContent += ` ${methodText}${levelLabel}${methodSuffix}`;
    }
  }

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    imageData ? { 
      role: "user", 
      content: [
        { type: "image_url", image_url: { url: imageData } },
        { type: "text", text: promptContent }
      ] 
    } : { role: "user", content: promptContent }
  ];

  const body: any = {
    model: modelToUse,
    messages: messages,
    temperature: 0.7
  };
  
  if (useSearch && !imageData) {
    body.tools = [{ type: 'web_search' }];
  }

  return callChatProxy(body, onChunk);
};

export const testAiConnection = async (): Promise<{answer: string, model: string}> => {
  const providerConfig = await getAiProviderConfig();
  const textModel = providerConfig.textModel || 'deepseek-ai/DeepSeek-V3';

  const body = {
    model: textModel,
    messages: [
      { role: "user", content: "Identify model version. Answer in format: '我是 [模型版本名称] 版本的 AI'." }
    ],
    temperature: 0.1
  };

  const { answer } = await callChatProxy(body);
  return { answer, model: textModel };
};

export const continueConversation = async (
  currentMessages: Message[],
  newMessage: string,
  accessKey?: string,
  onChunk?: (chunk: string) => void // NEW: Streaming support
): Promise<{answer: string, tokens: number}> => {
  const providerConfig = await getAiProviderConfig();
  const contextLimit = await getFollowUpContextLimit();
  const textModel = providerConfig.textModel || 'deepseek-ai/DeepSeek-V3';

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
    temperature: 0.7
  };

  return callChatProxy(body, onChunk);
};
