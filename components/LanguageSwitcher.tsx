
import React from 'react';
import { Globe } from 'lucide-react';
import { Language } from '../types';

interface LanguageSwitcherProps {
  currentLanguage: Language;
  onLanguageChange: (lang: Language) => void;
  variant?: 'light' | 'dark';
}

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ currentLanguage, onLanguageChange, variant = 'light' }) => {
  const isLight = variant === 'light';
  
  return (
    <div className="flex items-center gap-1">
      <Globe className={`w-4 h-4 ${isLight ? 'text-gray-500' : 'text-gray-400'}`} />
      <select
        value={currentLanguage}
        onChange={(e) => onLanguageChange(e.target.value as Language)}
        className={`bg-transparent text-sm font-medium focus:outline-none cursor-pointer ${
          isLight ? 'text-gray-600 hover:text-indigo-600' : 'text-gray-400 hover:text-white'
        }`}
      >
        <option value="zh-cn">简体中文</option>
        <option value="zh-tw">繁體中文</option>
        <option value="en">English</option>
      </select>
    </div>
  );
};

export default LanguageSwitcher;
