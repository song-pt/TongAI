
import React from 'react';
import { Sparkles } from 'lucide-react';
import LanguageSwitcher from './LanguageSwitcher';
import { Language } from '../types';

interface HeaderProps {
  title: string;
  language: Language;
  onLanguageChange: (lang: Language) => void;
}

const Header: React.FC<HeaderProps> = ({ title, language, onLanguageChange }) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/50 backdrop-blur-sm border-b border-gray-100 transition-all duration-300">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 p-1.5 rounded-lg text-white shadow-sm">
            <Sparkles className="w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold text-gray-800 tracking-tight">
            {title}
          </h1>
        </div>
        <div>
          <LanguageSwitcher currentLanguage={language} onLanguageChange={onLanguageChange} variant="light" />
        </div>
      </div>
    </header>
  );
};

export default Header;
