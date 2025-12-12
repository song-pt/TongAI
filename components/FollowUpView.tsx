
import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, User, Sparkles } from 'lucide-react';
import { Message, Language, Subject, KeyUsageData, ImageKeyUsageData } from '../types';
import MathRenderer from './MathRenderer';
import InputArea, { getIconComponent } from './InputArea';
import { translations } from '../utils/translations';
import { continueConversation } from '../services/api';

interface FollowUpViewProps {
  initialQuestion: string;
  initialAnswer: string;
  subject: string;
  gradeLabel?: string;
  userKey: string;
  language: Language;
  onExit: () => void;
  availableSubjects: Subject[];
}

const FollowUpView: React.FC<FollowUpViewProps> = ({
  initialQuestion,
  initialAnswer,
  subject,
  gradeLabel,
  userKey,
  language,
  onExit,
  availableSubjects
}) => {
  const [messages, setMessages] = useState<Message[]>([
    { id: 'init-q', role: 'user', content: initialQuestion, timestamp: Date.now() },
    { id: 'init-a', role: 'assistant', content: initialAnswer, timestamp: Date.now() + 1 }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const t = translations[language];

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (text: string) => {
    if (!text.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const response = await continueConversation(messages, text, userKey);
      
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: Date.now() + 1
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error(error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: Date.now() + 1
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const subjectConfig = availableSubjects.find(s => s.code === subject);
  const SubjectIcon = getIconComponent(subjectConfig?.icon || 'book', "w-5 h-5");

  return (
    <div className="fixed inset-0 z-50 bg-gray-50 flex flex-col animate-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between shadow-sm flex-shrink-0 z-10">
        <button 
          onClick={onExit}
          className="flex items-center gap-1 text-gray-600 hover:text-gray-900 transition-colors px-2 py-1.5 rounded-lg hover:bg-gray-100 font-medium"
        >
          <ArrowLeft className="w-5 h-5" />
          {t.exitFollowUp}
        </button>
        <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
           <div className={`p-1.5 rounded-lg text-white`} style={{ backgroundColor: `var(--color-${subjectConfig?.color || 'indigo'}-600, #4f46e5)` }}>
             {SubjectIcon}
           </div>
           {t.followUpTitle}
           {gradeLabel && <span className="text-xs font-normal px-2 py-0.5 bg-gray-100 rounded-full text-gray-600">{gradeLabel}</span>}
        </h2>
        <div className="w-20"></div> {/* Spacer for center alignment */}
      </header>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-32">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.map((msg, index) => {
            const isUser = msg.role === 'user';
            // First two messages are the "Context"
            const isContext = index < 2;
            
            return (
              <div key={msg.id} className={`flex gap-4 ${isUser ? 'flex-row-reverse' : ''} ${isContext ? 'opacity-80' : 'animate-in fade-in slide-in-from-bottom-2'}`}>
                <div className={`
                   flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-sm mt-1
                   ${isUser ? 'bg-gray-800 text-white' : 'bg-indigo-600 text-white'}
                `}>
                   {isUser ? <User className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
                </div>
                
                <div className={`
                   relative max-w-[85%] rounded-2xl px-5 py-3 shadow-sm border
                   ${isUser 
                     ? 'bg-white border-gray-100 text-gray-800' 
                     : isContext 
                        ? 'bg-indigo-50/50 border-indigo-100/50' 
                        : 'bg-white border-indigo-100 ring-1 ring-indigo-50'
                   }
                `}>
                   {isContext && index === 0 && (
                     <div className="absolute -top-3 left-4 px-2 py-0.5 bg-gray-200 text-gray-600 text-[10px] font-bold rounded-full uppercase tracking-wider">
                       Context: Question
                     </div>
                   )}
                   {isContext && index === 1 && (
                     <div className="absolute -top-3 left-4 px-2 py-0.5 bg-indigo-200 text-indigo-700 text-[10px] font-bold rounded-full uppercase tracking-wider">
                       Context: Answer
                     </div>
                   )}
                   
                   <div className={`prose prose-sm max-w-none ${isUser ? '' : 'prose-indigo'}`}>
                     {isUser ? (
                       <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                     ) : (
                       <MathRenderer content={msg.content} />
                     )}
                   </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t">
         <InputArea 
            onSend={handleSend}
            isLoading={isLoading}
            language={language}
            isImageAuthenticated={false} // No new images in follow-up for now
            onRequestImageAuth={() => {}}
            availableSubjects={availableSubjects}
            isFollowUp={true} // Simplify UI
         />
      </div>
    </div>
  );
};

export default FollowUpView;
