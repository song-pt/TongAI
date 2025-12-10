
import React, { useState, useEffect } from 'react';
import { solveMathProblem } from './services/api';
import { fetchChatHistory, saveChatMessage, getAppTitle, getAiMode, verifyImageKey } from './services/supabase';
import MathRenderer from './components/MathRenderer';
import InputArea from './components/InputArea';
import Header from './components/Header';
import LockScreen from './components/LockScreen';
import AdminDashboard from './components/AdminDashboard';
import BackgroundEffects from './components/BackgroundEffects';
import ImageAuthModal from './components/ImageAuthModal';
import { BrainCircuit, BookOpen, PenTool, Languages } from 'lucide-react';
import { Language, AiMode } from './types';
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
  const [userKey, setUserKey] = useState<string>(''); // Store the password used to login
  const [history, setHistory] = useState<SolutionItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);
  const [currentSubject, setCurrentSubject] = useState('math');
  const [appTitle, setAppTitle] = useState('TongAI');
  const [language, setLanguage] = useState<Language>('zh-cn');
  const [aiMode, setAiMode] = useState<AiMode>('solver');
  
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

  // Load App Configuration (Title & AI Mode)
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const title = await getAppTitle();
        setAppTitle(title);
        document.title = title; // Update browser tab title
        
        const mode = await getAiMode();
        setAiMode(mode);
      } catch (e) {
        console.error("Failed to load app config");
      }
    };
    loadConfig();
  }, [isAuthenticated]); // Reload config on auth change (in case admin changed it)

  // Load history from cloud when user logs in
  useEffect(() => {
    if (isAuthenticated && !isAdmin && userKey) {
      const loadHistory = async () => {
        setIsHistoryLoading(true);
        try {
          const cloudHistory = await fetchChatHistory(userKey);
          // Convert DB format to UI format
          const formattedHistory: SolutionItem[] = cloudHistory.map(item => ({
            id: item.id,
            question: item.question,
            gradeLabel: item.grade_label || undefined, // Handle potential null from DB
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
    
    try {
      // Pass the userKey to record usage, current language, and current AI Mode
      // If imageData is present, also pass imageKey
      const answer = await solveMathProblem(
        question, 
        grade, 
        subject, 
        userKey, 
        language, 
        aiMode, 
        imageData, 
        isImageAuthenticated ? imageKey : undefined
      );
      
      const gradeLabel = getGradeLabel(grade);
      
      const newItem: SolutionItem = {
        id: Date.now().toString(), // Temporary ID until reload
        question: question || (imageData ? (language === 'en' ? '[Image Upload]' : '[图片上传]') : ''),
        gradeLabel: gradeLabel,
        subject: subject,
        answer: answer,
        timestamp: Date.now(),
      };

      // Add new item and strictly keep only the latest 50 items in local state
      setHistory((prev) => [newItem, ...prev].slice(0, 50));

      // Save to Cloud if user is logged in
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
    // Verify against DB, passing the main User Key to link them
    const valid = await verifyImageKey(code, userKey);
    if (valid) {
      setIsImageAuthenticated(true);
      setImageKey(code);
      return true;
    }
    return false;
  };

  const getSubjectConfig = (subject: string) => {
    switch (subject) {
      case 'chinese':
        return {
          label: t.subjectChinese,
          icon: <PenTool className="w-4 h-4" />,
          headerBg: 'bg-emerald-50/50 border-emerald-50',
          iconBg: 'bg-emerald-600',
          titleColor: 'text-emerald-900',
          tagStyle: 'bg-emerald-100 text-emerald-800'
        };
      case 'english':
        return {
          label: t.subjectEnglish,
          icon: <Languages className="w-4 h-4" />,
          headerBg: 'bg-violet-50/50 border-violet-50',
          iconBg: 'bg-violet-600',
          titleColor: 'text-violet-900',
          tagStyle: 'bg-violet-100 text-violet-800'
        };
      case 'math':
      default:
        return {
          label: t.subjectMath,
          icon: <BookOpen className="w-4 h-4" />,
          headerBg: 'bg-indigo-50/50 border-indigo-50',
          iconBg: 'bg-indigo-600',
          titleColor: 'text-indigo-900',
          tagStyle: 'bg-indigo-100 text-indigo-800'
        };
    }
  };

  if (!isAuthenticated) {
    return (
      <LockScreen 
        onUnlock={(adminMode, code) => {
          setIsAuthenticated(true);
          setIsAdmin(adminMode);
          if (code) setUserKey(code);
          // Reset Image Auth on login
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

  return (
    <div className="min-h-screen relative font-sans text-gray-900 selection:bg-indigo-100">
      <BackgroundEffects subject={currentSubject} />
      <Header title={appTitle} language={language} onLanguageChange={handleLanguageChange} />

      <main className="relative flex-1 w-full max-w-5xl mx-auto px-4 pt-24 pb-12 flex flex-col gap-8 z-10">
        
        {/* Hero / Input Section */}
        <div className={`transition-all duration-500 ease-in-out flex flex-col items-center gap-6 ${history.length === 0 && !isLoading ? 'mt-[15vh]' : 'mt-0'}`}>
          {history.length === 0 && !isLoading && !isHistoryLoading && (
            <div className="text-center space-y-3 mb-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="w-16 h-16 bg-white/90 backdrop-blur-sm rounded-2xl shadow-md flex items-center justify-center mx-auto mb-6 text-indigo-600">
                <BrainCircuit className="w-10 h-10" />
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
        <div className="flex flex-col gap-8 w-full max-w-3xl mx-auto">
          {history.map((item) => {
            const config = getSubjectConfig(item.subject);
            return (
              <div key={item.id} className="bg-white/95 backdrop-blur-md rounded-2xl shadow-sm border border-gray-200 overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-500">
                {/* Question Header */}
                <div className={`px-6 py-4 border-b flex gap-4 ${config.headerBg}`}>
                  <div className="flex-shrink-0 mt-0.5">
                    <div className={`w-8 h-8 rounded-full text-white flex items-center justify-center shadow-sm ${config.iconBg}`}>
                      {config.icon}
                    </div>
                  </div>
                  <div className="flex-grow">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={`text-sm font-semibold uppercase tracking-wider ${config.titleColor}`}>
                        {config.label}
                      </h3>
                      {item.gradeLabel && (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config.tagStyle}`}>
                          {item.gradeLabel}
                        </span>
                      )}
                    </div>
                    <div className="text-gray-800 font-medium leading-relaxed">
                      {item.question}
                    </div>
                  </div>
                </div>

                {/* Answer Body */}
                <div className="px-8 py-8">
                   <h3 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider flex items-center gap-2">
                     <span>{t.expertAnalysis}</span>
                     <div className="h-px bg-gray-100 flex-grow"></div>
                   </h3>
                   <MathRenderer content={item.answer} />
                </div>
              </div>
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