
import React, { useEffect, useState, useRef } from 'react';
import { fetchKeys, fetchDevices, addKey, toggleKeyStatus, deleteKey, toggleDeviceBan, fetchAdminHistory, updateKeyLimit, getAppTitle, updateAppTitle, updateAdminPassword, getAiMode, updateAiMode, fetchImageKeys, addImageKey, toggleImageKeyStatus, updateImageKeyLimit, deleteImageKey, fetchSubjects, addSubject, updateSubject, deleteSubject, getAppLogo, updateAppLogo, getAiProviderConfig, updateAiProviderConfig, getShowUsageToUser, updateShowUsageToUser } from '../services/supabase';
import { AccessKey, DeviceSession, ChatHistoryItem, Language, AiMode, ImageAccessKey, Subject } from '../types';
import { Plus, Power, Trash2, Smartphone, Loader2, LogOut, Key, Laptop, Clock, Coins, Ban, CheckCircle, MessageSquare, X, Gauge, AlertTriangle, Infinity as InfinityIcon, Settings, Save, Lock, Bot, Image as ImageIcon, Palette, Edit3, Upload, MapPin, Server, Sparkles, Eye, EyeOff } from 'lucide-react';
import MathRenderer from './MathRenderer';
import LanguageSwitcher from './LanguageSwitcher';
import { translations } from '../utils/translations';
import { getIconComponent } from './InputArea';

