
import React, { useState } from 'react';
import { Lock, ArrowRight, ShieldCheck, User, MapPin } from 'lucide-react';
import { loginUser, verifyAdminPassword } from '../services/supabase';
import LanguageSwitcher from './LanguageSwitcher';
import { translations } from '../utils/translations';
import { Language } from '../types';

interface LockScreenProps {
  onUnlock: (isAdmin: boolean, code?: string) => void;
  language: Language;
  onLanguageChange: (lang: Language) => void;
}

const provinces = [
  '北京', '天津', '河北', '山西', '内蒙古', '辽宁', '吉林', '黑龙江', 
  '上海', '江苏', '浙江', '安徽', '福建', '江西', '山东', '河南', 
  '湖北', '湖南', '广东', '广西', '海南', '重庆', '四川', '贵州', 
  '云南', '西藏', '陕西', '甘肃', '青海', '宁夏', '新疆', '香港', 
  '澳门', '台湾', '海外/Other'
];

const LockScreen: React.FC<LockScreenProps> = ({ onUnlock, language, onLanguageChange }) => {
  const [password, setPassword] = useState('');
  const [location, setLocation] = useState(provinces[0]); // Default to Beijing
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const t = translations[language];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setLoading(true);
    setError('');

    try {
      if (isAdminMode) {
        // Database Admin Check (Falls back to env if DB config missing)
        const isValid = await verifyAdminPassword(password);
        if (isValid) {
          onUnlock(true); // Is Admin
        } else {
          setError(t.adminPasswordError);
        }
      } else {
        // Database User Check with Location
        const success = await loginUser(password.trim(), location);
        if (success) {
          onUnlock(false, password.trim()); // Pass the code back
        } else {
          setError(t.invalidKey);
        }
      }
    } catch (err) {
      setError(t.loginError);
    } finally {
      setLoading(false);
    }
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

          <form onSubmit={handleSubmit} className="w-full space-y-4">
            {!isAdminMode && (
              <div className="relative">
                 <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                   <MapPin className="w-5 h-5" />
                 </div>
                 <select 
                   value={location}
                   onChange={(e) => setLocation(e.target.value)}
                   className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 text-gray-800 focus:border-indigo-500 focus:bg-white outline-none appearance-none cursor-pointer font-medium"
                 >
                   {provinces.map(p => (
                     <option key={p} value={p}>{p}</option>
                   ))}
                 </select>
                 <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                 </div>
              </div>
            )}

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

          <button 
            onClick={() => {
              setIsAdminMode(!isAdminMode);
              setPassword('');
              setError('');
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
