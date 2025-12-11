
import React from 'react';
import { Sparkles, Search } from 'lucide-react';
import LanguageSwitcher from './LanguageSwitcher';
import { Language } from '../types';

interface HeaderProps {
  title: string;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  onSearchClick: () => void;
  isSearchOpen: boolean;
  appLogo?: string; // Optional custom logo (base64)
}

const Header: React.FC<HeaderProps> = ({ title, language, onLanguageChange, onSearchClick, isSearchOpen, appLogo }) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/50 backdrop-blur-sm border-b border-gray-100 transition-all duration-300">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {appLogo ? (
            <img src={appLogo} alt="Logo" className="w-8 h-8 rounded-lg object-contain bg-transparent shadow-sm" />
          ) : (
            <div className="bg-indigo-600 p-1.5 rounded-lg text-white shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
          )}
          <h1 className="text-xl font-bold text-gray-800 tracking-tight hidden sm:block">
            {title}
          </h1>
        </div>
        
        <div className="flex items-center gap-4">
           {/* Search Button */}
           <button 
             onClick={onSearchClick}
             className={`p-2 rounded-full transition-colors duration-200 ${isSearchOpen ? 'bg-indigo-100 text-indigo-600' : 'text-gray-500 hover:bg-gray-100'}`}
             title="Search"
           >
             <Search className="w-5 h-5" />
           </button>

          <LanguageSwitcher currentLanguage={language} onLanguageChange={onLanguageChange} variant="light" />
        </div>
      </div>
    </header>
  );
};

export default Header;
