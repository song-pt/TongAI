
import React, { useState, useRef, useEffect } from 'react';
import { ArrowUp, Loader2, GraduationCap, BookOpenText, Image as ImageIcon, X, 
  Calculator, PenTool, Languages, Atom, Globe, Music, Code, Palette, BookOpen } from 'lucide-react';
import { translations } from '../utils/translations';
import { Language, AiMode, Subject } from '../types';

interface InputAreaProps {
  onSend: (message: string, grade: string, subject: string, imageData?: string) => void;
  isLoading: boolean;
  onSubjectChange?: (subject: string) => void;
  language: Language;
  aiMode?: AiMode;
  isImageAuthenticated: boolean;
  onRequestImageAuth: () => void;
  availableSubjects: Subject[];
}

// Helper to map icon string to Component
export const getIconComponent = (iconName: string, className?: string) => {
  const props = { className };
  switch (iconName) {
    case 'calculator': return <Calculator {...props} />;
    case 'pen': return <PenTool {...props} />;
    case 'languages': return <Languages {...props} />;
    case 'atom': return <Atom {...props} />;
    case 'globe': return <Globe {...props} />;
    case 'music': return <Music {...props} />;
    case 'code': return <Code {...props} />;
    case 'palette': return <Palette {...props} />;
    case 'book': default: return <BookOpen {...props} />;
  }
};