interface AdminDashboardProps {
  onLogout: () => void;
  language: Language;
  onLanguageChange: (lang: Language) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout, language, onLanguageChange }) => {
  const [activeTab, setActiveTab] = useState<'keys' | 'devices' | 'settings' | 'imageKeys' | 'subjects'>('keys');
  
  // Data State
  const [keys, setKeys] = useState<AccessKey[]>([]);
  const [imageKeys, setImageKeys] = useState<ImageAccessKey[]>([]);
  const [devices, setDevices] = useState<DeviceSession[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  
  // Loading & UI State
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const t = translations[language];

  // Key Forms
  const [newCode, setNewCode] = useState('');
  const [newNote, setNewNote] = useState('');

  // Settings State
  const [appTitle, setAppTitle] = useState('');
  const [appLogo, setAppLogo] = useState(''); // Base64
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [aiMode, setAiMode] = useState<AiMode>('solver');
  
  // Model Settings
  const [aiApiKey, setAiApiKey] = useState('');
  const [aiBaseUrl, setAiBaseUrl] = useState('');
  
  // Feature Toggles
  const [showUsageToUser, setShowUsageToUser] = useState(false);

  const [savingSettings, setSavingSettings] = useState(false);
  
  // Subject Form State
  const [subjectForm, setSubjectForm] = useState<Partial<Subject>>({
    color: 'indigo',
    icon: 'book',
    is_active: true,
    sort_order: 0,
    char_opacity: 0.15,
    char_size_scale: 1.0
  });
  const [isEditingSubject, setIsEditingSubject] = useState(false);
  const [showSubjectModal, setShowSubjectModal] = useState(false);

  // History Modal State
  const [historyModal, setHistoryModal] = useState<{
    isOpen: boolean;
    type: 'key' | 'device';
    value: string;
    title: string;
  }>({ isOpen: false, type: 'key', value: '', title: '' });
  const [historyLogs, setHistoryLogs] = useState<ChatHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Limit Modal State
  const [limitModal, setLimitModal] = useState<{
    isOpen: boolean;
    keyId: string;
    keyName: string;
    currentLimit: number | null;
    type: 'main' | 'image';
  }>({ isOpen: false, keyId: '', keyName: '', currentLimit: null, type: 'main' });
  const [newLimitValue, setNewLimitValue] = useState<string>('');
  const [isUnlimited, setIsUnlimited] = useState(false);
  const [isSavingLimit, setIsSavingLimit] = useState(false);
  
  // Database Error Modal State
  const [dbErrorModal, setDbErrorModal] = useState(false);
  const [sqlToRun, setSqlToRun] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'keys') {
        const data = await fetchKeys();
        setKeys(data);
      } else if (activeTab === 'imageKeys') {
        try {
          const data = await fetchImageKeys();
          setImageKeys(data);
        } catch (e: any) {
           // Detect missing table error
           if (e.message && e.message.includes('image_access_keys')) {
             throw new Error("DB_MISSING_IMAGE_TABLE");
           }
           throw e;
        }
        const dev = await fetchDevices();
        setDevices(dev);
      } else if (activeTab === 'devices') {
        const data = await fetchDevices();
        setDevices(data);
      } else if (activeTab === 'settings') {
        const title = await getAppTitle();
        setAppTitle(title);
        const mode = await getAiMode();
        setAiMode(mode);
        const provider = await getAiProviderConfig();
        setAiApiKey(provider.apiKey);
        setAiBaseUrl(provider.baseUrl);
        const showUsage = await getShowUsageToUser();
        setShowUsageToUser(showUsage);
      } else if (activeTab === 'subjects') {
        const subs = await fetchSubjects(true); // fetch all including inactive
        setSubjects(subs);
        const logo = await getAppLogo();
        setAppLogo(logo);
      }
    } catch (error: any) {
      console.error("Dashboard Load Error:", error);
      const msg = error.message || "Unknown error";
      
      if (msg === "DB_MISSING_IMAGE_TABLE" || msg.includes('relation "public.image_access_keys" does not exist')) {
         // Show specific modal for DB setup
         setSqlToRun(`Please run the SQL script in supabase_schema.txt`);
         setDbErrorModal(true);
      } else {
         alert(`加载数据失败: ${msg}\n请检查数据库连接或 RLS 策略。`);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  // Load history when modal opens
  useEffect(() => {
    if (historyModal.isOpen && historyModal.value) {
      const fetchLogs = async () => {
        setLoadingHistory(true);
        try {
          const logs = await fetchAdminHistory(historyModal.type, historyModal.value);
          setHistoryLogs(logs);
        } catch (error) {
          console.error(error);
          alert('无法加载历史记录');
        } finally {
          setLoadingHistory(false);
        }
      };
      fetchLogs();
    }
  }, [historyModal]);

  const handleAddKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim()) return;
    setIsSubmitting(true);
    try {
      if (activeTab === 'keys') {
        await addKey(newCode.trim(), newNote.trim());
      } else if (activeTab === 'imageKeys') {
        await addImageKey(newCode.trim(), newNote.trim());
      }
      setNewCode('');
      setNewNote('');
      loadData();
    } catch (error) {
      alert('添加失败，可能密钥已存在');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleKey = async (key: AccessKey) => {
    if (!key.is_active && key.token_limit !== null && key.total_tokens >= key.token_limit) {
      if (!confirm(`该密钥因超出 Token 限额 (${key.token_limit}) 而被禁用。强制启用可能导致其立即被再次禁用。\n建议先提高限额。\n\n确定要强制启用吗？`)) return;
    } else {
       if (!confirm(`确定要${key.is_active ? t.ban : t.enable}密钥 "${key.code}" 吗？`)) return;
    }
    try {
      await toggleKeyStatus(key.id, key.is_active);
      loadData();
    } catch (error) {
      alert('操作失败');
    }
  };

  const handleToggleImageKey = async (key: ImageAccessKey) => {
    if (!key.is_active && key.image_limit !== null && key.total_images >= key.image_limit) {
       if (!confirm(`该图片密钥因超出图片数量限额 (${key.image_limit}) 而被禁用。强制启用可能导致其立即被再次禁用。\n建议先提高限额。\n\n确定要强制启用吗？`)) return;
    } else {
       if (!confirm(`确定要${key.is_active ? t.ban : t.enable}图片密钥 "${key.code}" 吗？`)) return;
    }
    try {
      await toggleImageKeyStatus(key.id, key.is_active);
      loadData();
    } catch (error) {
      alert('操作失败');
    }
  };

  const handleDelete = async (code: string) => {
    if (!confirm(`警告：确定要彻底删除 "${code}" 吗？这将清除所有关联记录！`)) return;
    try {
      if (activeTab === 'keys') {
        await deleteKey(code);
      } else if (activeTab === 'imageKeys') {
        await deleteImageKey(code);
      } else if (activeTab === 'subjects') {
        await deleteSubject(code);
      }
      loadData();
    } catch (error) {
      alert('删除失败');
    }
  };

  const handleDeviceBanToggle = async (device: DeviceSession) => {
     const action = device.is_banned ? t.unban : t.ban;
     if (!confirm(`确定要${action}该设备吗？\n设备ID: ${device.device_id.slice(0, 8)}...\n所属密钥: ${device.key_code}`)) return;
     try {
       await toggleDeviceBan(device.key_code, device.device_id, device.is_banned);
       loadData();
     } catch (error) {
       alert('操作失败');
     }
  };

  const openHistory = (type: 'key' | 'device', value: string, title: string) => {
    setHistoryLogs([]); 
    setHistoryModal({ isOpen: true, type, value, title });
  };

  const openLimitModal = (key: any, type: 'main' | 'image') => {
    const limit = type === 'main' ? key.token_limit : key.image_limit;
    setLimitModal({
      isOpen: true,
      keyId: key.id,
      keyName: key.code,
      currentLimit: limit,
      type: type
    });
    if (limit === null) {
      setIsUnlimited(true);
      setNewLimitValue('');
    } else {
      setIsUnlimited(false);
      setNewLimitValue(limit.toString());
    }
  };

  const handleSaveLimit = async () => {
    if (!isUnlimited && !newLimitValue) {
      alert('请输入限额数值');
      return;
    }
    setIsSavingLimit(true);
    try {
      const limit = isUnlimited ? null : parseInt(newLimitValue, 10);
      if (limitModal.type === 'main') {
        await updateKeyLimit(limitModal.keyId, limit);
      } else {
        await updateImageKeyLimit(limitModal.keyId, limit);
      }
      setLimitModal(prev => ({ ...prev, isOpen: false }));
      loadData();
    } catch (error) {
      console.error(error);
      alert('设置限额失败');
    } finally {
      setIsSavingLimit(false);
    }
  };
  
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const promises = [];
      if (appTitle.trim()) promises.push(updateAppTitle(appTitle.trim()));
      if (newAdminPassword.trim()) promises.push(updateAdminPassword(newAdminPassword.trim()));
      promises.push(updateAiMode(aiMode));
      promises.push(updateAiProviderConfig(aiApiKey.trim(), aiBaseUrl.trim()));
      promises.push(updateShowUsageToUser(showUsageToUser)); // Save toggle
      await Promise.all(promises);
      alert(t.saveSuccess);
      setNewAdminPassword('');
    } catch(e) {
      alert(t.saveFail);
    } finally {
      setSavingSettings(false);
    }
  };

  // --- Subjects Logic ---
  const handleEditSubject = (sub: Subject) => {
    setSubjectForm(sub);
    setIsEditingSubject(true);
    setShowSubjectModal(true);
  };
  
  const handleNewSubject = () => {
    setSubjectForm({
      code: '',
      label: '',
      color: 'indigo',
      icon: 'book',
      prompt_prefix: '',
      background_chars: '',
      sort_order: subjects.length + 1,
      is_active: true,
      char_opacity: 0.15,
      char_size_scale: 1.0
    });
    setIsEditingSubject(false);
    setShowSubjectModal(true);
  };

  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectForm.code || !subjectForm.label) return;
    setIsSubmitting(true);
    try {
      if (isEditingSubject) {
        await updateSubject(subjectForm.code!, subjectForm);
      } else {
        await addSubject(subjectForm as Subject);
      }
      setShowSubjectModal(false);
      loadData();
    } catch (e) {
      alert('保存失败，可能 ID 重复');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500000) { // Limit 500kb approx
         alert('图片过大，请使用小于 500KB 的图片');
         return;
      }
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        setAppLogo(base64);
        try {
          await updateAppLogo(base64);
        } catch (e) {
          alert('上传失败');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const isMobile = (info: string) => /mobile|android|iphone|ipad/i.test(info);
  const getLinkedDevicesForImageKey = (imgCode: string) => devices.filter(d => d.image_key_code === imgCode);

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="bg-purple-600 p-1.5 rounded-lg text-white">
            <Key className="w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold text-gray-800">{t.adminTitle}</h1>
        </div>
        <div className="flex items-center gap-4">
          <LanguageSwitcher currentLanguage={language} onLanguageChange={onLanguageChange} variant="light" />
          <div className="flex bg-gray-100 rounded-lg p-1 overflow-x-auto">
             <button onClick={() => setActiveTab('keys')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'keys' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>{t.tabKeys}</button>
             <button onClick={() => setActiveTab('imageKeys')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap flex items-center gap-1 ${activeTab === 'imageKeys' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><ImageIcon className="w-3 h-3" /> 图片密钥</button>
             <button onClick={() => setActiveTab('devices')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'devices' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>{t.tabDevices}</button>
             <button onClick={() => setActiveTab('subjects')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap flex items-center gap-1 ${activeTab === 'subjects' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><Palette className="w-3 h-3" /> 学科与UI</button>
             <button onClick={() => setActiveTab('settings')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'settings' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>{t.tabSettings}</button>
          </div>
          <button onClick={onLogout} className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors whitespace-nowrap"><LogOut className="w-4 h-4" />{t.logout}</button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-8">
        {/* ... (Existing Tabs Logic Omitted for Brevity, only showing Settings update) ... */}
        
        {activeTab === 'subjects' && (
           <div className="space-y-8">
              {/* App Icon Manager */}
              <section className="bg-white rounded-2xl shadow-sm border p-6">
                 <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-purple-600" />
                    网站图标设置 (App Icon)
                 </h2>
                 <div className="flex items-center gap-6">
                    <div className="w-20 h-20 rounded-xl bg-gray-100 border flex items-center justify-center overflow-hidden">
                       {appLogo ? <img src={appLogo} alt="Logo" className="w-full h-full object-contain" /> : <span className="text-gray-400 text-xs">无图标</span>}
                    </div>
                    <div>
                       <input 
                         type="file" 
                         ref={fileInputRef}
                         accept="image/png, image/jpeg, image/svg+xml"
                         className="hidden"
                         onChange={handleLogoUpload}
                       />
                       <button 
                         onClick={() => fileInputRef.current?.click()}
                         className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors font-medium text-sm"
                       >
                         <Upload className="w-4 h-4" />
                         上传新图标
                       </button>
                       <p className="text-xs text-gray-400 mt-2">建议尺寸 64x64 或 128x128，支持 PNG/JPG/SVG，小于 500KB</p>
                    </div>
                 </div>
              </section>

              {/* Subjects List */}
              <section className="bg-white rounded-2xl shadow-sm border p-6">
                 <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                       <Palette className="w-5 h-5 text-purple-600" />
                       学科配置与提示词 (Subjects & Prompts)
                    </h2>
                    <button 
                      onClick={handleNewSubject}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium text-sm"
                    >
                      <Plus className="w-4 h-4" />
                      添加学科
                    </button>
                 </div>

                 {loading ? (
                   <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-purple-600" /></div>
                 ) : (
                   <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {subjects.map(sub => (
                         <div key={sub.code} className={`border rounded-xl p-4 transition-all hover:shadow-md ${!sub.is_active ? 'opacity-60 bg-gray-50' : 'bg-white'}`}>
                            <div className="flex justify-between items-start mb-2">
                               <div className="flex items-center gap-2">
                                  <div className={`p-2 rounded-lg text-white`} style={{ backgroundColor: `var(--color-${sub.color}-600, #4f46e5)` }}>
                                    {getIconComponent(sub.icon, 'w-5 h-5')} 
                                  </div>
                                  <div>
                                     <h3 className="font-bold text-gray-800">{sub.label}</h3>
                                     <p className="text-xs text-gray-500 font-mono">{sub.code}</p>
                                  </div>
                               </div>
                               <span className={`px-2 py-0.5 rounded text-xs font-bold ${sub.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                 {sub.is_active ? '启用' : '禁用'}
                               </span>
                            </div>
                            <div className="space-y-2 mt-3 text-xs text-gray-500">
                               <div className="flex items-center gap-2">
                                 <span className="font-semibold text-gray-400">颜色:</span>
                                 <div className={`w-3 h-3 rounded-full bg-${sub.color}-500`}></div> {sub.color}
                               </div>
                               <div className="truncate">
                                 <span className="font-semibold text-gray-400">字符:</span> {sub.background_chars || '(无)'}
                               </div>
                               <div className="flex items-center gap-2">
                                  <span className="font-semibold text-gray-400">视觉:</span>
                                  <span>Opacity: {sub.char_opacity ?? 0.15}, Scale: {sub.char_size_scale ?? 1.0}</span>
                               </div>
                            </div>
                            <div className="flex gap-2 mt-4 pt-3 border-t">
                               <button 
                                 onClick={() => handleEditSubject(sub)}
                                 className="flex-1 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs font-bold flex items-center justify-center gap-1"
                               >
                                 <Edit3 className="w-3 h-3" /> 编辑
                               </button>
                               <button 
                                 onClick={() => handleDelete(sub.code)}
                                 className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded text-xs font-bold"
                               >
                                 <Trash2 className="w-3 h-3" />
                               </button>
                            </div>
                         </div>
                      ))}
                   </div>
                 )}
              </section>
           </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === 'settings' && (
          <section className="bg-white rounded-2xl shadow-sm border p-8 max-w-2xl mx-auto">
             <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2"><Settings className="w-5 h-5 text-purple-600" />{t.settingsTitle}</h2>
             {loading ? (<div className="flex justify-center py-8"><Loader2 className="w-8 h-8 text-purple-600 animate-spin" /></div>) : (
               <form onSubmit={handleSaveSettings} className="space-y-6">
                  <div className="space-y-2"><label className="block text-sm font-semibold text-gray-700">{t.siteTitle}</label><input type="text" value={appTitle} onChange={(e) => setAppTitle(e.target.value)} className="w-full px-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-500" placeholder="TongAI" /><p className="text-xs text-gray-500">{t.siteTitleDesc}</p></div>
                  
                  {/* AI Mode Selection */}
                  <div className="space-y-2 pt-4 border-t"><label className="block text-sm font-semibold text-gray-700 flex items-center gap-2"><Bot className="w-4 h-4 text-gray-500" />{t.aiModeTitle}</label><div className="grid grid-cols-2 gap-3"><div onClick={() => setAiMode('solver')} className={`cursor-pointer border rounded-xl p-3 text-sm flex flex-col gap-1 ${aiMode === 'solver' ? 'bg-purple-50 border-purple-200 text-purple-800' : 'hover:bg-gray-50 text-gray-600'}`}><span className="font-bold flex items-center gap-2"><div className={`w-3 h-3 rounded-full ${aiMode === 'solver' ? 'bg-purple-600' : 'border border-gray-400'}`}></div>{t.modeSolver}</span></div><div onClick={() => setAiMode('normal')} className={`cursor-pointer border rounded-xl p-3 text-sm flex flex-col gap-1 ${aiMode === 'normal' ? 'bg-blue-50 border-blue-200 text-blue-800' : 'hover:bg-gray-50 text-gray-600'}`}><span className="font-bold flex items-center gap-2"><div className={`w-3 h-3 rounded-full ${aiMode === 'normal' ? 'bg-blue-600' : 'border border-gray-400'}`}></div>{t.modeNormal}</span></div></div><p className="text-xs text-gray-500">{t.aiModeDesc}</p></div>
                  
                  {/* User Feature Toggles */}
                  <div className="space-y-4 pt-4 border-t">
                      <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">用户端功能开关 (Features)</h3>
                      <div className="flex items-center justify-between p-3 border rounded-xl bg-gray-50/50">
                         <div>
                            <span className="font-medium text-gray-800 text-sm flex items-center gap-2">
                               <Gauge className="w-4 h-4 text-gray-500" />
                               显示用量 (Show Usage)
                            </span>
                            <p className="text-xs text-gray-500 mt-1">允许用户在输入框下方看到自己的 Token 使用情况和额度上限。</p>
                         </div>
                         <button 
                           type="button"
                           onClick={() => setShowUsageToUser(!showUsageToUser)}
                           className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${showUsageToUser ? 'bg-purple-600' : 'bg-gray-200'}`}
                         >
                           <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showUsageToUser ? 'translate-x-6' : 'translate-x-1'}`} />
                         </button>
                      </div>
                  </div>

                  {/* API Model Settings */}
                  <div className="space-y-4 pt-4 border-t">
                     <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2"><Server className="w-4 h-4 text-gray-500" /> 模型服务商设置 (Model Provider)</h3>
                     <div className="space-y-2">
                       <label className="text-xs font-semibold text-gray-500 uppercase">API Base URL</label>
                       <input type="text" value={aiBaseUrl} onChange={(e) => setAiBaseUrl(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm font-mono" placeholder="https://api.siliconflow.cn/v1" />
                     </div>
                     <div className="space-y-2">
                       <label className="text-xs font-semibold text-gray-500 uppercase">API Key</label>
                       <div className="relative">
                          <input type="password" value={aiApiKey} onChange={(e) => setAiApiKey(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm font-mono" placeholder="sk-..." />
                       </div>
                       <p className="text-[10px] text-gray-400">留空则使用系统默认的环境变量。修改此处将覆盖 Vercel 环境变量。</p>
                     </div>
                  </div>

                  <div className="space-y-2 pt-4 border-t"><label className="block text-sm font-semibold text-gray-700 flex items-center gap-2"><Lock className="w-4 h-4 text-gray-500" />{t.adminPassTitle}</label><input type="password" value={newAdminPassword} onChange={(e) => setNewAdminPassword(e.target.value)} className="w-full px-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-500" placeholder={t.adminPassPlaceholder} /><p className="text-xs text-gray-500">{t.adminPassDesc}</p></div>
                  <div className="pt-6"><button type="submit" disabled={savingSettings} className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed">{savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}{t.saveSettings}</button></div>
               </form>
             )}
          </section>
        )}

        {/* KEYS / IMAGE KEYS SHARED */}
        {(activeTab === 'keys' || activeTab === 'imageKeys') && (
          <>
            <section className="bg-white rounded-2xl shadow-sm border p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><Plus className="w-5 h-5 text-purple-600" />{activeTab === 'keys' ? t.addKeyTitle : '分发新图片密钥'}</h2>
              <form onSubmit={handleAddKey} className="flex gap-4 flex-wrap sm:flex-nowrap"><input type="text" value={newCode} onChange={(e) => setNewCode(e.target.value)} placeholder={activeTab === 'keys' ? "密钥 (例如: vip-888)" : "图片密钥 (例如: img-vip-001)"} className="flex-1 min-w-[200px] px-4 py-2 border rounded-xl focus:ring-2 focus:ring-purple-200 outline-none" required /><input type="text" value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="备注 (例如: 张三)" className="flex-1 min-w-[200px] px-4 py-2 border rounded-xl focus:ring-2 focus:ring-purple-200 outline-none" /><button type="submit" disabled={isSubmitting} className="bg-purple-600 text-white px-6 py-2 rounded-xl font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors">{isSubmitting ? '...' : t.addKeyBtn}</button></form>
            </section>
            <section className="space-y-4">
              <div className="flex items-center justify-between"><h2 className="text-lg font-semibold text-gray-700">{activeTab === 'keys' ? `${t.tabKeys} (${keys.length})` : `图片密钥列表 (${imageKeys.length})`}</h2><button onClick={loadData} className="text-sm text-purple-600 hover:underline">{t.refresh}</button></div>
              {loading ? (<div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-purple-600 animate-spin" /></div>) : (activeTab === 'keys' ? keys.length : imageKeys.length) === 0 ? (<div className="text-center py-12 text-gray-400 bg-white rounded-2xl border border-dashed">{t.noKeys}</div>) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {(activeTab === 'keys' ? keys : imageKeys).map((item: any) => {
                    const isImageKey = activeTab === 'imageKeys';
                    const code = item.code;
                    const limit = isImageKey ? item.image_limit : item.token_limit;
                    const usage = isImageKey ? item.total_images : item.total_tokens;
                    const isOverLimit = limit !== null && usage >= limit;
                    const percent = limit ? Math.min((usage / limit) * 100, 100) : 0;
                    let connectedInfo = null;
                    if (isImageKey) {
                      const linkedDevices = getLinkedDevicesForImageKey(code);
                      connectedInfo = (<div className="mt-2 text-xs text-gray-500 bg-gray-50 p-2 rounded border border-gray-100"><p className="font-semibold mb-1">已关联设备 ({linkedDevices.length}):</p>{linkedDevices.length === 0 ? (<span className="text-gray-400">无</span>) : (<ul className="space-y-1 max-h-20 overflow-y-auto">{linkedDevices.map(d => (<li key={d.device_id} className="flex justify-between"><span>{d.device_id.slice(0, 6)}...</span><span className="text-purple-600 font-mono">{d.key_code}</span></li>))}</ul>)}</div>);
                    }
                    return (
                    <div key={item.id} className={`bg-white p-5 rounded-2xl border transition-all hover:shadow-md ${!item.is_active ? 'opacity-80' : ''}`}>
                      <div className="flex justify-between items-start mb-3"><div><div className="flex items-center gap-2"><h3 className="font-mono text-xl font-bold text-gray-800 tracking-wide">{code}</h3>{isOverLimit && !item.is_active && (<span className="text-[10px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded border border-red-200 flex items-center gap-0.5"><AlertTriangle className="w-3 h-3" /> 超限</span>)}</div><p className="text-sm text-gray-500 mt-1">{item.note || '无备注'}</p></div><div className={`px-2 py-0.5 text-xs rounded-full font-medium ${item.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{item.is_active ? t.enable : t.ban}</div></div>
                      <div className="space-y-3 mb-4"><div className="grid grid-cols-2 gap-2">{!isImageKey && (<div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-2 rounded-lg"><Smartphone className="w-4 h-4 text-gray-400" /><div><p className="text-xs text-gray-400">设备数</p><span className="font-bold text-gray-900">{item.device_sessions?.[0]?.count || 0}</span></div></div>)}<div onClick={() => openLimitModal(item, isImageKey ? 'image' : 'main')} className={`flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-2 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors group relative ${isImageKey ? 'col-span-2' : ''}`} title="点击设置限额"><Gauge className={`w-4 h-4 ${isOverLimit ? 'text-red-500' : 'text-blue-500'}`} /><div className="flex-1 min-w-0"><p className="text-xs text-gray-400 flex items-center justify-between">{isImageKey ? '图片数量' : 'Token'} <span className="group-hover:opacity-100 opacity-0 text-[10px] text-blue-600 font-bold transition-opacity">设置</span></p><div className="flex items-baseline gap-1 font-bold text-gray-900 truncate"><span>{usage}</span><span className="text-gray-400 font-normal text-xs">/</span>{limit === null ? (<InfinityIcon className="w-3 h-3 text-gray-400" />) : (<span className={isOverLimit ? 'text-red-600' : ''}>{limit}</span>)}</div></div></div></div>{limit !== null && (<div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all duration-500 ${isOverLimit ? 'bg-red-500' : percent > 80 ? 'bg-amber-400' : 'bg-blue-500'}`} style={{ width: `${percent}%` }}></div></div>)}{connectedInfo}</div>
                      <div className="flex items-center gap-2 pt-2 border-t mt-2">{!isImageKey && (<button onClick={() => openHistory('key', code, `密钥 ${code} 的历史记录`)} className="flex-1 flex items-center justify-center gap-1 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><MessageSquare className="w-4 h-4" />{t.history}</button>)}<button onClick={() => isImageKey ? handleToggleImageKey(item) : handleToggleKey(item)} className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-sm font-medium rounded-lg transition-colors ${item.is_active ? 'text-amber-600 hover:bg-amber-50' : 'text-green-600 hover:bg-green-50'}`}><Power className="w-4 h-4" />{item.is_active ? t.ban : t.enable}</button><button onClick={() => handleDelete(code)} className="w-10 flex items-center justify-center py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="删除"><Trash2 className="w-4 h-4" /></button></div>
                    </div>
                  );})}
                </div>
              )}
            </section>
          </>
        )}

        {/* DEVICES TAB */}
        {activeTab === 'devices' && (
          <section className="space-y-4">
             <div className="flex items-center justify-between"><h2 className="text-lg font-semibold text-gray-700">{t.tabDevices} ({devices.length})</h2><button onClick={loadData} className="text-sm text-purple-600 hover:underline">{t.refresh}</button></div>
             {loading ? (<div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-purple-600 animate-spin" /></div>) : devices.length === 0 ? (<div className="text-center py-12 text-gray-400 bg-white rounded-2xl border border-dashed">{t.noDevices}</div>) : (
                <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-gray-50 text-gray-500 border-b">
                         <tr>
                           <th className="px-6 py-3 font-medium">{t.deviceType}</th>
                           <th className="px-6 py-3 font-medium">{t.deviceKey}</th>
                           <th className="px-6 py-3 font-medium">地区/Location</th>
                           <th className="px-6 py-3 font-medium">关联图片密钥</th>
                           <th className="px-6 py-3 font-medium">{t.deviceId}</th>
                           <th className="px-6 py-3 font-medium">{t.status}</th>
                           <th className="px-6 py-3 font-medium">Token</th>
                           <th className="px-6 py-3 font-medium">{t.lastSeen}</th>
                           <th className="px-6 py-3 font-medium text-right">{t.operate}</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y">{devices.map((device) => {const isMobileDevice = isMobile(device.device_info || ''); return (<tr key={`${device.key_code}-${device.device_id}`} className={`hover:bg-gray-50 transition-colors ${device.is_banned ? 'bg-red-50/50' : ''}`}><td className="px-6 py-4"><div className="flex items-center gap-2"><div className={`p-1.5 rounded-lg ${isMobileDevice ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>{isMobileDevice ? <Smartphone className="w-4 h-4" /> : <Laptop className="w-4 h-4" />}</div><span className="font-medium text-gray-700">{isMobileDevice ? '移动端' : 'PC端'}</span></div></td><td className="px-6 py-4"><span className="font-mono bg-purple-50 text-purple-700 px-2 py-1 rounded border border-purple-100">{device.key_code}</span></td>
                      <td className="px-6 py-4"><span className="text-gray-600 bg-gray-100 px-2 py-1 rounded text-xs">{device.location || 'Unknown'}</span></td>
                      <td className="px-6 py-4">{device.image_key_code ? (<span className="font-mono bg-pink-50 text-pink-700 px-2 py-1 rounded border border-pink-100 text-xs">{device.image_key_code}</span>) : (<span className="text-gray-400 text-xs">-</span>)}</td><td className="px-6 py-4 text-gray-500 font-mono text-xs"><div className="flex items-center gap-1">{device.device_id.slice(0, 8)}...<button onClick={() => openHistory('device', device.device_id, `设备 ${device.device_id.slice(0, 8)}... 的历史记录`)} className="ml-2 text-blue-600 hover:text-blue-800" title="查看此设备的历史记录"><MessageSquare className="w-3.5 h-3.5" /></button></div></td><td className="px-6 py-4">{device.is_banned ? (<span className="inline-flex items-center gap-1 text-xs font-bold text-red-600 bg-red-100 px-2 py-1 rounded-full"><Ban className="w-3 h-3" /> {t.ban}</span>) : (<span className="inline-flex items-center gap-1 text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded-full"><CheckCircle className="w-3 h-3" /> {t.enable}</span>)}</td><td className="px-6 py-4"><div className="flex items-center gap-1.5 text-amber-600 font-medium"><Coins className="w-3.5 h-3.5" />{device.total_tokens}</div></td><td className="px-6 py-4 text-gray-500"><div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{new Date(device.last_seen).toLocaleString('zh-CN')}</div></td><td className="px-6 py-4 text-right"><button onClick={() => handleDeviceBanToggle(device)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${device.is_banned ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}>{device.is_banned ? t.unban : t.ban}</button></td></tr>);})}</tbody>
                    </table>
                  </div>
                </div>
              )}
          </section>
        )}

        {/* ... (Existing Modals: DB Error, Subject Edit, History, Limit) ... */}
        {/* Keeping existing modals exactly as they were, just rendering below */}
        {dbErrorModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
             <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-200">
                <div className="flex flex-col items-center gap-4 text-center">
                   <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
                      <AlertTriangle className="w-8 h-8" />
                   </div>
                   <h3 className="text-2xl font-bold text-gray-800">Database Setup Required</h3>
                   <p className="text-gray-600">
                     It seems your database schema is missing required tables (e.g., <code>image_access_keys</code> or <code>subjects</code>).
                     <br/>
                     Please go to your Supabase SQL Editor and run the following script:
                   </p>
                   
                   <div className="w-full bg-gray-900 rounded-xl p-4 text-left overflow-x-auto max-h-[300px] border border-gray-700 relative group">
                      <pre className="text-xs font-mono text-green-400 whitespace-pre-wrap break-all">
                        {`-- Copy content from supabase_schema.txt --\n\n${sqlToRun}`}
                      </pre>
                      <button 
                        onClick={() => {
                           navigator.clipboard.writeText("Please check supabase_schema.txt file for full code.");
                           alert("Please open supabase_schema.txt file to copy the full SQL script.");
                        }}
                        className="absolute top-2 right-2 bg-white/10 hover:bg-white/20 text-white text-xs px-2 py-1 rounded transition-colors"
                      >
                        Copy Tip
                      </button>
                   </div>
                   
                   <button 
                     onClick={() => setDbErrorModal(false)}
                     className="mt-4 px-8 py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition-colors"
                   >
                     I Have Updated the Database
                   </button>
                </div>
             </div>
          </div>
        )}
        
        {/* Subject Edit Modal */}
        {showSubjectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
             <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl p-6 animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
                <div className="flex justify-between items-center mb-6">
                   <h3 className="text-xl font-bold text-gray-800">{isEditingSubject ? '编辑学科' : '添加新学科'}</h3>
                   <button onClick={() => setShowSubjectModal(false)}><X className="w-6 h-6 text-gray-400 hover:text-gray-600" /></button>
                </div>
                <form onSubmit={handleSaveSubject} className="space-y-4">
                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500 uppercase">Code (ID)</label>
                        <input type="text" value={subjectForm.code} onChange={e => setSubjectForm({...subjectForm, code: e.target.value})} disabled={isEditingSubject} className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 disabled:text-gray-400" placeholder="math" required />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500 uppercase">显示名称</label>
                        <input type="text" value={subjectForm.label} onChange={e => setSubjectForm({...subjectForm, label: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="数学" required />
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                         <label className="text-xs font-semibold text-gray-500 uppercase">主题色 (Tailwind)</label>
                         <select value={subjectForm.color} onChange={e => setSubjectForm({...subjectForm, color: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm">
                            <option value="indigo">Indigo (蓝紫)</option>
                            <option value="emerald">Emerald (翠绿)</option>
                            <option value="violet">Violet (紫罗兰)</option>
                            <option value="rose">Rose (玫瑰红)</option>
                            <option value="amber">Amber (琥珀黄)</option>
                            <option value="sky">Sky (天蓝)</option>
                         </select>
                      </div>
                      <div className="space-y-1">
                         <label className="text-xs font-semibold text-gray-500 uppercase">图标</label>
                         <select value={subjectForm.icon} onChange={e => setSubjectForm({...subjectForm, icon: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm">
                            <option value="book">Book (书本)</option>
                            <option value="calculator">Calculator (计算器)</option>
                            <option value="pen">Pen (钢笔)</option>
                            <option value="languages">Languages (文)</option>
                            <option value="atom">Atom (原子/物理)</option>
                            <option value="globe">Globe (地球/地理)</option>
                            <option value="music">Music (音乐)</option>
                            <option value="code">Code (编程)</option>
                            <option value="palette">Palette (艺术)</option>
                         </select>
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                         <label className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-1"><Sparkles className="w-3 h-3" /> 粒子大小 (Size)</label>
                         <div className="flex items-center gap-2">
                             <input 
                               type="range" 
                               min="0.5" 
                               max="3.0" 
                               step="0.1"
                               value={subjectForm.char_size_scale ?? 1.0} 
                               onChange={e => setSubjectForm({...subjectForm, char_size_scale: parseFloat(e.target.value)})} 
                               className="flex-1"
                             />
                             <span className="text-xs font-mono w-8">{subjectForm.char_size_scale ?? 1.0}</span>
                         </div>
                      </div>
                      <div className="space-y-1">
                         <label className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-1"><Sparkles className="w-3 h-3" /> 透明度 (Opacity)</label>
                         <div className="flex items-center gap-2">
                             <input 
                               type="range" 
                               min="0.05" 
                               max="1.0" 
                               step="0.05"
                               value={subjectForm.char_opacity ?? 0.15} 
                               onChange={e => setSubjectForm({...subjectForm, char_opacity: parseFloat(e.target.value)})} 
                               className="flex-1"
                             />
                             <span className="text-xs font-mono w-8">{subjectForm.char_opacity ?? 0.15}</span>
                         </div>
                      </div>
                   </div>

                   <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-500 uppercase">前置提示词 (Prompt Prefix)</label>
                      <textarea 
                        value={subjectForm.prompt_prefix || ''} 
                        onChange={e => setSubjectForm({...subjectForm, prompt_prefix: e.target.value})}
                        className="w-full px-3 py-2 border rounded-lg text-sm h-32" 
                        placeholder="将会发送给 AI 作为该学科的 System Prompt..."
                      />
                   </div>

                   <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-500 uppercase">背景字符 (Background Chars)</label>
                      <input 
                        type="text" 
                        value={subjectForm.background_chars || ''} 
                        onChange={e => setSubjectForm({...subjectForm, background_chars: e.target.value})}
                        className="w-full px-3 py-2 border rounded-lg text-sm" 
                        placeholder="例如: 12+-x"
                      />
                      <p className="text-[10px] text-gray-400">这些字符将随机飘浮在背景中</p>
                   </div>
                   
                   <div className="flex items-center gap-2 pt-2">
                      <input 
                        type="checkbox" 
                        id="isActiveSubject"
                        checked={subjectForm.is_active} 
                        onChange={e => setSubjectForm({...subjectForm, is_active: e.target.checked})}
                      />
                      <label htmlFor="isActiveSubject" className="text-sm text-gray-700">启用该学科</label>
                   </div>

                   <button type="submit" disabled={isSubmitting} className="w-full bg-purple-600 text-white py-2.5 rounded-lg font-bold hover:bg-purple-700 transition-colors mt-4">
                      {isSubmitting ? '保存中...' : '保存学科配置'}
                   </button>
                </form>
             </div>
          </div>
        )}

        {/* History Modal */}
        {historyModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
             <div className="bg-white rounded-2xl w-full max-w-4xl h-[80vh] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b flex items-center justify-between bg-gray-50">
                  <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-purple-600" />{historyModal.title}
                  </h3>
                  <button onClick={() => setHistoryModal(prev => ({ ...prev, isOpen: false }))} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X className="w-5 h-5 text-gray-500" /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                   {loadingHistory ? (<div className="h-full flex flex-col items-center justify-center gap-3 text-gray-500"><Loader2 className="w-8 h-8 animate-spin text-purple-600" /><p>正在加载对话记录...</p></div>) : historyLogs.length === 0 ? (<div className="h-full flex flex-col items-center justify-center gap-3 text-gray-400"><div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center"><MessageSquare className="w-8 h-8 opacity-50" /></div><p>暂无对话记录</p></div>) : (
                     <div className="space-y-6">{historyLogs.map(log => (<div key={log.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"><div className="bg-gray-50 px-4 py-2 border-b text-xs text-gray-500 flex justify-between"><span>{new Date(log.created_at).toLocaleString('zh-CN')}</span><div className="flex gap-2"><span className="uppercase">{log.subject}</span>{log.grade_label && <span>• {log.grade_label}</span>}</div></div><div className="p-4 space-y-3"><div><span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded mb-1">Q</span><p className="font-medium text-gray-900">{log.question}</p></div><div className="pt-2 border-t border-dashed"><span className="inline-block px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded mb-2">A</span><div className="text-sm text-gray-600 max-h-60 overflow-y-auto prose prose-sm max-w-none"><MathRenderer content={log.answer} /></div></div></div></div>))}</div>
                   )}
                </div>
             </div>
          </div>
        )}

        {/* Limit Modal */}
        {limitModal.isOpen && (
           <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
             <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between mb-6"><h3 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Gauge className="w-6 h-6 text-purple-600" />{limitModal.type === 'main' ? '设置 Token 限额' : '设置图片数量限额'}</h3><button onClick={() => setLimitModal(prev => ({ ...prev, isOpen: false }))} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button></div>
                <div className="space-y-4"><div className="p-3 bg-purple-50 rounded-xl text-sm text-purple-800 border border-purple-100">正在为{limitModal.type === 'main' ? '主密钥' : '图片密钥'} <strong>{limitModal.keyName}</strong> 设置限额。<br/>当前用量: {limitModal.type === 'main' ? keys.find(k => k.id === limitModal.keyId)?.total_tokens : imageKeys.find(k => k.id === limitModal.keyId)?.total_images}</div>
                  <div className="flex items-center gap-3 p-3 border rounded-xl hover:bg-gray-50 cursor-pointer" onClick={() => setIsUnlimited(!isUnlimited)}><div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isUnlimited ? 'bg-purple-600 border-purple-600' : 'border-gray-300'}`}>{isUnlimited && <CheckCircle className="w-3.5 h-3.5 text-white" />}</div><span className="font-medium text-gray-700">无限制 (Unlimited)</span></div>
                  {!isUnlimited && (<div className="space-y-2 animate-in slide-in-from-top-2"><label className="text-sm font-semibold text-gray-700">{limitModal.type === 'main' ? 'Token 上限数值' : '图片数量上限'}</label><input type="number" value={newLimitValue} onChange={(e) => setNewLimitValue(e.target.value)} className="w-full px-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-500 font-mono text-lg" placeholder={limitModal.type === 'main' ? "例如: 10000" : "例如: 50"} autoFocus /><p className="text-xs text-gray-500">当用量达到此数值时，该密钥将被自动禁用。</p></div>)}
                  <div className="flex gap-3 pt-4"><button onClick={() => setLimitModal(prev => ({ ...prev, isOpen: false }))} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors">取消</button><button onClick={handleSaveLimit} disabled={isSavingLimit} className="flex-1 py-2.5 rounded-xl bg-purple-600 text-white font-bold hover:bg-purple-700 transition-colors shadow-md disabled:opacity-70">{isSavingLimit ? '保存中...' : '保存设置'}</button></div>
               </div>
             </div>
           </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;