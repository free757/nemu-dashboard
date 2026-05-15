'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Users, 
  Settings, 
  Plus, 
  Search, 
  RefreshCw, 
  LogOut, 
  ShieldCheck, 
  Globe,
  Trash2,
  Edit2,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Menu,
  Bot
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Dashboard() {
  const [users, setUsers] = useState<any[]>([]);
  const [remoteConfigs, setRemoteConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('users');
  const [searchQuery, setSearchQuery] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{id: string, name: string} | null>(null);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editingConfig, setEditingConfig] = useState<any>(null);
  const [lang, setLang] = useState<'en' | 'ar'>('en');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  // API Keys State (Stored locally for security)
  const [apiKeys, setApiKeys] = useState({
    gemini: '',
    elevenlabs: ''
  });

  const [cvText, setCvText] = useState('');
  const [isUploadingCv, setIsUploadingCv] = useState(false);

  useEffect(() => {
    // Load keys from local storage on mount
    const savedKeys = localStorage.getItem('nemu_api_keys');
    if (savedKeys) {
      try {
        setApiKeys(JSON.parse(savedKeys));
      } catch (e) {}
    }
    
    // Load saved CV text if exists
    const savedCv = localStorage.getItem('nemu_cv_text');
    if (savedCv) {
      setCvText(savedCv);
    }
  }, []);

  const handleSaveApiKeys = () => {
    localStorage.setItem('nemu_api_keys', JSON.stringify(apiKeys));
    alert(lang === 'ar' ? 'تم الحفظ بنجاح!' : 'Saved successfully!');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert(lang === 'ar' ? 'يرجى رفع ملف PDF فقط' : 'Please upload a PDF file only');
      return;
    }

    setIsUploadingCv(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/parse-pdf', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        setCvText(data.text);
        localStorage.setItem('nemu_cv_text', data.text);
        alert(lang === 'ar' ? 'تم استخراج النص من السيرة الذاتية بنجاح!' : 'CV text extracted successfully!');
      } else {
        alert(data.error || 'Failed to parse PDF');
      }
    } catch (error) {
      console.error('Error uploading CV:', error);
      alert('Error parsing PDF');
    } finally {
      setIsUploadingCv(false);
      // reset file input
      e.target.value = '';
    }
  };

  const [formData, setFormData] = useState({
    pin: '',
    username: '',
    phone_number: '',
    proxy_ip: '',
    proxy_port: '',
    proxy_user: '',
    proxy_pass: '',
    proxy_location: '',
    proxy_timezone: ''
  });

  const [configFormData, setConfigFormData] = useState({
    config_key: '',
    config_value: '',
    is_enabled: true
  });

  const t = {
    en: {
      users: 'Users Management',
      config: 'Remote Config',
      tools: 'AI Tools',
      signOut: 'Sign Out',
      title: 'Manage Users',
      configTitle: 'Remote Configuration',
      toolsTitle: 'AI Interview Pilot',
      subtitle: 'Control everything in real-time from one place.',
      toolsSubtitle: 'Your personal AI assistant for interviews.',
      addNew: 'Add New User',
      addConfig: 'Add New Config',
      search: 'Search users by name or PIN...',
      profile: 'User Profile',
      pin: 'PIN',
      proxy: 'Proxy Info',
      actions: 'Actions',
      noUsers: 'No users found matching your search.',
      edit: 'Edit User Profile',
      create: 'Create New User',
      fullName: 'Full Name',
      loginPin: 'Login PIN',
      phone: 'Phone Number',
      proxyConfig: 'Proxy Configuration',
      ip: 'IP Address',
      port: 'Port',
      user: 'Proxy Username',
      pass: 'Proxy Password',
      location: 'IP Location',
      timezone: 'Timezone',
      fetchBtn: 'Fetch Info',
      cancel: 'Cancel',
      save: 'Save Changes',
      createBtn: 'Create User',
      configKey: 'Configuration Key (e.g. home_link)',
      configVal: 'Value (JSON or Text)',
      enabled: 'Is Enabled',
      saveConfig: 'Save Configuration',
      createConfig: 'Create Configuration',
      confirmTitle: 'Are you sure?',
      confirmText: 'Do you really want to delete this? This action cannot be undone.',
      confirmBtn: 'Yes, Delete',
      confirmCancel: 'No, Keep'
    },
    ar: {
      users: 'إدارة المستخدمين',
      config: 'الإعدادات عن بعد',
      tools: 'أدوات الذكاء الاصطناعي',
      signOut: 'تسجيل الخروج',
      title: 'إدارة المستخدمين',
      configTitle: 'الإعدادات عن بعد',
      toolsTitle: 'المساعد الذكي للمقابلات',
      subtitle: 'تحكم في كل شيء في الوقت الفعلي من مكان واحد.',
      toolsSubtitle: 'مساعدك الشخصي المدعوم بالذكاء الاصطناعي لاجتياز المقابلات.',
      addNew: 'إضافة مستخدم جديد',
      addConfig: 'إضافة إعداد جديد',
      search: 'ابحث عن المستخدمين بالاسم أو الـ PIN...',
      profile: 'ملف المستخدم',
      pin: 'كود الدخول',
      proxy: 'بيانات البروكسي',
      actions: 'الإجراءات',
      noUsers: 'لم يتم العثور على مستخدمين يطابقون بحثك.',
      edit: 'تعديل ملف المستخدم',
      create: 'إنشاء مستخدم جديد',
      fullName: 'الاسم الكامل',
      loginPin: 'كود الدخول (PIN)',
      phone: 'رقم الهاتف',
      proxyConfig: 'إعدادات البروكسي',
      ip: 'عنوان الـ IP',
      port: 'المنفذ (Port)',
      user: 'اسم مستخدم البروكسي',
      pass: 'كلمة سر البروكسي',
      location: 'موقع الـ IP',
      timezone: 'المنطقة الزمنية',
      fetchBtn: 'جلب المعلومات',
      cancel: 'إلغاء',
      save: 'حفظ التعديلات',
      createBtn: 'إنشاء المستخدم',
      configKey: 'اسم الإعداد (مثلاً: home_link)',
      configVal: 'القيمة (نص أو JSON)',
      enabled: 'مفعل',
      saveConfig: 'حفظ الإعداد',
      createConfig: 'إنشاء الإعداد',
      confirmTitle: 'هل أنت متأكد؟',
      confirmText: 'هل تريد حقاً حذف هذا؟ لا يمكن التراجع عن هذا الإجراء.',
      confirmBtn: 'نعم، احذف',
      confirmCancel: 'لا، تراجع'
    }
  }[lang];

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('app_users').select('*').order('created_at', { ascending: false });
    if (!error) setUsers(data);
    setLoading(false);
  };

  const fetchConfigs = async () => {
    const { data, error } = await supabase.from('remote_configs').select('*').order('created_at', { ascending: false });
    if (!error) setRemoteConfigs(data);
  };

  useEffect(() => {
    fetchUsers();
    fetchConfigs();
  }, []);

  const handleDeleteClick = (id: string, name: string, type: 'user' | 'config' = 'user') => {
    setConfirmAction({id, name});
    // Store type in confirmAction metadata if needed, but for now we'll check activeTab
    setIsConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (confirmAction) {
      const table = activeTab === 'users' ? 'app_users' : 'remote_configs';
      const { error } = await supabase.from(table).delete().eq('id', confirmAction.id);
      if (!error) {
        activeTab === 'users' ? fetchUsers() : fetchConfigs();
        setIsConfirmOpen(false);
      }
    }
  };

  const handleOpenEdit = (user: any) => {
    setEditingUser(user);
    setFormData({
      pin: user.pin || '',
      username: user.username || '',
      phone_number: user.phone_number || '',
      proxy_ip: user.proxy_ip || '',
      proxy_port: user.proxy_port?.toString() || '',
      proxy_user: user.proxy_user || '',
      proxy_pass: user.proxy_pass || '',
      proxy_location: user.proxy_location || '',
      proxy_timezone: user.proxy_timezone || ''
    });
    setIsModalOpen(true);
  };

  const handleOpenConfigEdit = (config: any) => {
    setEditingConfig(config);
    setConfigFormData({
      config_key: config.config_key,
      config_value: typeof config.config_value === 'object' ? JSON.stringify(config.config_value, null, 2) : config.config_value,
      is_enabled: config.is_enabled
    });
    setIsConfigModalOpen(true);
  };

  const handleOpenAdd = () => {
    if (activeTab === 'users') {
      setEditingUser(null);
      setFormData({
        pin: '', username: '', phone_number: '',
        proxy_ip: '', proxy_port: '', proxy_user: '', proxy_pass: '',
        proxy_location: '', proxy_timezone: ''
      });
      setIsModalOpen(true);
    } else {
      setEditingConfig(null);
      setConfigFormData({
        config_key: '',
        config_value: '',
        is_enabled: true
      });
      setIsConfigModalOpen(true);
    }
  };

  const fetchIpInfo = async () => {
    if (!formData.proxy_ip || formData.proxy_ip.length < 7) return;
    try {
      const res = await fetch(`https://ipapi.co/${formData.proxy_ip}/json/`);
      const data = await res.json();
      if (!data.error) {
        setFormData(prev => ({
          ...prev,
          proxy_location: `${data.city || ''}, ${data.country_name || ''}`,
          proxy_timezone: data.timezone || ''
        }));
      }
    } catch (err) {
      console.error('Failed to fetch IP info:', err);
    }
  };

  // Auto-fetch IP info when IP changes (with debounce)
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchIpInfo();
    }, 1200);
    return () => clearTimeout(timer);
  }, [formData.proxy_ip]);

  const handleConfigSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let parsedValue;
    try {
      parsedValue = JSON.parse(configFormData.config_value);
    } catch (e) {
      parsedValue = configFormData.config_value;
    }

    const payload = {
      ...configFormData,
      config_value: parsedValue
    };

    let error;
    if (editingConfig) {
      const { error: err } = await supabase.from('remote_configs').update(payload).eq('id', editingConfig.id);
      error = err;
    } else {
      const { error: err } = await supabase.from('remote_configs').insert([payload]);
      error = err;
    }

    if (!error) {
      setIsConfigModalOpen(false);
      fetchConfigs();
    } else {
      alert(error.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      proxy_port: parseInt(formData.proxy_port)
    };

    let error;
    if (editingUser) {
      const { error: err } = await supabase.from('app_users').update(payload).eq('id', editingUser.id);
      error = err;
    } else {
      const { error: err } = await supabase.from('app_users').insert([payload]);
      error = err;
    }

    if (!error) {
      setIsModalOpen(false);
      fetchUsers();
    } else {
      alert(error.message);
    }
  };

  const filteredUsers = users.filter(user => 
    user.username?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    user.pin?.includes(searchQuery)
  );

  return (
    <div className={`flex h-screen ${theme === 'dark' ? 'bg-[#0a0a0a] text-white' : 'bg-[#f8f9fa] text-gray-900'} ${lang === 'ar' ? 'font-arabic' : ''}`} dir="ltr">
      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarCollapsed ? 80 : 256 }}
        className={`border-r flex flex-col transition-colors relative ${theme === 'dark' ? 'bg-[#111] border-white/5' : 'bg-white border-gray-200'}`}
      >
        {/* Toggle Button */}
        <button 
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className={`absolute -right-3 top-10 w-6 h-6 rounded-full border flex items-center justify-center z-10 transition-all ${theme === 'dark' ? 'bg-[#1a1a1a] border-white/10 text-gray-400 hover:text-white' : 'bg-white border-gray-200 text-gray-400 hover:text-gray-900 shadow-sm'}`}
        >
          {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        <div className={`p-6 flex items-center gap-3 overflow-hidden ${isSidebarCollapsed ? 'justify-center px-0' : ''}`}>
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex-shrink-0 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          {!isSidebarCollapsed && (
            <motion.span 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="font-bold text-xl tracking-tight whitespace-nowrap"
            >
              NEMU<span className="text-blue-500">ADMIN</span>
            </motion.span>
          )}
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2">
          <button 
            onClick={() => setActiveTab('users')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'users' ? 'bg-blue-600/10 text-blue-500 border border-blue-500/20' : theme === 'dark' ? 'text-gray-400 hover:bg-white/5' : 'text-gray-600 hover:bg-gray-100'} ${isSidebarCollapsed ? 'justify-center px-0' : ''}`}
          >
            <Users className="w-5 h-5 flex-shrink-0" />
            {!isSidebarCollapsed && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-medium whitespace-nowrap">{t.users}</motion.span>}
          </button>
          <button 
            onClick={() => setActiveTab('config')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'config' ? 'bg-blue-600/10 text-blue-500 border border-blue-500/20' : theme === 'dark' ? 'text-gray-400 hover:bg-white/5' : 'text-gray-600 hover:bg-gray-100'} ${isSidebarCollapsed ? 'justify-center px-0' : ''}`}
          >
            <Settings className="w-5 h-5 flex-shrink-0" />
            {!isSidebarCollapsed && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-medium whitespace-nowrap">{t.config}</motion.span>}
          </button>
          <button 
            onClick={() => setActiveTab('tools')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'tools' ? 'bg-blue-600/10 text-blue-500 border border-blue-500/20' : theme === 'dark' ? 'text-gray-400 hover:bg-white/5' : 'text-gray-600 hover:bg-gray-100'} ${isSidebarCollapsed ? 'justify-center px-0' : ''}`}
          >
            <Bot className="w-5 h-5 flex-shrink-0" />
            {!isSidebarCollapsed && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-medium whitespace-nowrap">{t.tools}</motion.span>}
          </button>
        </nav>

        <div className={`p-4 border-t border-white/5 space-y-4 ${isSidebarCollapsed ? 'items-center flex flex-col px-0' : ''}`}>
          <div className={`flex items-center px-2 ${isSidebarCollapsed ? 'flex-col gap-4' : 'justify-between'}`}>
            <button 
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className={`p-2 rounded-lg transition-all ${theme === 'dark' ? 'bg-white/5 text-yellow-400' : 'bg-gray-100 text-gray-500'}`}
            >
              {theme === 'dark' ? <motion.div animate={{ rotate: 360 }}>☀️</motion.div> : <motion.div animate={{ rotate: 180 }}>🌙</motion.div>}
            </button>
            <button 
              onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${theme === 'dark' ? 'bg-white/5 text-blue-400' : 'bg-gray-100 text-blue-600'}`}
            >
              {isSidebarCollapsed ? lang.toUpperCase() : (lang === 'en' ? 'ARABIC' : 'ENGLISH')}
            </button>
          </div>
          <button className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-400/10 transition-all ${isSidebarCollapsed ? 'justify-center px-0' : ''}`}>
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {!isSidebarCollapsed && <span className="font-medium">{t.signOut}</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              {activeTab === 'users' ? t.title : activeTab === 'config' ? t.configTitle : t.toolsTitle}
            </h1>
            <p className="text-gray-500">
              {activeTab === 'users' ? t.subtitle : activeTab === 'config' ? t.subtitle : t.toolsSubtitle}
            </p>
          </div>
          
          <div className="flex gap-4">
            {activeTab !== 'tools' && (
              <>
                <button 
                  onClick={activeTab === 'users' ? fetchUsers : fetchConfigs}
                  className={`p-3 border rounded-xl transition-all ${theme === 'dark' ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-600'}`}
                >
                  <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
                <button 
                  onClick={handleOpenAdd}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 rounded-xl hover:bg-blue-500 transition-all font-bold text-white shadow-lg shadow-blue-600/20"
                >
                  <Plus className="w-5 h-5" />
                  <span>{activeTab === 'users' ? t.addNew : t.addConfig}</span>
                </button>
              </>
            )}
          </div>
        </header>

        {activeTab === 'users' ? (
          <div className="space-y-6">
            {/* Search Bar */}
            <div className="relative max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
              <input 
                type="text" 
                placeholder={t.search}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full border rounded-2xl py-4 pl-12 pr-4 focus:border-blue-500 outline-none transition-all ${theme === 'dark' ? 'bg-[#111] border-white/5' : 'bg-white border-gray-200 text-gray-900'}`}
              />
            </div>

            {/* Users Table */}
            <div className={`rounded-3xl border overflow-hidden shadow-sm ${theme === 'dark' ? 'bg-[#111] border-white/5' : 'bg-white border-gray-200'}`}>
              <table className="w-full text-left">
                <thead>
                  <tr className={`border-b ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                    <th className="px-6 py-5 text-gray-400 font-medium">{t.profile}</th>
                    <th className="px-6 py-5 text-gray-400 font-medium">{t.pin}</th>
                    <th className="px-6 py-5 text-gray-400 font-medium">{t.proxy}</th>
                    <th className="px-6 py-5 text-gray-400 font-medium text-right">{t.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  <AnimatePresence>
                    {filteredUsers.map((user) => (
                      <motion.tr 
                        key={user.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className={`transition-all group ${theme === 'dark' ? 'hover:bg-white/[0.02] divide-white/5' : 'hover:bg-gray-50 divide-gray-100'}`}
                      >
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center font-bold text-lg text-white">
                              {user.username?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{user.username}</p>
                              <p className="text-gray-500 text-sm">{user.phone_number}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <span className={`px-3 py-1 border rounded-lg font-mono text-blue-400 ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-blue-50 border-blue-100'}`}>
                            {user.pin}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <div className="text-sm">
                            <p className="flex items-center gap-2">
                              <Globe className="w-3 h-3 text-gray-500" />
                              <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>{user.proxy_ip}:{user.proxy_port}</span>
                            </p>
                            <p className="text-gray-500 text-xs flex items-center gap-1">
                               <MapPin className="w-3 h-3" /> {user.proxy_location || 'N/A'} • {user.proxy_timezone || 'N/A'}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <div className="flex justify-end gap-2">
                            <button 
                              onClick={() => handleOpenEdit(user)}
                              className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-all"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteClick(user.id, user.username)}
                              className="p-2 text-red-500/50 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
              {filteredUsers.length === 0 && !loading && (
                <div className="p-20 text-center text-gray-500">
                  {t.noUsers}
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'config' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {remoteConfigs.map((config) => (
              <div key={config.id} className={`p-6 rounded-3xl border space-y-4 ${theme === 'dark' ? 'bg-[#111] border-white/5' : 'bg-white border-gray-200'}`}>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-600/20 text-purple-500 rounded-xl flex items-center justify-center">
                      <Settings className="w-5 h-5" />
                    </div>
                    <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{config.config_key}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`px-3 py-1 rounded-full text-xs font-bold ${config.is_enabled ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                      {config.is_enabled ? 'ACTIVE' : 'DISABLED'}
                    </div>
                    <button 
                      onClick={() => handleOpenConfigEdit(config)}
                      className="p-2 text-gray-400 hover:text-blue-500 rounded-lg transition-all"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDeleteClick(config.id, config.config_key)}
                      className="p-2 text-red-500/50 hover:text-red-500 rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className={`rounded-2xl p-4 font-mono text-sm overflow-x-auto max-h-60 overflow-y-auto ${theme === 'dark' ? 'bg-black/50' : 'bg-gray-50 border border-gray-100'}`}>
                  <pre className="text-blue-400">{JSON.stringify(config.config_value, null, 2)}</pre>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-6 max-w-4xl">
            {/* API Settings Section */}
            <div className={`p-8 rounded-3xl border ${theme === 'dark' ? 'bg-[#111] border-white/5' : 'bg-white border-gray-200'}`}>
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <ShieldCheck className="w-6 h-6 text-blue-500" />
                API Keys Settings
              </h2>
              <p className="text-gray-500 mb-8">
                Your keys are stored securely in your browser's local storage. They are never sent to our servers.
              </p>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-400">Gemini API Key (Required)</label>
                  <input 
                    type="password"
                    value={apiKeys.gemini}
                    onChange={(e) => setApiKeys({...apiKeys, gemini: e.target.value})}
                    placeholder="AIzaSy..."
                    className={`w-full border rounded-xl p-4 outline-none focus:border-blue-500 transition-all font-mono ${theme === 'dark' ? 'bg-black/20 border-white/5' : 'bg-gray-50 border-gray-200'}`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-400">ElevenLabs API Key (Optional for Voice)</label>
                  <input 
                    type="password"
                    value={apiKeys.elevenlabs}
                    onChange={(e) => setApiKeys({...apiKeys, elevenlabs: e.target.value})}
                    placeholder="sk_..."
                    className={`w-full border rounded-xl p-4 outline-none focus:border-blue-500 transition-all font-mono ${theme === 'dark' ? 'bg-black/20 border-white/5' : 'bg-gray-50 border-gray-200'}`}
                  />
                </div>
                <button 
                  onClick={handleSaveApiKeys}
                  className="px-8 py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20"
                >
                  Save Keys Securely
                </button>
              </div>
            </div>

            {/* Interview Assistant Placeholder */}
            <div className={`p-8 rounded-3xl border flex flex-col items-center justify-center text-center space-y-6 min-h-[400px] ${theme === 'dark' ? 'bg-gradient-to-b from-[#111] to-black border-white/5' : 'bg-gradient-to-b from-white to-gray-50 border-gray-200'}`}>
              <div className="w-20 h-20 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center animate-pulse">
                <Bot className="w-10 h-10" />
              </div>
              <h2 className="text-3xl font-bold">Interview Pilot</h2>
              <p className="text-gray-500 max-w-lg">
                Upload your CV and start a live interview session. The AI will listen to the questions and provide real-time suggestions based on your experience.
              </p>
              
              <div className="flex gap-4 w-full max-w-md mt-8">
                <label className={`flex-1 py-4 border border-dashed rounded-xl font-bold transition-all cursor-pointer flex flex-col items-center justify-center ${theme === 'dark' ? 'border-white/20 hover:border-blue-500 hover:bg-blue-500/10' : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50'}`}>
                  {isUploadingCv ? (
                    <span className="flex items-center gap-2"><RefreshCw className="w-5 h-5 animate-spin" /> Parsing...</span>
                  ) : cvText ? (
                    <span className="text-green-500 flex items-center gap-2">✓ CV Ready</span>
                  ) : (
                    "Upload CV (PDF)"
                  )}
                  <input type="file" accept="application/pdf" className="hidden" onChange={handleFileUpload} disabled={isUploadingCv} />
                </label>
                <button 
                  className={`flex-1 py-4 rounded-xl font-bold transition-all ${cvText ? 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-600/20' : 'bg-gray-500 cursor-not-allowed text-white opacity-50'}`}
                  disabled={!cvText}
                >
                  Start Session
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Add/Edit Config Modal */}
      <AnimatePresence>
        {isConfigModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsConfigModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className={`relative w-full max-w-lg rounded-[2.5rem] border p-8 shadow-2xl ${theme === 'dark' ? 'bg-[#111] border-white/10' : 'bg-white border-gray-200'}`}
            >
              <h2 className={`text-2xl font-bold mb-6 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{editingConfig ? t.saveConfig : t.createConfig}</h2>
              <form onSubmit={handleConfigSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm text-gray-400 ml-1">{t.configKey}</label>
                  <input 
                    required
                    value={configFormData.config_key}
                    onChange={e => setConfigFormData({...configFormData, config_key: e.target.value})}
                    className={`w-full border rounded-2xl p-4 outline-none focus:border-blue-500 transition-all font-mono ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-100'}`}
                    placeholder="e.g. home_button_url"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-gray-400 ml-1">{t.configVal}</label>
                  <textarea 
                    required
                    rows={6}
                    value={configFormData.config_value}
                    onChange={e => setConfigFormData({...configFormData, config_value: e.target.value})}
                    className={`w-full border rounded-2xl p-4 outline-none focus:border-blue-500 transition-all font-mono ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-100'}`}
                    placeholder='{"url": "https://google.com", "label": "Google"}'
                  />
                </div>
                <div className="flex items-center gap-3">
                   <input 
                    type="checkbox"
                    checked={configFormData.is_enabled}
                    onChange={e => setConfigFormData({...configFormData, is_enabled: e.target.checked})}
                    className="w-5 h-5 accent-blue-600"
                   />
                   <label className="text-sm font-medium">{t.enabled}</label>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsConfigModalOpen(false)}
                    className={`flex-1 px-6 py-4 rounded-2xl font-bold transition-all ${theme === 'dark' ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                  >
                    {t.cancel}
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-6 py-4 bg-blue-600 rounded-2xl font-bold hover:bg-blue-500 transition-all text-white"
                  >
                    {editingConfig ? t.save : t.createBtn}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add/Edit User Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className={`relative w-full max-w-2xl rounded-[2.5rem] border p-8 shadow-2xl overflow-y-auto max-h-[90vh] ${theme === 'dark' ? 'bg-[#111] border-white/10' : 'bg-white border-gray-200'}`}
            >
              <h2 className={`text-2xl font-bold mb-6 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{editingUser ? t.edit : t.create}</h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm text-gray-400 ml-1">{t.fullName}</label>
                    <input 
                      required
                      value={formData.username}
                      onChange={e => setFormData({...formData, username: e.target.value})}
                      className={`w-full border rounded-2xl p-4 outline-none focus:border-blue-500 transition-all ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-100'}`}
                      placeholder="e.g. John Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-gray-400 ml-1">{t.loginPin}</label>
                    <input 
                      required
                      value={formData.pin}
                      onChange={e => setFormData({...formData, pin: e.target.value})}
                      className={`w-full border rounded-2xl p-4 outline-none focus:border-blue-500 transition-all font-mono ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-100'}`}
                      placeholder="4-6 digits"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-gray-400 ml-1">{t.phone}</label>
                    <input 
                      value={formData.phone_number}
                      onChange={e => setFormData({...formData, phone_number: e.target.value})}
                      className={`w-full border rounded-2xl p-4 outline-none focus:border-blue-500 transition-all ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-100'}`}
                      placeholder="+20123456789"
                    />
                  </div>
                </div>

                <div className={`p-6 rounded-3xl border space-y-6 ${theme === 'dark' ? 'bg-white/[0.02] border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                  <h3 className="text-sm font-bold text-blue-500 flex items-center gap-2 uppercase tracking-widest">
                    <Globe className="w-4 h-4" /> {t.proxyConfig}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                      <input 
                        required
                        value={formData.proxy_ip}
                        onChange={e => setFormData({...formData, proxy_ip: e.target.value})}
                        className={`w-full border rounded-xl p-3 outline-none focus:border-blue-500 transition-all ${theme === 'dark' ? 'bg-black/20 border-white/5' : 'bg-white border-gray-200'}`}
                        placeholder={t.ip}
                      />
                    </div>
                    <input 
                      required
                      type="number"
                      value={formData.proxy_port}
                      onChange={e => setFormData({...formData, proxy_port: e.target.value})}
                      className={`border rounded-xl p-3 outline-none focus:border-blue-500 transition-all ${theme === 'dark' ? 'bg-black/20 border-white/5' : 'bg-white border-gray-200'}`}
                      placeholder={t.port}
                    />
                    <input 
                      value={formData.proxy_user}
                      onChange={e => setFormData({...formData, proxy_user: e.target.value})}
                      className={`border rounded-xl p-3 outline-none focus:border-blue-500 transition-all ${theme === 'dark' ? 'bg-black/20 border-white/5' : 'bg-white border-gray-200'}`}
                      placeholder={t.user}
                    />
                    <input 
                      value={formData.proxy_pass}
                      onChange={e => setFormData({...formData, proxy_pass: e.target.value})}
                      className={`border rounded-xl p-3 outline-none focus:border-blue-500 transition-all ${theme === 'dark' ? 'bg-black/20 border-white/5' : 'bg-white border-gray-200'}`}
                      placeholder={t.pass}
                    />
                    <input 
                      value={formData.proxy_location}
                      onChange={e => setFormData({...formData, proxy_location: e.target.value})}
                      className={`border rounded-xl p-3 outline-none focus:border-blue-500 transition-all ${theme === 'dark' ? 'bg-black/20 border-white/5' : 'bg-white border-gray-200'}`}
                      placeholder={t.location}
                    />
                    <input 
                      value={formData.proxy_timezone}
                      onChange={e => setFormData({...formData, proxy_timezone: e.target.value})}
                      className={`border rounded-xl p-3 outline-none focus:border-blue-500 transition-all ${theme === 'dark' ? 'bg-black/20 border-white/5' : 'bg-white border-gray-200'}`}
                      placeholder={t.timezone}
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className={`flex-1 px-6 py-4 rounded-2xl font-bold transition-all ${theme === 'dark' ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                  >
                    {t.cancel}
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-6 py-4 bg-blue-600 rounded-2xl font-bold hover:bg-blue-500 transition-all text-white"
                  >
                    {editingUser ? t.save : t.createBtn}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Confirmation Modal */}
      <AnimatePresence>
        {isConfirmOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsConfirmOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={`relative w-full max-w-sm rounded-[2rem] border p-8 shadow-2xl text-center ${theme === 'dark' ? 'bg-[#1a1a1a] border-white/10' : 'bg-white border-gray-200'}`}
            >
              <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className={`text-xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{t.confirmTitle}</h3>
              <p className="text-gray-500 text-sm mb-8">{t.confirmText}</p>
              
              <div className="flex flex-col gap-2">
                <button 
                  onClick={confirmDelete}
                  className="w-full py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-500 transition-all"
                >
                  {t.confirmBtn}
                </button>
                <button 
                  onClick={() => setIsConfirmOpen(false)}
                  className={`w-full py-3 rounded-xl font-bold transition-all ${theme === 'dark' ? 'bg-white/5 text-gray-400 hover:bg-white/10' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  {t.confirmCancel}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

