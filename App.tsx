
import React, { useState, useEffect, useMemo } from 'react';
import { solveMathProblem } from './services/api';
import { fetchChatHistory, saveChatMessage, getAppTitle, getAiMode, verifyImageKey, fetchSubjects, getAppLogo } from './services/supabase';
import MathRenderer from './components/MathRenderer';
import InputArea, { getIconComponent } from './components/InputArea';
import Header from './components/Header';
import LockScreen from './components/LockScreen';
import AdminDashboard from './components/AdminDashboard';
import BackgroundEffects from './components/BackgroundEffects';
import ImageAuthModal from './components/ImageAuthModal';
import { BrainCircuit, BookOpen, PenTool, Languages, Search, X } from 'lucide-react';
import { Language, AiMode, Subject } from './types';
import { translations } from './utils/translations';

interface SolutionItem {
  id: string;
  question: string;
  gradeLabel?: string;
  subject: string;
  answer: string;
  timestamp: number;
}

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userKey, setUserKey] = useState<string>(''); 
  const [history, setHistory] = useState<SolutionItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);
  const [currentSubject, setCurrentSubject] = useState('math');
  const [appTitle, setAppTitle] = useState('TongAI');
  const [appLogo, setAppLogo] = useState('');
  const [language, setLanguage] = useState<Language>('zh-cn');
  const [aiMode, setAiMode] = useState<AiMode>('solver');
  
  // Dynamic Subjects State
  const [subjects, setSubjects] = useState<Subject[]>([]);
  
  // Search State
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Image Auth State
  const [isImageAuthenticated, setIsImageAuthenticated] = useState(false);
  const [showImageAuthModal, setShowImageAuthModal] = useState(false);
  const [imageKey, setImageKey] = useState<string>('');

  const t = translations[language];

  // Load Language Preference
  useEffect(() => {
    const savedLang = localStorage.getItem('tongai_lang');
    if (savedLang && ['zh-cn', 'zh-tw', 'en'].includes(savedLang)) {
      setLanguage(savedLang as Language);
    }
  }, []);

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('tongai_lang', lang);
  };

  // Load Global Config (Title, Mode, Logo, Subjects)
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const title = await getAppTitle();
        setAppTitle(title);
        document.title = title;
        
        const mode = await getAiMode();
        setAiMode(mode);

        const logo = await getAppLogo();
        setAppLogo(logo);
        
        const subs = await fetchSubjects();
        setSubjects(subs);
        
        // Ensure currentSubject is valid
        if (subs.length > 0 && !subs.find(s => s.code === currentSubject)) {
          setCurrentSubject(subs[0].code);
        }
      } catch (e) {
        console.error("Failed to load app config");
      }
    };
    loadConfig();
  }, [isAuthenticated]); 

  // Load history from cloud when user logs in
  useEffect(() => {
    if (isAuthenticated && !isAdmin && userKey) {
      const loadHistory = async () => {
        setIsHistoryLoading(true);
        try {
          const cloudHistory = await fetchChatHistory(userKey);
          const formattedHistory: SolutionItem[] = cloudHistory.map(item => ({
            id: item.id,
            question: item.question,
            gradeLabel: item.grade_label || undefined, 
            subject: item.subject,
            answer: item.answer,
            timestamp: new Date(item.created_at).getTime()
          }));
          setHistory(formattedHistory);
        } catch (error) {
          console.error("Failed to load history", error);
        } finally {
          setIsHistoryLoading(false);
        }
      };
      loadHistory();
    }
  }, [isAuthenticated, isAdmin, userKey]);

  // Filter History Logic
  const filteredHistory = useMemo(() => {
    if (!searchQuery.trim()) return history;
    const lowerQuery = searchQuery.toLowerCase();
    return history.filter(item => {
      const dateString = new Date(item.timestamp).toLocaleString(language === 'en' ? 'en-US' : 'zh-CN');
      return (
        item.question.toLowerCase().includes(lowerQuery) ||
        item.answer.toLowerCase().includes(lowerQuery) ||
        (item.gradeLabel && item.gradeLabel.toLowerCase().includes(lowerQuery)) ||
        dateString.toLowerCase().includes(lowerQuery)
      );
    });
  }, [history, searchQuery, language]);

  const getGradeLabel = (grade: string): string | undefined => {
    if (!grade) return undefined;
    const gradeMapZh: Record<string, string> = {
      '1': '一年级', '2': '二年级', '3': '三年级',
      '4': '四年级', '5': '五年级', '6': '六年级',
      '7': '七年级', '8': '八年级', '9': '九年级'
    };
    const gradeMapEn: Record<string, string> = {
      '1': 'Grade 1', '2': 'Grade 2', '3': 'Grade 3',
      '4': 'Grade 4', '5': 'Grade 5', '6': 'Grade 6',
      '7': 'Grade 7', '8': 'Grade 8', '9': 'Grade 9'
    };
    const map = language === 'en' ? gradeMapEn : gradeMapZh;
    return map[grade] || undefined;
  };

  const handleSolve = async (question: string, grade: string, subject: string, imageData?: string) => {
    setIsLoading(true);
    setCurrentQuestion(question || (imageData ? (language === 'en' ? 'Analyzing Image...' : '正在分析图片...') : ''));
    
    // Find prompt prefix for this subject
    const subjectConfig = subjects.find(s => s.code === subject);
    const customPrompt = subjectConfig?.prompt_prefix;

    try {
      const answer = await solveMathProblem(
        question, 
        grade, 
        subject, 
        userKey, 
        language, 
        aiMode, 
        imageData, 
        isImageAuthenticated ? imageKey : undefined,
        customPrompt // Pass dynamic prompt
      );
      
      const gradeLabel = getGradeLabel(grade);
      
      const newItem: SolutionItem = {
        id: Date.now().toString(),
        question: question || (imageData ? (language === 'en' ? '[Image Upload]' : '[图片上传]') : ''),
        gradeLabel: gradeLabel,
        subject: subject,
        answer: answer,
        timestamp: Date.now(),
      };

      setHistory((prev) => [newItem, ...prev].slice(0, 50));

      if (userKey && !isAdmin) {
        const textToSave = question || (imageData ? '[Image]' : '');
        saveChatMessage(userKey, textToSave, answer, subject, gradeLabel).catch(console.error);
      }

    } catch (err) {
      const errorItem: SolutionItem = {
        id: Date.now().toString(),
        question: question,
        gradeLabel: getGradeLabel(grade),
        subject: subject,
        answer: err instanceof Error ? `Error: ${err.message}` : "An unexpected error occurred.",
        timestamp: Date.now(),
      };
      setHistory((prev) => [errorItem, ...prev].slice(0, 50));
    } finally {
      setIsLoading(false);
      setCurrentQuestion(null);
    }
  };

  const handleVerifyImageKey = async (code: string): Promise<boolean> => {
    const valid = await verifyImageKey(code, userKey);
    if (valid) {
      setIsImageAuthenticated(true);
      setImageKey(code);
      return true;
    }
    return false;
  };

  const getSubjectUI = (subjectCode: string) => {
    const sub = subjects.find(s => s.code === subjectCode);
    const label = sub?.label || subjectCode;
    const color = sub?.color || 'indigo';
    const iconName = sub?.icon || 'book';
    const IconComp = getIconComponent(iconName, "w-4 h-4");

    // Map color to tailwind classes
    let headerBg = 'bg-indigo-50/50 border-indigo-50';
    let iconBg = 'bg-indigo-600';
    let titleColor = 'text-indigo-900';
    let tagStyle = 'bg-indigo-100 text-indigo-800';

    switch (color) {
      case 'emerald':
         headerBg = 'bg-emerald-50/50 border-emerald-50';
         iconBg = 'bg-emerald-600';
         titleColor = 'text-emerald-900';
         tagStyle = 'bg-emerald-100 text-emerald-800';
         break;
      case 'violet':
         headerBg = 'bg-violet-50/50 border-violet-50';
         iconBg = 'bg-violet-600';
         titleColor = 'text-violet-900';
         tagStyle = 'bg-violet-100 text-violet-800';
         break;
      case 'rose':
         headerBg = 'bg-rose-50/50 border-rose-50';
         iconBg = 'bg-rose-600';
         titleColor = 'text-rose-900';
         tagStyle = 'bg-rose-100 text-rose-800';
         break;
      case 'amber':
         headerBg = 'bg-amber-50/50 border-amber-50';
         iconBg = 'bg-amber-600';
         titleColor = 'text-amber-900';
         tagStyle = 'bg-amber-100 text-amber-800';
         break;
      case 'sky':
         headerBg = 'bg-sky-50/50 border-sky-50';
         iconBg = 'bg-sky-600';
         titleColor = 'text-sky-900';
         tagStyle = 'bg-sky-100 text-sky-800';
         break;
    }

    return { label, icon: IconComp, headerBg, iconBg, titleColor, tagStyle };
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString(language === 'en' ? 'en-US' : 'zh-CN', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  if (!isAuthenticated) {
    return (
      <LockScreen 
        onUnlock={(adminMode, code) => {
          setIsAuthenticated(true);
          setIsAdmin(adminMode);
          if (code) setUserKey(code);
          setIsImageAuthenticated(false);
          setImageKey('');
        }} 
        language={language}
        onLanguageChange={handleLanguageChange}
      />
    );
  }

  if (isAdmin) {
    return (
      <AdminDashboard 
        onLogout={() => { setIsAuthenticated(false); setIsAdmin(false); setUserKey(''); }} 
        language={language}
        onLanguageChange={handleLanguageChange}
      />
    );
  }

  const currentSubjectConfig = subjects.find(s => s.code === currentSubject);

  return (
    <div className="min-h-screen relative font-sans text-gray-900 selection:bg-indigo-100">
      <BackgroundEffects subject={currentSubject} subjectConfig={currentSubjectConfig} />
      <Header 
        title={appTitle} 
        appLogo={appLogo}
        language={language} 
        onLanguageChange={handleLanguageChange}
        onSearchClick={() => setIsSearchOpen(!isSearchOpen)}
        isSearchOpen={isSearchOpen}
      />

      <main className="relative flex-1 w-full max-w-5xl mx-auto px-4 pt-24 pb-12 flex flex-col gap-8 z-10">
        
        {/* Search Bar */}
        {isSearchOpen && (
          <div className="w-full max-w-3xl mx-auto animate-in slide-in-from-top-4 duration-300">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.searchPlaceholder}
                className="w-full pl-12 pr-10 py-3 bg-white/90 backdrop-blur-sm border border-indigo-100 rounded-xl shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-gray-800 placeholder-gray-400"
                autoFocus
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Hero / Input Section */}
        <div className={`transition-all duration-500 ease-in-out flex flex-col items-center gap-6 ${history.length === 0 && !isLoading ? 'mt-[15vh]' : 'mt-0'}`}>
          {history.length === 0 && !isLoading && !isHistoryLoading && !searchQuery && (
            <div className="text-center space-y-3 mb-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="w-16 h-16 bg-white/90 backdrop-blur-sm rounded-2xl shadow-md flex items-center justify-center mx-auto mb-6 text-indigo-600">
                 {appLogo ? (
                   <img src={appLogo} alt="App Logo" className="w-12 h-12 object-contain" />
                 ) : (
                   <BrainCircuit className="w-10 h-10" />
                 )}
              </div>
              <h2 className="text-3xl font-bold text-gray-800">
                {t.welcomeTitle}
              </h2>
              <p className="text-gray-500 text-lg">
                {t.welcomeDesc}
              </p>
            </div>
          )}

          <div className="w-full z-10">
            <InputArea 
              onSend={handleSolve} 
              isLoading={isLoading} 
              onSubjectChange={setCurrentSubject} 
              language={language}
              aiMode={aiMode}
              isImageAuthenticated={isImageAuthenticated}
              onRequestImageAuth={() => setShowImageAuthModal(true)}
              availableSubjects={subjects}
            />
          </div>
        </div>

        {/* Loading State */}
        {isLoading && currentQuestion && (
           <div className="max-w-3xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm">Q</div>
                  <p className="font-medium text-gray-700 line-clamp-1">{currentQuestion}</p>
                </div>
                <div className="p-8 flex flex-col items-center justify-center gap-4 min-h-[200px]">
                  <div className="relative w-16 h-16">
                    <div className="absolute inset-0 rounded-full border-4 border-indigo-100"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin"></div>
                  </div>
                  <p className="text-gray-500 font-medium animate-pulse">{t.loading}</p>
                </div>
             </div>
           </div>
        )}

        {/* Results Feed */}
        <div className="flex flex-col gap-2 w-full max-w-3xl mx-auto">
          {searchQuery && filteredHistory.length === 0 && (
             <div className="text-center py-12 text-gray-500">
               <Search className="w-8 h-8 mx-auto mb-2 text-gray-300" />
               <p>{t.noSearchResults}</p>
             </div>
          )}

          {filteredHistory.map((item) => {
            const ui = getSubjectUI(item.subject);
            return (
              <React.Fragment key={item.id}>
                <div className="flex justify-center my-4 animate-in fade-in duration-500">
                   <div className="flex items-center gap-2 px-3 py-1 bg-gray-200/50 backdrop-blur-sm rounded-full border border-gray-200 shadow-sm">
                      <span className="text-[10px] sm:text-xs font-mono font-medium text-gray-500 tracking-wide">
                        {formatTime(item.timestamp)}
                      </span>
                   </div>
                </div>

                <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-sm border border-gray-200 overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-500">
                  <div className={`px-6 py-4 border-b flex gap-4 ${ui.headerBg}`}>
                    <div className="flex-shrink-0 mt-0.5">
                      <div className={`w-8 h-8 rounded-full text-white flex items-center justify-center shadow-sm ${ui.iconBg}`}>
                        {ui.icon}
                      </div>
                    </div>
                    <div className="flex-grow">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className={`text-sm font-semibold uppercase tracking-wider ${ui.titleColor}`}>
                          {ui.label}
                        </h3>
                        {item.gradeLabel && (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${ui.tagStyle}`}>
                            {item.gradeLabel}
                          </span>
                        )}
                      </div>
                      <div className="text-gray-800 font-medium leading-relaxed">
                        {item.question}
                      </div>
                    </div>
                  </div>

                  <div className="px-8 py-8">
                     <h3 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider flex items-center gap-2">
                       <span>{t.expertAnalysis}</span>
                       <div className="h-px bg-gray-100 flex-grow"></div>
                     </h3>
                     <MathRenderer content={item.answer} />
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </main>

      <ImageAuthModal 
        isOpen={showImageAuthModal} 
        onClose={() => setShowImageAuthModal(false)} 
        onVerify={handleVerifyImageKey}
      />
    </div>
  );
};

export default App;
