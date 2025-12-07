import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

interface MathRendererProps {
  content: string;
}

const MathRenderer: React.FC<MathRendererProps> = ({ content }) => {
  // Preprocess the content to replace \[ ... \] with $$ ... $$ and \( ... \) with $ ... $
  // This helps when the AI model returns LaTeX with standard TeX delimiters instead of the Markdown-friendly $ ones.
  const preprocessLaTeX = (text: string) => {
    if (!text) return "";
    
    // Replace block math \[ ... \] with $$ ... $$
    // We use [\s\S]*? to match across newlines non-greedily
    const blockReplaced = text.replace(/\\\[([\s\S]*?)\\\]/g, '$$$$$1$$$$');
    
    // Replace inline math \( ... \) with $ ... $
    const inlineReplaced = blockReplaced.replace(/\\\(([\s\S]*?)\\\)/g, '$$$1$$');
    
    return inlineReplaced;
  };

  const processedContent = preprocessLaTeX(content);

  return (
    <div className="prose prose-slate max-w-none dark:prose-invert prose-p:leading-relaxed prose-pre:bg-gray-100 dark:prose-pre:bg-gray-800 break-words">
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        // Configure rehypeKatex to output 'html' only. 
        // Default is 'htmlAndMathml', which can cause duplicate rendering if the browser renders MathML visibly alongside the KaTeX HTML.
        rehypePlugins={[[rehypeKatex, { output: 'html' }]] as any}
        components={{
          // Override paragraph to handle math blocks better. We rename unused 'node' to '_node'.
          p: ({ node: _node, ...props }) => <p className="mb-4 text-gray-800 dark:text-gray-200" {...props} />,
          li: ({ node: _node, ...props }) => <li className="text-gray-800 dark:text-gray-200" {...props} />,
          strong: ({ node: _node, ...props }) => <strong className="font-semibold text-indigo-700 dark:text-indigo-400" {...props} />,
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
};

export default MathRenderer;