
import React, { useState, useRef, useEffect } from 'react';
import { ArrowUp, Loader2, GraduationCap, BookOpenText, Image as ImageIcon, X, 
  Calculator, PenTool, Languages, Atom, Globe, Music, Code, Palette, BookOpen, Infinity as InfinityIcon } from 'lucide-react';
import { translations } from '../utils/translations';
import { Language, AiMode, Subject, KeyUsageData, ImageKeyUsageData, Level } from '../types';

interface InputAreaProps {
  onSend: (message: string, grade: string, subject: string, imageData?: string, useSearch?: boolean) => void;
  isLoading: boolean;
  onSubjectChange?: (subject: string) => void;
  language: Language;
  aiMode?: AiMode;
  isImageAuthenticated: boolean;
  onRequestImageAuth: () => void;
  availableSubjects: Subject[];
  availableLevels?: Level[]; // NEW: Dynamic Levels
  showUsage?: boolean;
  keyUsage?: KeyUsageData | null;
  imageKeyUsage?: ImageKeyUsageData | null;
  isFollowUp?: boolean; // New Prop for Simple Mode
  allowWebSearch?: boolean; // NEW: Control visibility of search button
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
  availableSubjects,
  availableLevels = [], // Default empty
  showUsage,
  keyUsage,
  imageKeyUsage,
  isFollowUp = false,
  allowWebSearch = false
}) => {
  const [input, setInput] = useState('');
  const [grade, setGrade] = useState('');
  
  // Default to first subject or math
  const [subject, setSubject] = useState(availableSubjects.length > 0 ? availableSubjects[0].code : 'math');
  
  const [selectedImage, setSelectedImage] = useState<string | null>(null); // Base64 string
  const [useSearch, setUseSearch] = useState(false);

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
      onSend(textToSend, grade, subject, selectedImage || undefined, useSearch);
      setInput('');
      setSelectedImage(null);
      // Don't reset search state, user might want to keep it on
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
        // Disable search if image is selected (API limitation usually)
        setUseSearch(false);
      };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = () => {
    setSelectedImage(null);
  };

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
    if (isFollowUp) return t.followUpPlaceholder;
    if (!isSolverMode) return t.placeholderDefault;
    const sub = availableSubjects.find(s => s.code === subCode);
    if (!sub) return t.placeholderDefault;
    
    // Fallback to legacy translations for standard keys if possible, else generic
    if (sub.code === 'math') return t.placeholderMath;
    if (sub.code === 'chinese') return t.placeholderChinese;
    if (sub.code === 'english') return t.placeholderEnglish;
    return `${t.placeholderDefault} (${sub.label})`;
  };

  // Usage Progress Calculation (Main Key)
  let usagePercent = 0;
  let usageColor = 'bg-blue-500';
  if (showUsage && keyUsage && keyUsage.token_limit) {
    usagePercent = Math.min((keyUsage.total_tokens / keyUsage.token_limit) * 100, 100);
    if (usagePercent > 90) usageColor = 'bg-red-500';
    else if (usagePercent > 70) usageColor = 'bg-amber-500';
  }

  // Image Usage Percentage
  let imgPercent = 0;
  let imgColor = 'bg-pink-500';
  if (showUsage && imageKeyUsage && imageKeyUsage.image_limit) {
    imgPercent = Math.min((imageKeyUsage.total_images / imageKeyUsage.image_limit) * 100, 100);
    if (imgPercent > 90) imgColor = 'bg-red-500';
    else if (imgPercent > 70) imgColor = 'bg-amber-500';
  }

  // Render Selectors Helper
  const renderSelectors = (isMobileView: boolean) => (
    <div className={isMobileView ? "flex gap-2 mb-2 px-1" : "flex-shrink-0 mb-2 ml-2 flex gap-2 flex-wrap sm:flex-nowrap"}>
        {/* Subject Selector */}
        <div className={`relative group ${isMobileView ? 'flex-1' : ''}`}>
            <div className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 ${getSubjectIconColor(subject)} pointer-events-none flex items-center justify-center`}>
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
                ${isMobileView ? 'w-full' : ''}
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

        {/* Level/Grade Selector */}
        <div className={`relative group ${isMobileView ? 'flex-1' : ''}`}>
            <GraduationCap className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 ${grade ? 'text-indigo-600' : 'text-gray-400'} pointer-events-none`} />
            <select
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            disabled={isLoading}
            className={`
                appearance-none pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors cursor-pointer
                ${isMobileView ? 'w-full' : ''}
                ${grade ? 'text-indigo-700 bg-indigo-50 border-indigo-100' : 'text-gray-600 hover:bg-gray-100'}
            `}
            >
            <option value="">{t.gradeUnlimited}</option>
            {availableLevels.map((l) => (
                <option key={l.code} value={l.code}>
                {l.label}
                </option>
            ))}
            </select>
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
        </div>
    </div>
  );

  return (
    <div className="w-full max-w-3xl mx-auto transition-all duration-300 ease-in-out">
      <form 
        onSubmit={handleSubmit} 
        className={`
          relative flex flex-col gap-2 p-2 bg-white rounded-2xl border transition-all duration-300
          ${isLoading ? 'border-gray-200 shadow-sm' : 'border-gray-300 shadow-lg hover:shadow-xl hover:border-indigo-300 focus-within:ring-4 focus-within:ring-indigo-100 focus-within:border-indigo-500'}
        `}
      >
        {/* Mobile View: Selectors Top (Only show if not follow-up) */}
        {!isFollowUp && isSolverMode && (
           <div className="sm:hidden">
              {renderSelectors(true)}
           </div>
        )}

        <div className="flex items-end gap-2">
            {!isFollowUp && isSolverMode && (
              <div className="hidden sm:block">
                 {renderSelectors(false)}
              </div>
            )}

            {!isFollowUp && isSolverMode && (
              <div className="w-px h-8 bg-gray-200 mb-3 mx-1 self-end hidden sm:block"></div>
            )}

            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={getPlaceholder(subject)}
              className="flex-1 w-full min-h-[56px] max-h-[200px] py-4 px-2 bg-transparent border-none focus:ring-0 resize-none outline-none text-gray-800 placeholder-gray-400 text-lg leading-relaxed"
              rows={1}
              disabled={isLoading}
              autoFocus={isFollowUp}
            />

            {/* Hidden File Input */}
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/png, image/jpeg, image/jpg, image/webp"
              onChange={handleFileChange}
            />

            {/* Image Upload Button & Usage Wrapper */}
            <div className="flex flex-col items-center justify-end mb-2 gap-1">
              {showUsage && isImageAuthenticated && imageKeyUsage && !isFollowUp && (
                  <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-1 duration-300">
                      <span className="text-[9px] text-gray-400 font-mono leading-none mb-0.5">
                          {imageKeyUsage.total_images}/{imageKeyUsage.image_limit ?? <InfinityIcon className="w-2.5 h-2.5 inline align-middle"/>}
                      </span>
                      {imageKeyUsage.image_limit && (
                          <div className="w-8 h-1 bg-gray-100 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ${imgColor}`} 
                                style={{ width: `${imgPercent}%` }}
                              ></div>
                          </div>
                      )}
                  </div>
              )}
              
              {/* Web Search Button */}
              {allowWebSearch && !isFollowUp && !selectedImage && (
                  <button
                    type="button"
                    onClick={() => setUseSearch(!useSearch)}
                    disabled={isLoading}
                    className={`
                      flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200 relative
                      ${isLoading ? 'opacity-50 cursor-not-allowed' : 
                        useSearch ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' : 'text-gray-400 hover:bg-gray-100 hover:text-blue-600'}
                    `}
                    title={t.enableSearch}
                  >
                    <Globe className="w-5 h-5" />
                    {useSearch && (
                      <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
                    )}
                  </button>
              )}

              {!isFollowUp && (
                  <button
                    type="button"
                    onClick={handleImageClick}
                    disabled={isLoading}
                    className={`
                      flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200
                      ${isLoading ? 'opacity-50 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-100 hover:text-indigo-600'}
                    `}
                    title="上传图片"
                  >
                    <ImageIcon className="w-5 h-5" />
                  </button>
              )}
            </div>

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
        
        {/* Search Status Text */}
        {useSearch && !selectedImage && (
          <div className="px-3 pb-1 text-xs text-blue-600 font-medium flex items-center gap-1 animate-in fade-in">
             <Globe className="w-3 h-3" /> {t.searchEnabled}
          </div>
        )}

        {/* Main Token Usage Progress Bar (Bottom) */}
        {showUsage && keyUsage && !isFollowUp && (
          <div className="px-3 pb-1 border-t border-gray-100 pt-2 flex items-center gap-3">
             <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${usageColor}`} 
                  style={{ width: `${usagePercent}%` }}
                ></div>
             </div>
             <div className="text-[10px] font-medium text-gray-500 whitespace-nowrap flex items-center gap-1">
                <span>{language === 'en' ? 'Tokens:' : '额度:'}</span>
                <span className="text-gray-900">{keyUsage.total_tokens}</span>
                <span>/</span>
                {keyUsage.token_limit === null ? (
                   <InfinityIcon className="w-3 h-3 text-gray-400" />
                ) : (
                   <span>{keyUsage.token_limit}</span>
                )}
             </div>
          </div>
        )}
      </form>
    </div>
  );
};

export default InputArea;