const InputArea: React.FC<InputAreaProps> = ({ 
  onSend, 
  isLoading, 
  onSubjectChange, 
  language, 
  aiMode = 'solver',
  isImageAuthenticated,
  onRequestImageAuth,
  availableSubjects
}) => {
  const [input, setInput] = useState('');
  const [grade, setGrade] = useState('');
  
  // Default to first subject or math
  const [subject, setSubject] = useState(availableSubjects.length > 0 ? availableSubjects[0].code : 'math');
  
  const [selectedImage, setSelectedImage] = useState<string | null>(null); // Base64 string
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = translations[language];

  // Update subject if availableSubjects changes (e.g. initial load) and current selection is invalid
  useEffect(() => {
    if (availableSubjects.length > 0) {
      const exists = availableSubjects.find(s => s.code === subject);
      if (!exists) {
        setSubject(availableSubjects[0].code);
        onSubjectChange?.(availableSubjects[0].code);
      }
    }
  }, [availableSubjects]);

  const isSolverMode = aiMode === 'solver';

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((input.trim() || selectedImage) && !isLoading) {
      const textToSend = input.trim() || (selectedImage ? (language === 'en' ? "Please solve this." : "请解答这张图片的内容。") : "");
      onSend(textToSend, grade, subject, selectedImage || undefined);
      setInput('');
      setSelectedImage(null);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleImageClick = () => {
    if (!isImageAuthenticated) {
      onRequestImageAuth();
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setSelectedImage(base64String);
      };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = () => {
    setSelectedImage(null);
  };

  const grades = [
    { value: '', label: t.gradeUnlimited },
    { value: '1', label: t.grade1 },
    { value: '2', label: t.grade2 },
    { value: '3', label: t.grade3 },
    { value: '4', label: t.grade4 },
    { value: '5', label: t.grade5 },
    { value: '6', label: t.grade6 },
    { value: '7', label: t.grade7 },
    { value: '8', label: t.grade8 },
    { value: '9', label: t.grade9 },
  ];

  // Helper to get tailwind classes based on color name
  const getSubjectStyles = (subCode: string) => {
    const sub = availableSubjects.find(s => s.code === subCode);
    const color = sub?.color || 'indigo';
    
    // Manual mapping for safelist
    switch (color) {
      case 'emerald': return 'text-emerald-700 bg-emerald-50 border-emerald-100';
      case 'violet': return 'text-violet-700 bg-violet-50 border-violet-100';
      case 'rose': return 'text-rose-700 bg-rose-50 border-rose-100';
      case 'amber': return 'text-amber-700 bg-amber-50 border-amber-100';
      case 'sky': return 'text-sky-700 bg-sky-50 border-sky-100';
      case 'indigo': default: return 'text-indigo-700 bg-indigo-50 border-indigo-100';
    }
  };

  const getSubjectIconColor = (subCode: string) => {
    const sub = availableSubjects.find(s => s.code === subCode);
    const color = sub?.color || 'indigo';
    switch (color) {
      case 'emerald': return 'text-emerald-600';
      case 'violet': return 'text-violet-600';
      case 'rose': return 'text-rose-600';
      case 'amber': return 'text-amber-600';
      case 'sky': return 'text-sky-600';
      case 'indigo': default: return 'text-indigo-600';
    }
  };

  const getPlaceholder = (subCode: string) => {
    if (!isSolverMode) return t.placeholderDefault;
    const sub = availableSubjects.find(s => s.code === subCode);
    if (!sub) return t.placeholderDefault;
    
    // Fallback to legacy translations for standard keys if possible, else generic
    if (sub.code === 'math') return t.placeholderMath;
    if (sub.code === 'chinese') return t.placeholderChinese;
    if (sub.code === 'english') return t.placeholderEnglish;
    return `${t.placeholderDefault} (${sub.label})`;
  };

  return (
    <div className="w-full max-w-3xl mx-auto transition-all duration-300 ease-in-out">
      <form 
        onSubmit={handleSubmit} 
        className={`
          relative flex flex-col gap-2 p-2 bg-white rounded-2xl border transition-all duration-300
          ${isLoading ? 'border-gray-200 shadow-sm' : 'border-gray-300 shadow-lg hover:shadow-xl hover:border-indigo-300 focus-within:ring-4 focus-within:ring-indigo-100 focus-within:border-indigo-500'}
        `}
      >
        <div className="flex items-end gap-2">
            {isSolverMode && (
              <div className="flex-shrink-0 mb-2 ml-2 flex gap-2 flex-wrap sm:flex-nowrap">
                {/* Subject Selector */}
                <div className="relative group">
                  <div className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 ${getSubjectIconColor(subject)} pointer-events-none flex items-center justify-center`}>
                     {/* Try to find icon */}
                     {getIconComponent(availableSubjects.find(s => s.code === subject)?.icon || 'book', 'w-4 h-4')}
                  </div>
                  <select
                    value={subject}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSubject(val);
                      onSubjectChange?.(val);
                    }}
                    disabled={isLoading}
                    className={`
                      appearance-none pl-9 pr-8 py-2 border rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors cursor-pointer
                      ${getSubjectStyles(subject)}
                    `}
                  >
                    {availableSubjects.map((s) => (
                      <option key={s.code} value={s.code}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>

                {/* Grade Selector */}
                <div className="relative group">
                  <GraduationCap className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 ${grade ? 'text-indigo-600' : 'text-gray-400'} pointer-events-none`} />
                  <select
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    disabled={isLoading}
                    className={`
                      appearance-none pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors cursor-pointer
                      ${grade ? 'text-indigo-700 bg-indigo-50 border-indigo-100' : 'text-gray-600 hover:bg-gray-100'}
                    `}
                  >
                    {grades.map((g) => (
                      <option key={g.value} value={g.value}>
                        {g.label}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>
            )}

            {isSolverMode && (
              <div className="w-px h-8 bg-gray-200 mb-3 mx-1 self-end hidden sm:block"></div>
            )}

            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={getPlaceholder(subject)}
              className="w-full min-h-[56px] max-h-[200px] py-4 px-2 bg-transparent border-none focus:ring-0 resize-none outline-none text-gray-800 placeholder-gray-400 text-lg leading-relaxed"
              rows={1}
              disabled={isLoading}
            />

            {/* Hidden File Input */}
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/png, image/jpeg, image/jpg, image/webp"
              onChange={handleFileChange}
            />

            {/* Image Upload Button */}
            <button
              type="button"
              onClick={handleImageClick}
              disabled={isLoading}
              className={`
                flex-shrink-0 flex items-center justify-center w-10 h-10 mb-2 rounded-xl transition-all duration-200
                ${isLoading ? 'opacity-50 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-100 hover:text-indigo-600'}
              `}
              title="上传图片"
            >
              <ImageIcon className="w-5 h-5" />
            </button>

            <button
              type="submit"
              disabled={(!input.trim() && !selectedImage) || isLoading}
              className={`
                flex-shrink-0 flex items-center justify-center w-10 h-10 mb-2 mr-2 rounded-xl transition-all duration-200
                ${(!input.trim() && !selectedImage) || isLoading 
                  ? 'bg-gray-100 text-gray-300 cursor-not-allowed' 
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md active:scale-95'}
              `}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <ArrowUp className="w-5 h-5" />
              )}
            </button>
        </div>
        
        {/* Image Preview Area */}
        {selectedImage && (
          <div className="px-2 pb-2">
            <div className="relative inline-block">
              <img src={selectedImage} alt="Preview" className="h-20 w-auto rounded-lg border border-gray-200 shadow-sm object-cover" />
              <button 
                type="button" 
                onClick={removeImage}
                className="absolute -top-2 -right-2 bg-gray-800 text-white rounded-full p-1 hover:bg-red-600 transition-colors shadow-md"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

export default InputArea;
