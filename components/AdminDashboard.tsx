
import React, { useEffect, useState } from 'react';
import { fetchKeys, fetchDevices, addKey, toggleKeyStatus, deleteKey, toggleDeviceBan, fetchAdminHistory, updateKeyLimit, getAppTitle, updateAppTitle, updateAdminPassword, getAiMode, updateAiMode } from '../services/supabase';
import { AccessKey, DeviceSession, ChatHistoryItem, Language, AiMode } from '../types';
import { Plus, Power, Trash2, Smartphone, Loader2, LogOut, Key, Laptop, Clock, Coins, Ban, CheckCircle, MessageSquare, X, Gauge, AlertTriangle, Infinity as InfinityIcon, Settings, Save, Lock, Bot } from 'lucide-react';
import MathRenderer from './MathRenderer';
import LanguageSwitcher from './LanguageSwitcher';
import { translations } from '../utils/translations';

interface AdminDashboardProps {
  onLogout: () => void;
  language: Language;
  onLanguageChange: (lang: Language) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout, language, onLanguageChange }) => {
  const [activeTab, setActiveTab] = useState<'keys' | 'devices' | 'settings'>('keys');
  const [keys, setKeys] = useState<AccessKey[]>([]);
  const [devices, setDevices] = useState<DeviceSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCode, setNewCode] = useState('');
  const [newNote, setNewNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const t = translations[language];

  // Settings State
  const [appTitle, setAppTitle] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [aiMode, setAiMode] = useState<AiMode>('solver');
  const [savingSettings, setSavingSettings] = useState(false);

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
  }>({ isOpen: false, keyId: '', keyName: '', currentLimit: null });
  const [newLimitValue, setNewLimitValue] = useState<string>('');
  const [isUnlimited, setIsUnlimited] = useState(false);
  const [isSavingLimit, setIsSavingLimit] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'keys') {
        const data = await fetchKeys();
        setKeys(data);
      } else if (activeTab === 'devices') {
        const data = await fetchDevices();
        setDevices(data);
      } else if (activeTab === 'settings') {
        const title = await getAppTitle();
        setAppTitle(title);
        const mode = await getAiMode();
        setAiMode(mode);
      }
    } catch (error) {
      alert('加载数据失败');
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

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim()) return;
    
    setIsSubmitting(true);
    try {
      await addKey(newCode.trim(), newNote.trim());
      setNewCode('');
      setNewNote('');
      loadData();
    } catch (error) {
      alert('添加失败，可能密钥已存在');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggle = async (key: AccessKey) => {
    // Check if banned due to quota
    if (!key.is_active && key.token_limit !== null && key.total_tokens >= key.token_limit) {
      if (!confirm(`该密钥因超出 Token 限额 (${key.token_limit}) 而被禁用。强制启用可能导致其立即被再次禁用。\n建议先提高限额。\n\n确定要强制启用吗？`)) {
        return;
      }
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

  const handleDelete = async (code: string) => {
    if (!confirm(`警告：确定要彻底删除密钥 "${code}" 吗？这将清除所有关联记录！`)) return;
    try {
      await deleteKey(code);
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
    setHistoryLogs([]); // clear previous
    setHistoryModal({ isOpen: true, type, value, title });
  };

  const openLimitModal = (key: AccessKey) => {
    setLimitModal({
      isOpen: true,
      keyId: key.id,
      keyName: key.code,
      currentLimit: key.token_limit,
    });
    // Set initial values
    if (key.token_limit === null) {
      setIsUnlimited(true);
      setNewLimitValue('');
    } else {
      setIsUnlimited(false);
      setNewLimitValue(key.token_limit.toString());
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
      await updateKeyLimit(limitModal.keyId, limit);
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
      if (appTitle.trim()) {
        promises.push(updateAppTitle(appTitle.trim()));
      }
      if (newAdminPassword.trim()) {
        promises.push(updateAdminPassword(newAdminPassword.trim()));
      }
      promises.push(updateAiMode(aiMode));
      
      await Promise.all(promises);
      
      alert(t.saveSuccess);
      setNewAdminPassword(''); // Clear password field for security
    } catch(e) {
      alert(t.saveFail);
    } finally {
      setSavingSettings(false);
    }
  };

  const isMobile = (info: string) => /mobile|android|iphone|ipad/i.test(info);

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
          <div className="flex bg-gray-100 rounded-lg p-1">
             <button
              onClick={() => setActiveTab('keys')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'keys' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
             >
               {t.tabKeys}
             </button>
             <button
              onClick={() => setActiveTab('devices')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'devices' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
             >
               {t.tabDevices}
             </button>
             <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'settings' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
             >
               {t.tabSettings}
             </button>
          </div>
          <button 
            onClick={onLogout}
            className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            {t.logout}
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-8">
        
        {/* SETTINGS TAB */}
        {activeTab === 'settings' && (
          <section className="bg-white rounded-2xl shadow-sm border p-8 max-w-2xl mx-auto">
             <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Settings className="w-5 h-5 text-purple-600" />
                {t.settingsTitle}
             </h2>
             
             {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
                </div>
             ) : (
               <form onSubmit={handleSaveSettings} className="space-y-6">
                  {/* App Title */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      {t.siteTitle}
                    </label>
                    <input 
                      type="text" 
                      value={appTitle}
                      onChange={(e) => setAppTitle(e.target.value)}
                      className="w-full px-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-500"
                      placeholder="TongAI"
                    />
                    <p className="text-xs text-gray-500">
                      {t.siteTitleDesc}
                    </p>
                  </div>

                  {/* AI Mode Selector */}
                  <div className="space-y-2 pt-4 border-t">
                    <label className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <Bot className="w-4 h-4 text-gray-500" />
                      {t.aiModeTitle}
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <div 
                        onClick={() => setAiMode('solver')}
                        className={`cursor-pointer border rounded-xl p-3 text-sm flex flex-col gap-1 ${
                          aiMode === 'solver' 
                          ? 'bg-purple-50 border-purple-200 text-purple-800' 
                          : 'hover:bg-gray-50 text-gray-600'
                        }`}
                      >
                        <span className="font-bold flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${aiMode === 'solver' ? 'bg-purple-600' : 'border border-gray-400'}`}></div>
                          {t.modeSolver}
                        </span>
                      </div>
                      <div 
                        onClick={() => setAiMode('normal')}
                        className={`cursor-pointer border rounded-xl p-3 text-sm flex flex-col gap-1 ${
                          aiMode === 'normal' 
                          ? 'bg-blue-50 border-blue-200 text-blue-800' 
                          : 'hover:bg-gray-50 text-gray-600'
                        }`}
                      >
                        <span className="font-bold flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${aiMode === 'normal' ? 'bg-blue-600' : 'border border-gray-400'}`}></div>
                          {t.modeNormal}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">
                      {t.aiModeDesc}
                    </p>
                  </div>

                  {/* Admin Password */}
                  <div className="space-y-2 pt-4 border-t">
                    <label className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <Lock className="w-4 h-4 text-gray-500" />
                      {t.adminPassTitle}
                    </label>
                    <input 
                      type="password" 
                      value={newAdminPassword}
                      onChange={(e) => setNewAdminPassword(e.target.value)}
                      className="w-full px-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-500"
                      placeholder={t.adminPassPlaceholder}
                    />
                    <p className="text-xs text-gray-500">
                      {t.adminPassDesc}
                    </p>
                  </div>
                  
                  <div className="pt-6">
                    <button 
                      type="submit"
                      disabled={savingSettings || (!appTitle.trim() && !newAdminPassword.trim())}
                      className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      {t.saveSettings}
                    </button>
                  </div>
               </form>
             )}
          </section>
        )}

        {/* KEY MANAGEMENT TAB */}
        {activeTab === 'keys' && (
          <>
            {/* Add Key Form */}
            <section className="bg-white rounded-2xl shadow-sm border p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5 text-purple-600" />
                {t.addKeyTitle}
              </h2>
              <form onSubmit={handleAdd} className="flex gap-4 flex-wrap sm:flex-nowrap">
                <input
                  type="text"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  placeholder="密钥 (例如: vip-888)"
                  className="flex-1 min-w-[200px] px-4 py-2 border rounded-xl focus:ring-2 focus:ring-purple-200 outline-none"
                  required
                />
                <input
                  type="text"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="备注 (例如: 张三)"
                  className="flex-1 min-w-[200px] px-4 py-2 border rounded-xl focus:ring-2 focus:ring-purple-200 outline-none"
                />
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-purple-600 text-white px-6 py-2 rounded-xl font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? '...' : t.addKeyBtn}
                </button>
              </form>
            </section>

            {/* Keys List */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-700">{t.tabKeys} ({keys.length})</h2>
                <button onClick={loadData} className="text-sm text-purple-600 hover:underline">{t.refresh}</button>
              </div>
              
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
                </div>
              ) : keys.length === 0 ? (
                <div className="text-center py-12 text-gray-400 bg-white rounded-2xl border border-dashed">
                  {t.noKeys}
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {keys.map((key) => {
                    // Calculate Quota Percentage
                    const limit = key.token_limit;
                    const usage = key.total_tokens;
                    const isOverLimit = limit !== null && usage >= limit;
                    const percent = limit ? Math.min((usage / limit) * 100, 100) : 0;
                    
                    return (
                    <div 
                      key={key.id} 
                      className={`bg-white p-5 rounded-2xl border transition-all hover:shadow-md ${!key.is_active ? 'opacity-80' : ''}`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                             <h3 className="font-mono text-xl font-bold text-gray-800 tracking-wide">{key.code}</h3>
                             {isOverLimit && !key.is_active && (
                               <span className="text-[10px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded border border-red-200 flex items-center gap-0.5">
                                 <AlertTriangle className="w-3 h-3" /> 超限封禁
                               </span>
                             )}
                          </div>
                          <p className="text-sm text-gray-500 mt-1">{key.note || '无备注'}</p>
                        </div>
                        <div className={`px-2 py-0.5 text-xs rounded-full font-medium ${key.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {key.is_active ? t.enable : t.ban}
                        </div>
                      </div>

                      <div className="space-y-3 mb-4">
                         {/* Stats Row */}
                         <div className="grid grid-cols-2 gap-2">
                            <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-2 rounded-lg">
                                <Smartphone className="w-4 h-4 text-gray-400" />
                                <div>
                                  <p className="text-xs text-gray-400">设备数</p>
                                  <span className="font-bold text-gray-900">{key.device_sessions?.[0]?.count || 0}</span>
                                </div>
                            </div>
                             <div 
                                onClick={() => openLimitModal(key)}
                                className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-2 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors group relative"
                                title="点击设置限额"
                             >
                                <Gauge className={`w-4 h-4 ${isOverLimit ? 'text-red-500' : 'text-blue-500'}`} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-gray-400 flex items-center justify-between">
                                    Token
                                    <span className="group-hover:opacity-100 opacity-0 text-[10px] text-blue-600 font-bold transition-opacity">设置</span>
                                  </p>
                                  <div className="flex items-baseline gap-1 font-bold text-gray-900 truncate">
                                    <span>{key.total_tokens}</span>
                                    <span className="text-gray-400 font-normal text-xs">/</span>
                                    {limit === null ? (
                                      <InfinityIcon className="w-3 h-3 text-gray-400" />
                                    ) : (
                                      <span className={isOverLimit ? 'text-red-600' : ''}>{limit}</span>
                                    )}
                                  </div>
                                </div>
                             </div>
                         </div>
                         
                         {/* Progress Bar for Limit */}
                         {limit !== null && (
                           <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ${isOverLimit ? 'bg-red-500' : percent > 80 ? 'bg-amber-400' : 'bg-blue-500'}`} 
                                style={{ width: `${percent}%` }}
                              ></div>
                           </div>
                         )}
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t mt-2">
                         <button
                           onClick={() => openHistory('key', key.code, `密钥 ${key.code} 的历史记录`)}
                           className="flex-1 flex items-center justify-center gap-1 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                         >
                           <MessageSquare className="w-4 h-4" />
                           {t.history}
                         </button>
                        <button
                          onClick={() => handleToggle(key)}
                          className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                            key.is_active 
                              ? 'text-amber-600 hover:bg-amber-50' 
                              : 'text-green-600 hover:bg-green-50'
                          }`}
                        >
                          <Power className="w-4 h-4" />
                          {key.is_active ? t.ban : t.enable}
                        </button>
                        <button
                          onClick={() => handleDelete(key.code)}
                          className="w-10 flex items-center justify-center py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );})}
                </div>
              )}
            </section>
          </>
        )}

        {/* DEVICE MANAGEMENT TAB */}
        {activeTab === 'devices' && (
          <section className="space-y-4">
             <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-700">{t.tabDevices} ({devices.length})</h2>
                <button onClick={loadData} className="text-sm text-purple-600 hover:underline">{t.refresh}</button>
             </div>

             {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
                </div>
              ) : devices.length === 0 ? (
                <div className="text-center py-12 text-gray-400 bg-white rounded-2xl border border-dashed">
                  {t.noDevices}
                </div>
              ) : (
                <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-gray-50 text-gray-500 border-b">
                        <tr>
                          <th className="px-6 py-3 font-medium">{t.deviceType}</th>
                          <th className="px-6 py-3 font-medium">{t.deviceKey}</th>
                          <th className="px-6 py-3 font-medium">{t.deviceId}</th>
                          <th className="px-6 py-3 font-medium">{t.status}</th>
                          <th className="px-6 py-3 font-medium">Token</th>
                          <th className="px-6 py-3 font-medium">{t.lastSeen}</th>
                          <th className="px-6 py-3 font-medium text-right">{t.operate}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {devices.map((device) => {
                          const isMobileDevice = isMobile(device.device_info || '');
                          return (
                            <tr key={`${device.key_code}-${device.device_id}`} className={`hover:bg-gray-50 transition-colors ${device.is_banned ? 'bg-red-50/50' : ''}`}>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <div className={`p-1.5 rounded-lg ${isMobileDevice ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>
                                    {isMobileDevice ? <Smartphone className="w-4 h-4" /> : <Laptop className="w-4 h-4" />}
                                  </div>
                                  <span className="font-medium text-gray-700">{isMobileDevice ? '移动端' : 'PC端'}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className="font-mono bg-purple-50 text-purple-700 px-2 py-1 rounded border border-purple-100">
                                  {device.key_code}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-gray-500 font-mono text-xs">
                                <div className="flex items-center gap-1">
                                  {device.device_id.slice(0, 8)}...
                                  <button 
                                    onClick={() => openHistory('device', device.device_id, `设备 ${device.device_id.slice(0, 8)}... 的历史记录`)}
                                    className="ml-2 text-blue-600 hover:text-blue-800"
                                    title="查看此设备的历史记录"
                                  >
                                    <MessageSquare className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                {device.is_banned ? (
                                    <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600 bg-red-100 px-2 py-1 rounded-full">
                                        <Ban className="w-3 h-3" /> {t.ban}
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded-full">
                                        <CheckCircle className="w-3 h-3" /> {t.enable}
                                    </span>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-1.5 text-amber-600 font-medium">
                                  <Coins className="w-3.5 h-3.5" />
                                  {device.total_tokens}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-gray-500">
                                <div className="flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5" />
                                  {new Date(device.last_seen).toLocaleString('zh-CN')}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <button
                                  onClick={() => handleDeviceBanToggle(device)}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                    device.is_banned
                                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                      : 'bg-red-100 text-red-700 hover:bg-red-200'
                                  }`}
                                >
                                  {device.is_banned ? t.unban : t.ban}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
          </section>
        )}

        {/* History Modal */}
        {historyModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
             <div className="bg-white rounded-2xl w-full max-w-4xl h-[80vh] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Modal Header */}
                <div className="px-6 py-4 border-b flex items-center justify-between bg-gray-50">
                  <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-purple-600" />
                    {historyModal.title}
                  </h3>
                  <button 
                    onClick={() => setHistoryModal(prev => ({ ...prev, isOpen: false }))}
                    className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                {/* Modal Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                   {loadingHistory ? (
                     <div className="h-full flex flex-col items-center justify-center gap-3 text-gray-500">
                        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                        <p>正在加载对话记录...</p>
                     </div>
                   ) : historyLogs.length === 0 ? (
                     <div className="h-full flex flex-col items-center justify-center gap-3 text-gray-400">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                           <MessageSquare className="w-8 h-8 opacity-50" />
                        </div>
                        <p>暂无对话记录</p>
                     </div>
                   ) : (
                     <div className="space-y-6">
                       {historyLogs.map(log => (
                         <div key={log.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="bg-gray-50 px-4 py-2 border-b text-xs text-gray-500 flex justify-between">
                              <span>{new Date(log.created_at).toLocaleString('zh-CN')}</span>
                              <div className="flex gap-2">
                                <span className="uppercase">{log.subject}</span>
                                {log.grade_label && <span>• {log.grade_label}</span>}
                              </div>
                            </div>
                            <div className="p-4 space-y-3">
                               <div>
                                  <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded mb-1">Q</span>
                                  <p className="font-medium text-gray-900">{log.question}</p>
                               </div>
                               <div className="pt-2 border-t border-dashed">
                                  <span className="inline-block px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded mb-2">A</span>
                                  <div className="text-sm text-gray-600 max-h-60 overflow-y-auto prose prose-sm max-w-none">
                                    <MathRenderer content={log.answer} />
                                  </div>
                               </div>
                            </div>
                         </div>
                       ))}
                     </div>
                   )}
                </div>
             </div>
          </div>
        )}

        {/* Token Limit Modal */}
        {limitModal.isOpen && (
           <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
             <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <Gauge className="w-6 h-6 text-purple-600" />
                    设置 Token 限额
                  </h3>
                  <button 
                    onClick={() => setLimitModal(prev => ({ ...prev, isOpen: false }))}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div className="p-3 bg-purple-50 rounded-xl text-sm text-purple-800 border border-purple-100">
                     正在为密钥 <strong>{limitModal.keyName}</strong> 设置限额。
                     <br/>当前用量: {keys.find(k => k.id === limitModal.keyId)?.total_tokens}
                  </div>

                  <div className="flex items-center gap-3 p-3 border rounded-xl hover:bg-gray-50 cursor-pointer" onClick={() => setIsUnlimited(!isUnlimited)}>
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isUnlimited ? 'bg-purple-600 border-purple-600' : 'border-gray-300'}`}>
                      {isUnlimited && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <span className="font-medium text-gray-700">无限制 (Unlimited)</span>
                  </div>

                  {!isUnlimited && (
                    <div className="space-y-2 animate-in slide-in-from-top-2">
                       <label className="text-sm font-semibold text-gray-700">Token 上限数值</label>
                       <input 
                         type="number" 
                         value={newLimitValue}
                         onChange={(e) => setNewLimitValue(e.target.value)}
                         className="w-full px-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-500 font-mono text-lg"
                         placeholder="例如: 10000"
                         autoFocus
                       />
                       <p className="text-xs text-gray-500">当总用量达到此数值时，该密钥将被自动禁用。</p>
                    </div>
                  )}

                  <div className="flex gap-3 pt-4">
                     <button 
                       onClick={() => setLimitModal(prev => ({ ...prev, isOpen: false }))}
                       className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors"
                     >
                       取消
                     </button>
                     <button 
                       onClick={handleSaveLimit}
                       disabled={isSavingLimit}
                       className="flex-1 py-2.5 rounded-xl bg-purple-600 text-white font-bold hover:bg-purple-700 transition-colors shadow-md disabled:opacity-70"
                     >
                       {isSavingLimit ? '保存中...' : '保存设置'}
                     </button>
                  </div>
               </div>
             </div>
           </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
