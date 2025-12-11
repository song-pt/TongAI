

import React, { useState, useEffect } from 'react';
import { Image as ImageIcon, KeyRound, Loader2, X, ArrowRight } from 'lucide-react';

interface ImageAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerify: (code: string) => Promise<boolean>;
}

const ImageAuthModal: React.FC<ImageAuthModalProps> = ({ isOpen, onClose, onVerify }) => {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Quick Login State
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [showQuickLogin, setShowQuickLogin] = useState(false);

  useEffect(() => {
    if (isOpen) {
       const stored = localStorage.getItem('tongai_last_img_key');
       if (stored) {
         setSavedKey(stored);
         setShowQuickLogin(true);
       } else {
         setShowQuickLogin(false);
       }
       setCode('');
       setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleVerifyProcess = async (keyToUse: string) => {
    if (!keyToUse.trim()) return;

    setIsLoading(true);
    setError('');

    try {
      const success = await onVerify(keyToUse.trim());
      if (success) {
        localStorage.setItem('tongai_last_img_key', keyToUse.trim());
        onClose();
      } else {
        setError('无效的图片密钥或配额已满');
        if (showQuickLogin && keyToUse === savedKey) {
            setShowQuickLogin(false);
        }
      }
    } catch (e) {
      setError('验证失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleVerifyProcess(code);
  };

  const switchToManual = () => {
    setShowQuickLogin(false);
    setCode('');
    setError('');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 animate-in zoom-in-95 duration-200">
        <div className="flex flex-col items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-pink-100 text-pink-600 rounded-full flex items-center justify-center">
            <ImageIcon className="w-6 h-6" />
          </div>
          <div className="text-center">
            <h3 className="text-xl font-bold text-gray-800">图片功能认证</h3>
            <p className="text-sm text-gray-500 mt-1">上传图片需要专用的图像访问密钥</p>
          </div>
        </div>

        {showQuickLogin && savedKey ? (
           <div className="space-y-4 animate-in slide-in-from-bottom-4">
              <div className="p-4 bg-pink-50 rounded-xl border border-pink-100 text-center relative group">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">历史密钥</p>
                <p className="text-lg font-mono font-bold text-pink-700 tracking-wider truncate px-2">
                  {savedKey}
                </p>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    localStorage.removeItem('tongai_last_img_key');
                    switchToManual();
                  }}
                  className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={() => handleVerifyProcess(savedKey)}
                disabled={isLoading}
                className="w-full font-bold py-3 rounded-xl bg-pink-600 hover:bg-pink-700 text-white transition-colors shadow-lg flex items-center justify-center gap-2"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                  <>
                    <span>使用此密钥</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <button 
                onClick={switchToManual}
                className="w-full text-sm text-gray-500 hover:text-pink-600 font-medium py-2"
              >
                使用其他密钥
              </button>

              {error && <p className="text-red-500 text-sm text-center animate-pulse">{error}</p>}
           </div>
        ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                    type="text"
                    value={code}
                    onChange={(e) => {
                    setCode(e.target.value);
                    setError('');
                    }}
                    placeholder="请输入图片密钥..."
                    className={`w-full pl-10 pr-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-500 text-center text-lg font-mono tracking-widest ${
                    error ? 'border-red-300 bg-red-50' : 'border-gray-200'
                    }`}
                    autoFocus
                />
                </div>
                {error && <p className="text-red-500 text-sm text-center mt-2">{error}</p>}
            </div>

            <div className="flex gap-3">
                <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors"
                >
                取消
                </button>
                <button
                type="submit"
                disabled={isLoading || !code.trim()}
                className="flex-1 py-2.5 rounded-xl bg-pink-600 text-white font-bold hover:bg-pink-700 transition-colors shadow-md disabled:opacity-70 flex items-center justify-center gap-2"
                >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : '验证'}
                </button>
            </div>
            </form>
        )}
      </div>
    </div>
  );
};

export default ImageAuthModal;
