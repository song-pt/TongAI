

import React, { useEffect, useState, useRef } from 'react';
import { fetchKeys, fetchDevices, addKey, toggleKeyStatus, deleteKey, toggleDeviceBan, fetchAdminHistory, updateKeyLimit, getAppTitle, updateAppTitle, updateAdminPassword, getAiMode, updateAiMode, fetchImageKeys, addImageKey, toggleImageKeyStatus, updateImageKeyLimit, deleteImageKey, fetchSubjects, addSubject, updateSubject, deleteSubject, getAppLogo, updateAppLogo, getAiProviderConfig, updateAiProviderConfig, getShowUsageToUser, updateShowUsageToUser, getFollowUpContextLimit, updateFollowUpContextLimit, fetchLevels, addLevel, updateLevel, deleteLevel } from '../services/supabase';
import { AccessKey, DeviceSession, ChatHistoryItem, Language, AiMode, ImageAccessKey, Subject, Level } from '../types';
import { Plus, Power, Trash2, Smartphone, Loader2, LogOut, Key, Laptop, Clock, Coins, Ban, CheckCircle, MessageSquare, X, Gauge, AlertTriangle, Infinity as InfinityIcon, Settings, Save, Lock, Bot, Image as ImageIcon, Palette, Edit3, Upload, MapPin, Server, Sparkles, Eye, EyeOff, Cpu, MessageCircle, GraduationCap } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'keys' | 'devices' | 'settings' | 'imageKeys' | 'subjects' | 'levels'>('keys');
  
  // Data State
  const [keys, setKeys] = useState<AccessKey[]>([]);
  const [imageKeys, setImageKeys] = useState<ImageAccessKey[]>([]);
  const [devices, setDevices] = useState<DeviceSession[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  
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
  const [aiTextModel, setAiTextModel] = useState('');
  const [aiVisionModel, setAiVisionModel] = useState('');
  
  // Feature Toggles
  const [showUsageToUser, setShowUsageToUser] = useState(false);
  const [followUpContextLimit, setFollowUpContextLimit] = useState<number>(5);

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

  // Level Form State
  const [levelForm, setLevelForm] = useState<Partial<Level>>({
    code: '',
    label: '',
    sort_order: 0,
    is_active: true
  });
  const [isEditingLevel, setIsEditingLevel] = useState(false);
  const [showLevelModal, setShowLevelModal] = useState(false);

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
        setAiTextModel(provider.textModel);
        setAiVisionModel(provider.visionModel);
        const showUsage = await getShowUsageToUser();
        setShowUsageToUser(showUsage);
        const contextLimit = await getFollowUpContextLimit();
        setFollowUpContextLimit(contextLimit);
      } else if (activeTab === 'subjects') {
        const subs = await fetchSubjects(true); // fetch all including inactive
        setSubjects(subs);
        const logo = await getAppLogo();
        setAppLogo(logo);
      } else if (activeTab === 'levels') {
        const lvls = await fetchLevels(true);
        setLevels(lvls);
      }
    } catch (error: any) {
      console.error("Dashboard Load Error:", error);
      const msg = error.message || "Unknown error";
      
      if (msg === "DB_MISSING_IMAGE_TABLE" || msg.includes('relation "public.image_access_keys" does not exist') || msg.includes('relation "public.levels" does not exist')) {
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
      } else if (activeTab === 'levels') {
        await deleteLevel(code);
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
      promises.push(updateAiProviderConfig(aiApiKey.trim(), aiBaseUrl.trim(), aiTextModel.trim(), aiVisionModel.trim()));
      promises.push(updateShowUsageToUser(showUsageToUser)); 
      promises.push(updateFollowUpContextLimit(followUpContextLimit));
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
        const updates = { ...subjectForm };
        delete (updates as any).code;
        delete (updates as any).created_at;

        await updateSubject(subjectForm.code!, updates);
      } else {
        await addSubject(subjectForm as Subject);
      }
      setShowSubjectModal(false);
      loadData();
    } catch (e: any) {
      console.error(e);
      alert(`保存失败: ${e.message || '可能 ID 重复或数据格式错误'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Levels Logic ---
  const handleEditLevel = (lvl: Level) => {
    setLevelForm(lvl);
    setIsEditingLevel(true);
    setShowLevelModal(true);
  };

  const handleNewLevel = () => {
    setLevelForm({
      code: '',
      label: '',
      sort_order: levels.length + 1,
      is_active: true
    });
    setIsEditingLevel(false);
    setShowLevelModal(true);
  };

  const handleSaveLevel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!levelForm.code || !levelForm.label) return;
    setIsSubmitting(true);
    try {
      if (isEditingLevel) {
        const updates = { ...levelForm };
        delete (updates as any).code;
        delete (updates as any).created_at;
        delete (updates as any).id;
        
        await updateLevel(levelForm.code!, updates);
      } else {
        await addLevel(levelForm);
      }
      setShowLevelModal(false);
      loadData();
    } catch (e: any) {
      alert(`保存失败: ${e.message}`);
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
             <button onClick={() => setActiveTab('levels')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap flex items-center gap-1 ${activeTab === 'levels' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><GraduationCap className="w-3 h-3" /> 等级管理</button>
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

        {activeTab === 'levels' && (
           <section className="bg-white rounded-2xl shadow-sm border p-6">
              <div className="flex items-center justify-between mb-6">
                 <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-purple-600" />
                    等级(年级)管理 (Levels Management)
                 </h2>
                 <button 
                   onClick={handleNewLevel}
                   className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium text-sm"
                 >
                   <Plus className="w-4 h-4" />
                   添加等级
                 </button>
              </div>

              {loading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-purple-600" /></div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                   {levels.map(lvl => (
                      <div key={lvl.code} className={`border rounded-xl p-4 transition-all hover:shadow-md ${!lvl.is_active ? 'opacity-60 bg-gray-50' : 'bg-white'}`}>
                         <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                               <div className={`p-2 rounded-lg bg-gray-100 text-gray-600`}>
                                 <GraduationCap className="w-4 h-4" />
                               </div>
                               <div>
                                  <h3 className="font-bold text-gray-800">{lvl.label}</h3>
                                  <p className="text-xs text-gray-500 font-mono">#{lvl.sort_order} / {lvl.code}</p>
                               </div>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${lvl.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {lvl.is_active ? '启用' : '禁用'}
                            </span>
                         </div>
                         <div className="flex gap-2 mt-4 pt-3 border-t">
                            <button 
                              onClick={() => handleEditLevel(lvl)}
                              className="flex-1 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs font-bold flex items-center justify-center gap-1"
                            >
                              <Edit3 className="w-3 h-3" /> 编辑
                            </button>
                            <button 
                              onClick={() => handleDelete(lvl.code)}
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

                      <div className="flex flex-col gap-2 p-3 border rounded-xl bg-gray-50/50">
                          <div>
                              <span className="font-medium text-gray-800 text-sm flex items-center gap-2">
                                  <MessageCircle className="w-4 h-4 text-gray-500" />
                                  追问上下文长度 (Context Limit)
                              </span>
                              <p className="text-xs text-gray-500 mt-1">设置用户在“追问”模式下，AI 能记住的历史对话数量。</p>
                          </div>
                          <div className="flex items-center gap-4 mt-1">
                              <input 
                                type="range" 
                                min="1" 
                                max="20" 
                                value={followUpContextLimit} 
                                onChange={(e) => setFollowUpContextLimit(parseInt(e.target.value))} 
                                className="flex-1"
                              />
                              <span className="font-mono bg-white px-3 py-1 rounded border text-sm font-bold">{followUpContextLimit}</span>