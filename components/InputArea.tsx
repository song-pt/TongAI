
import React, { useState, useRef, useEffect } from 'react';
import { ArrowUp, Loader2, GraduationCap, BookOpenText, Image as ImageIcon, X } from 'lucide-react';
import { translations } from '../utils/translations';
import { Language, AiMode } from '../types';

interface InputAreaProps {
  onSend: (message: string, grade: string, subject: string, imageData?: string) => void;
  isLoading: boolean;
  onSubjectChange?: (subject: string) => void;
  language: Language;
  aiMode?: AiMode;
  isImageAuthenticated: boolean;
  onRequestImageAuth: () => void;
}

const InputArea: React.FC<InputAreaProps> = ({ 
  onSend, 
  isLoading, 
  onSubjectChange, 
  language, 
  aiMode = 'solver',
  isImageAuthenticated,
  onRequestImageAuth
}) => {
  const [input, setInput] = useState('');
  const [grade, setGrade] = useState('');
  const [subject, setSubject] = useState('math');
  const [selectedImage, setSelectedImage] = useState<string | null>(null); // Base64 string
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = translations[language];

  const isSolverMode = aiMode === 'solver';

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((input.trim() || selectedImage) && !isLoading) {
      // If we have an image but no input text, we can still send just the image prompt implicitly
      // But typically we want context. If blank, we can send a default like "Solve this".
      const textToSend = input.trim() || (selectedImage ? (language === 'en' ? "Please solve this." : "请解答这张图片的内容。") : "");
      
      onSend(textToSend, grade, subject, selectedImage || undefined);
      
      setInput('');
      setSelectedImage(null); // Clear image after send
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

  // Handle Image Selection
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
    // Reset input so same file can be selected again if needed
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

  const subjects = [
    { value: 'math', label: t.subjectMath },
    { value: 'chinese', label: t.subjectChinese },
    { value: 'english', label: t.subjectEnglish },
  ];

  const getSubjectStyles = (sub: string) => {
    switch (sub) {
      case 'math':
        return 'text-blue-700 bg-blue-50 border-blue-100';
      case 'chinese':
        return 'text-emerald-700 bg-emerald-50 border-emerald-100';
      case 'english':
        return 'text-violet-700 bg-violet-50 border-violet-100';
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  const getSubjectIconColor = (sub: string) => {
    switch (sub) {
      case 'math': return 'text-blue-600';
      case 'chinese': return 'text-emerald-600';
      case 'english': return 'text-violet-600';
      default: return 'text-gray-600';
    }
  };

  const getPlaceholder = (sub: string) => {
    if (!isSolverMode) return t.placeholderDefault;
    switch (sub) {
      case 'math': return t.placeholderMath;
      case 'chinese': return t.placeholderChinese;
      case 'english': return t.placeholderEnglish;
      default: return t.placeholderDefault;
    }
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
                  <BookOpenText className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 ${getSubjectIconColor(subject)} pointer-events-none`} />
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
                    {subjects.map((s) => (
                      <option key={s.value} value={s.value}>
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