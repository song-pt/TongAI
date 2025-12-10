
// Manually define ImportMetaEnv to fix missing vite/client types
declare global {
  interface ImportMetaEnv {
    VITE_SILICONFLOW_API_KEY: string;
    VITE_SILICONFLOW_BASE_URL: string;
    VITE_SUPABASE_URL: string;
    VITE_SUPABASE_ANON_KEY: string;
    VITE_ADMIN_PASSWORD: string;
    [key: string]: any;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

// Helper function to safely get environment variables
const getEnv = (key: string, defaultValue: string = ''): string => {
  try {
    // Check if import.meta.env exists (it might be undefined in raw ESM environments)
    // We use a safe check pattern here
    const env = import.meta.env;
    if (env && typeof env === 'object') {
      return env[key] || defaultValue;
    }
  } catch (e) {
    console.warn('Error reading environment variable:', key);
  }
  return defaultValue;
};

// API Configuration using Environment Variables
export const SILICONFLOW_API_KEY = getEnv('VITE_SILICONFLOW_API_KEY');

export const SILICONFLOW_BASE_URL = getEnv('VITE_SILICONFLOW_BASE_URL', 'https://api.siliconflow.cn/v1');

export const AI_MODEL = 'deepseek-ai/DeepSeek-V3'; 
export const AI_VISION_MODEL = 'Qwen/Qwen3-VL-30B-A3B-Instruct';

// Supabase Configuration
export const SUPABASE_URL = getEnv('VITE_SUPABASE_URL');
export const SUPABASE_ANON_KEY = getEnv('VITE_SUPABASE_ANON_KEY');

// Admin Password
export const ADMIN_PASSWORD = getEnv('VITE_ADMIN_PASSWORD', '114514');

export const SYSTEM_PROMPT = "You are a helpful and patient tutor. Solve the problem clearly, showing all steps. \n\nIMPORTANT FORMATTING RULES:\n1. If the subject is Math, you MUST output mathematical expressions using LaTeX format.\n2. Enclose inline math in single dollar signs like $E=mc^2$.\n3. Enclose block math in double dollar signs like $$\\frac{a}{b}$$.\n4. Do NOT use \\( \\) or \\[ \\] delimiters.\n5. Do NOT output raw LaTeX commands like \\sqrt{} without enclosing them in dollar signs.\n6. CRITICAL: Do NOT repeat the formula in plain text if you have provided the LaTeX version. For example, do not write 'x equals 2 ($x=2$)'. Just write '$x=2$'.";

export const USER_PROMPT_PREFIX = "请一步步思考，详细列出计算步骤，并反复验证，确保结果精确。使用与当前年级所学知识匹配的解法解题。要有理解题目，步骤拆解，验证过程，结论表述，最终答案。这五个步骤，如果学生问了与学习无关或者其他科目问题，请拒绝回答，以下是题目：";

export const CHINESE_PROMPT_PREFIX = "请作为一位经验丰富的语文教育专家，针对我提供的文本或题目，进行全方位、深层次的解析。在文言文方面，请注重字词句翻译、文化背景与主旨的阐释；在阅读理解方面，请深入分析文章结构、修辞手法、表达技巧及文本主题的深刻内涵；在作文方面，请从审题立意、结构布局、论证思路或文学性等方面提供具体且可操作的指导建议和优化方向。请务必结合考点和学科核心素养，给出详尽、准确且富有启发性的专业解答。如果学生问了与学习无关或者其他科目问题，请拒绝回答，以下是题目：";

export const ENGLISH_PROMPT_PREFIX = "请作为一位专业的英语语言学导师，全面分析我提供的英语文本或题目。在阅读理解方面，请重点剖析文章的主旨大意、段落逻辑关系、关键信息点及作者的隐含态度；在写作方面，请从主题表达、句式多样性、词汇准确性与高级运用、以及逻辑连贯性等方面，提供具体的优化建议和提升策略；在语法与词汇方面，请指出核心语法结构，并解释其在语境中的恰当用法。请确保您的解答准确、深入且具有实战指导意义。如果学生问了与学习无关或者其他科目问题，请拒绝回答，以下是题目：";
