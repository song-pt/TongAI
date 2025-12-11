

import React, { useState, useEffect } from 'react';
import { Lock, ArrowRight, ShieldCheck, User, LogIn, X } from 'lucide-react';
import { loginUser, verifyAdminPassword } from '../services/supabase';
import LanguageSwitcher from './LanguageSwitcher';
import { translations } from '../utils/translations';
import { Language } from '../types';

interface LockScreenProps {
  onUnlock: (isAdmin: boolean, code?: string) => void;
  language: Language;
  onLanguageChange: (lang: Language) => void;
}

const LockScreen: React.FC<LockScreenProps> = ({ onUnlock, language, onLanguageChange }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);
  
  // Quick Login State
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [showQuickLogin, setShowQuickLogin] = useState(false);

  const t = translations[language];

  useEffect(() => {
    // Check local storage for saved key
    const storedKey = localStorage.getItem('tongai_last_key');
    if (storedKey) {
      setSavedKey(storedKey);
      setShowQuickLogin(true);
    }
  }, []);

  const handleLogin = async (keyToUse: string) => {
    if (!keyToUse.trim()) return;

    setLoading(true);
    setError('');

    try {
      if (isAdminMode) {
        // Database Admin Check
        const isValid = await verifyAdminPassword(keyToUse);
        if (isValid) {
          onUnlock(true);
        } else {
          setError(t.adminPasswordError);
        }
      } else {
        // Database User Check (Location removed from UI, defaulting to Web User)
        const success = await loginUser(keyToUse.trim(), "Web User");
        if (success) {
          localStorage.setItem('tongai_last_key', keyToUse.trim());
          onUnlock(false, keyToUse.trim());
        } else {
          setError(t.invalidKey);
          if (showQuickLogin && keyToUse === savedKey) {
             // If quick login failed, maybe key expired or invalid
             setShowQuickLogin(false); // Fallback to manual input
          }
        }
      }
    } catch (err) {
      setError(t.loginError);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleLogin(password);
  };

  const handleQuickLogin = () => {
    if (savedKey) {
      handleLogin(savedKey);
    }
  };

  const switchToManual = () => {
    setShowQuickLogin(false);
    setPassword('');
    setError('');
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center p-4 z-[100]">
      <div className="absolute top-6 right-6">
        <LanguageSwitcher currentLanguage={language} onLanguageChange={onLanguageChange} variant="dark" />
      </div>
      <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-md p-8 animate-in fade-in zoom-in duration-300">
        <div className="flex flex-col items-center gap-6">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-2 transition-colors ${isAdminMode ? 'bg-purple-100 text-purple-600' : 'bg-indigo-100 text-indigo-600'}`}>
            {isAdminMode ? <ShieldCheck className="w-8 h-8" /> : <Lock className="w-8 h-8" />}
          </div>
          
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-gray-800">
              {isAdminMode ? t.adminLoginTitle : t.loginTitle}
            </h1>
            <p className="text-gray-500">
              {isAdminMode ? t.adminLoginSubtitle : t.loginSubtitle}
            </p>
          </div>

          {!isAdminMode && showQuickLogin && savedKey ? (
            <div className="w-full space-y-4 animate-in slide-in-from-bottom-4">
              <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100 text-center relative group">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">上次登录</p>
                <p className="text-xl font-mono font-bold text-indigo-700 tracking-wider">
                  {savedKey}
                </p>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    localStorage.removeItem('tongai_last_key');
                    switchToManual();
                  }}
                  className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                  title="忘记此密钥"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={handleQuickLogin}
                disabled={loading}
                className="w-full font-bold py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-all duration-200 transform active:scale-95 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
              >
                {loading ? (
                  <span>{t.verifying}</span>
                ) : (
                  <>
                    <span>使用此密钥登录</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
              
              <button 
                onClick={switchToManual}
                className="w-full text-sm text-gray-500 hover:text-indigo-600 font-medium py-2"
              >
                使用其他密钥登录
              </button>
              
              {error && (
                <p className="text-red-500 text-sm text-center animate-pulse">
                  {error}
                </p>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="w-full space-y-4 animate-in slide-in-from-bottom-4">
              <div>
                <input
                  type={isAdminMode ? "password" : "text"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  placeholder={isAdminMode ? t.placeholderAdmin : t.placeholderKey}
                  className={`w-full px-4 py-3 rounded-xl border-2 outline-none transition-all duration-200 text-center text-lg tracking-widest ${
                    error 
                      ? 'border-red-300 bg-red-50 text-red-900 placeholder-red-300 focus:border-red-500' 
                      : 'border-gray-200 bg-gray-50 text-gray-800 focus:border-indigo-500 focus:bg-white'
                  }`}
                  autoFocus
                  disabled={loading}
                />
                {error && (
                  <p className="text-red-500 text-sm text-center mt-2 animate-pulse">
                    {error}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full font-bold py-3 rounded-xl transition-all duration-200 transform active:scale-95 flex items-center justify-center gap-2 ${
                  isAdminMode 
                    ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                } ${loading ? 'opacity-70 cursor-wait' : ''}`}
              >
                {loading ? (
                  <span>{t.verifying}</span>
                ) : (
                  <>
                    <span>{isAdminMode ? t.enterAdmin : t.enterSystem}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          <button 
            onClick={() => {
              setIsAdminMode(!isAdminMode);
              setPassword('');
              setError('');
              if (!isAdminMode) {
                 setShowQuickLogin(false); // Hide quick login when switching TO admin
              } else {
                 // Check stored key when switching back TO user
                 const storedKey = localStorage.getItem('tongai_last_key');
                 if (storedKey) setShowQuickLogin(true);
              }
            }}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1"
          >
            {isAdminMode ? <User className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3" />}
            {isAdminMode ? t.switchToUser : t.switchToAdmin}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LockScreen;
