'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Lock, Sparkles, AlertCircle, ArrowLeft, User, Wallet, 
  Clock, LogOut, CheckCircle2, XCircle, Calendar, 
  History, RefreshCw, Edit2, Check, X, Coins, LayoutGrid, List,
  ArrowRightLeft, Plus
} from 'lucide-react';

const PIN_LENGTH = 4;

interface Account {
  id: string;
  account_name: string;
  accepted_hours: number;
  rejected_hours: number;
  in_review_hours: number;
  wallet_address: string;
  amount_paid: number;
  created_at: string;
}

interface Payout {
  id: string;
  account_id: string;
  accepted_hours: number;
  rejected_hours: number;
  in_review_hours: number;
  wallet_address: string;
  amount_paid: number;
  created_at: string;
}

interface WorkerSession {
  id: string;
  username: string;
}

export default function AtlasAccountsUnifiedPage() {
  const router = useRouter();
  
  // Authentication State
  const [worker, setWorker] = useState<WorkerSession | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  // Login PIN States
  const [pin, setPin] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState(false);
  const [loginErrorMsg, setLoginErrorMsg] = useState('');
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const shakeKey = useRef(0);

  // Dashboard Data States
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  
  // Add Account States
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [newAccountForm, setNewAccountForm] = useState({
    account_name: '',
    wallet_address: '',
    accepted_hours: 0,
    rejected_hours: 0,
    in_review_hours: 0,
    amount_paid: 0
  });
  
  // Edit Account Form States
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [editWalletValue, setEditWalletValue] = useState('');
  const [editAmountPaid, setEditAmountPaid] = useState<number>(0);
  const [editHours, setEditHours] = useState({
    accepted: 0,
    rejected: 0,
    in_review: 0
  });
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // 1. Clock Setup (Login View)
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }));
      setCurrentDate(now.toLocaleDateString('ar-EG', { weekday: 'long', month: 'long', day: 'numeric' }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // 2. Authentication Check
  useEffect(() => {
    const authData = sessionStorage.getItem('worker_auth');
    if (authData) {
      setWorker(JSON.parse(authData) as WorkerSession);
    } else {
      setWorker(null);
    }
    setAuthChecking(false);
  }, []);

  // 3. Login PIN Auto-submit
  useEffect(() => {
    if (pin.length === PIN_LENGTH) {
      handleLogin(pin);
    }
  }, [pin]);

  const handleLogin = async (enteredPin: string) => {
    setLoginLoading(true);
    setLoginError(false);
    setLoginErrorMsg('');

    try {
      const { data, error } = await supabase
        .from('atlas_workers')
        .select('id, username, pin, is_blocked')
        .eq('pin', enteredPin)
        .single();

      if (error || !data) {
        shakeKey.current += 1;
        setLoginError(true);
        setLoginErrorMsg('الرمز التعريفي (PIN) غير صحيح. حاول مجدداً.');
        setTimeout(() => {
          setPin('');
          setLoginError(false);
          setLoginErrorMsg('');
        }, 800);
      } else if (data.is_blocked) {
        shakeKey.current += 1;
        setLoginError(true);
        setLoginErrorMsg('هذا الحساب معطل من قبل الإدارة.');
        setTimeout(() => {
          setPin('');
          setLoginError(false);
          setLoginErrorMsg('');
        }, 1200);
      } else {
        const session = { id: data.id, username: data.username };
        sessionStorage.setItem('worker_auth', JSON.stringify(session));
        setWorker(session);
        setPin('');
      }
    } catch (err) {
      setLoginError(true);
      setLoginErrorMsg('خطأ في الاتصال بالسيرفر. يرجى المحاولة لاحقاً.');
      setTimeout(() => { setPin(''); setLoginError(false); }, 1000);
    } finally {
      setLoginLoading(false);
    }
  };

  // 4. Load Dashboard Data
  const loadDashboardData = useCallback(async (workerId: string) => {
    setDataLoading(true);
    try {
      // Query accounts
      const { data: accountsData, error: accountsErr } = await supabase
        .from('atlas_accounts')
        .select('*')
        .eq('worker_id', workerId)
        .order('created_at', { ascending: true });

      if (accountsErr) throw accountsErr;
      setAccounts(accountsData || []);

      // Query payouts
      const { data: payoutsData, error: payoutsErr } = await supabase
        .from('atlas_payouts')
        .select('*')
        .eq('worker_id', workerId)
        .order('created_at', { ascending: false });

      if (payoutsErr) throw payoutsErr;
      setPayouts(payoutsData || []);
    } catch (error) {
      console.error('Error loading worker data:', error);
      showFeedback('error', 'حدث خطأ أثناء تحميل البيانات. يرجى التحديث.');
    } finally {
      setDataLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (worker) {
      loadDashboardData(worker.id);
    }
  }, [worker, loadDashboardData]);

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const handleRefresh = async () => {
    if (!worker || refreshing) return;
    setRefreshing(true);
    await loadDashboardData(worker.id);
  };

  const startEditAccount = (account: Account) => {
    setEditingAccountId(account.id);
    setEditWalletValue(account.wallet_address || '');
    setEditAmountPaid(account.amount_paid || 0);
    setEditHours({
      accepted: account.accepted_hours,
      rejected: account.rejected_hours,
      in_review: account.in_review_hours
    });
  };

  const saveAccountDetails = async (accountId: string) => {
    if (!worker) return;
    setUpdatingId(accountId);
    try {
      const { error } = await supabase
        .from('atlas_accounts')
        .update({ 
          wallet_address: editWalletValue.trim(),
          accepted_hours: Number(editHours.accepted),
          rejected_hours: Number(editHours.rejected),
          in_review_hours: Number(editHours.in_review),
          amount_paid: Number(editAmountPaid),
          updated_at: new Date().toISOString()
        })
        .eq('id', accountId);

      if (error) throw error;

      // Update state locally
      setAccounts(prev => prev.map(acc => 
        acc.id === accountId ? { 
          ...acc, 
          wallet_address: editWalletValue.trim(),
          accepted_hours: Number(editHours.accepted),
          rejected_hours: Number(editHours.rejected),
          in_review_hours: Number(editHours.in_review),
          amount_paid: Number(editAmountPaid)
        } : acc
      ));
      setEditingAccountId(null);
      showFeedback('success', 'تم حفظ الساعات والمبالغ بنجاح.');
    } catch (err) {
      console.error(err);
      showFeedback('error', 'فشل في حفظ البيانات. حاول مجدداً.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!worker || !newAccountForm.account_name.trim()) return;
    setUpdatingId('add-account');
    try {
      const { error } = await supabase
        .from('atlas_accounts')
        .insert([{
          worker_id: worker.id,
          account_name: newAccountForm.account_name.trim(),
          accepted_hours: Number(newAccountForm.accepted_hours),
          rejected_hours: Number(newAccountForm.rejected_hours),
          in_review_hours: Number(newAccountForm.in_review_hours),
          wallet_address: newAccountForm.wallet_address.trim(),
          amount_paid: Number(newAccountForm.amount_paid)
        }]);

      if (error) throw error;

      showFeedback('success', 'تمت إضافة الحساب بنجاح.');
      setIsAddAccountOpen(false);
      setNewAccountForm({
        account_name: '',
        wallet_address: '',
        accepted_hours: 0,
        rejected_hours: 0,
        in_review_hours: 0,
        amount_paid: 0
      });
      await loadDashboardData(worker.id);
    } catch (err) {
      console.error(err);
      showFeedback('error', 'فشل في إضافة الحساب. حاول مجدداً.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleResetPayout = async (account: Account) => {
    const confirmMsg = 'هل أنت متأكد من تصفير ساعات ومبالغ هذا الحساب؟ سيتم ترحيل هذه البيانات لسجل الدفعات التاريخي ويبدأ الحساب من الصفر.';
    if (!window.confirm(confirmMsg)) return;

    setUpdatingId(account.id);
    try {
      // 1. Create snapshot in atlas_payouts using worker's id
      const { error: payoutErr } = await supabase
        .from('atlas_payouts')
        .insert([{
          account_id: account.id,
          worker_id: worker!.id,
          accepted_hours: account.accepted_hours,
          rejected_hours: account.rejected_hours,
          in_review_hours: account.in_review_hours,
          wallet_address: account.wallet_address || '',
          amount_paid: account.amount_paid || 0.0
        }]);

      if (payoutErr) throw payoutErr;

      // 2. Reset values in atlas_accounts
      const { error: resetErr } = await supabase
        .from('atlas_accounts')
        .update({
          accepted_hours: 0.0,
          rejected_hours: 0.0,
          in_review_hours: 0.0,
          amount_paid: 0.0,
          updated_at: new Date().toISOString()
        })
        .eq('id', account.id);

      if (resetErr) throw resetErr;

      showFeedback('success', 'تم تصفير الحساب بنجاح وترحيل الدفعة إلى السجل.');
      await loadDashboardData(worker!.id);
    } catch (err) {
      console.error(err);
      showFeedback('error', 'فشل تصفير الحساب. حاول مجدداً.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('worker_auth');
    setWorker(null);
  };

  const handleKeyPress = (digit: string) => {
    if (loginLoading || loginError) return;
    if (pin.length < PIN_LENGTH) {
      setPin(prev => prev + digit);
    }
  };

  const handleBackspace = () => {
    if (loginLoading || loginError) return;
    setPin(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    if (loginLoading || loginError) return;
    setPin('');
  };

  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-400" />
        <span className="text-sm font-medium">جاري التحقق من الجلسة...</span>
      </div>
    );
  }

  // ==================== VIEW 1: PIN LOGIN ====================
  if (!worker) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-between p-6 relative overflow-hidden selection:bg-indigo-500/30">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.08)_0,transparent_60%)] pointer-events-none" />

        {/* Top Bar with Clock */}
        <div className="w-full max-w-md flex justify-between items-center z-10">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors bg-slate-900/60 backdrop-blur border border-slate-800 px-3 py-1.5 rounded-lg"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>الرئيسية</span>
          </button>
          <div className="text-right">
            <div className="text-sm font-semibold tracking-wide text-indigo-400">{currentTime}</div>
            <div className="text-[10px] text-slate-500 font-medium">{currentDate}</div>
          </div>
        </div>

        {/* PIN Box */}
        <div className="w-full max-w-md my-auto flex flex-col items-center justify-center z-10 relative">
          <motion.div
            key={shakeKey.current}
            animate={loginError ? { x: [-10, 10, -10, 10, 0] } : {}}
            transition={{ duration: 0.4 }}
            className="w-full bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl p-8 flex flex-col items-center shadow-2xl"
          >
            <div className="w-16 h-16 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center mb-4">
              <Lock className="w-8 h-8 text-indigo-400" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white mb-1">
              تسجيل دخول الموظفين
            </h2>
            <p className="text-xs text-slate-400 mb-6 text-center">
              أدخل الرمز التعريفي (PIN) لرؤية حساباتك وتعديل ساعاتها
            </p>

            {/* Dots */}
            <div className="flex gap-4 mb-6">
              {Array.from({ length: PIN_LENGTH }).map((_, idx) => (
                <div
                  key={idx}
                  className={`w-3.5 h-3.5 rounded-full border transition-all duration-200 ${
                    idx < pin.length
                      ? 'bg-indigo-500 border-indigo-400 shadow-lg shadow-indigo-500/50 scale-110'
                      : 'bg-slate-950 border-slate-700'
                  }`}
                />
              ))}
            </div>

            {/* Error Message */}
            <AnimatePresence>
              {loginError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center gap-2 text-rose-400 text-xs bg-rose-500/10 border border-rose-500/20 px-3 py-2 rounded-lg w-full mb-6 justify-center"
                >
                  <AlertCircle className="w-4 h-4" />
                  <span>{loginErrorMsg}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Loading */}
            {loginLoading && (
              <div className="flex items-center justify-center gap-2 py-2 mb-4">
                <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            )}

            {/* Keyboard */}
            <div className="grid grid-cols-3 gap-3.5 w-full">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handleKeyPress(digit)}
                  className="h-14 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 active:bg-slate-900 hover:bg-slate-900/40 text-lg font-semibold flex items-center justify-center transition-all duration-150"
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                onClick={handleClear}
                className="h-14 rounded-xl bg-slate-950/40 border border-slate-900 text-xs font-semibold text-slate-500 hover:text-slate-300 flex items-center justify-center transition-colors"
              >
                مسح الكل
              </button>
              <button
                type="button"
                onClick={() => handleKeyPress('0')}
                className="h-14 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 active:bg-slate-900 hover:bg-slate-900/40 text-lg font-semibold flex items-center justify-center transition-all duration-150"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleBackspace}
                className="h-14 rounded-xl bg-slate-950/40 border border-slate-900 text-xs font-semibold text-slate-500 hover:text-slate-300 flex items-center justify-center transition-colors"
              >
                مسح
              </button>
            </div>
          </motion.div>
        </div>

        {/* Footer */}
        <div className="text-[10px] text-slate-600 flex items-center gap-1.5 z-10">
          <Sparkles className="w-3.5 h-3.5 text-indigo-500/60" />
          <span>بوابة حسابات أطلس ادفينشر للموظفين</span>
        </div>
      </main>
    );
  }

  // ==================== VIEW 2: WORKER DASHBOARD ====================
  if (dataLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-400" />
        <span className="text-sm font-medium">جاري تحميل بيانات الموظف وسجلاته...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col relative overflow-x-hidden selection:bg-indigo-500/30">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.06)_0,transparent_50%)] pointer-events-none" />

      {/* Navigation Header */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                حسابات أطلس
                <span className="text-[9px] font-semibold text-indigo-400 bg-indigo-950/50 border border-indigo-900 px-2 py-0.5 rounded-full">
                  بوابة الموظف
                </span>
              </h1>
              <p className="text-[10px] text-slate-400">مرحباً بك، {worker.username}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className={`p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white rounded-lg transition-all duration-150 ${refreshing ? 'opacity-50' : ''}`}
              title="تحديث البيانات"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-xs font-semibold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 px-3 py-2 rounded-lg transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>خروج</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 space-y-8 z-10">
        
        {/* Alerts / Feedback Message */}
        <AnimatePresence>
          {feedbackMsg && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border max-w-xl mx-auto text-xs ${
                feedbackMsg.type === 'success' 
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
              }`}
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="font-semibold">{feedbackMsg.text}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Overview Card */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/30 border border-slate-900 rounded-2xl p-6">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <User className="w-5 h-5 text-indigo-400" />
              ملخص حساب الموظف
            </h2>
            <p className="text-xs text-slate-400">
              تابع ساعات عملك المسجلة، وأدخل المبالغ المستلمة من المنصة، والمحفظة الخاصة بك.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs bg-slate-950/60 border border-slate-900 rounded-xl px-4 py-3">
            <div className="text-right">
              <span className="block text-[10px] text-slate-500 font-semibold">إجمالي الحسابات المفعلة</span>
              <span className="text-lg font-bold text-white">{accounts.length}</span>
            </div>
            <div className="w-px h-8 bg-slate-800" />
            <div className="text-right">
              <span className="block text-[10px] text-slate-500 font-semibold">حالة الحساب</span>
              <span className="text-xs font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-900 px-2 py-0.5 rounded-full">نشط</span>
            </div>
          </div>
        </div>

        {/* SECTION: ACCOUNTS GRID */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Wallet className="w-4 h-4 text-indigo-400" />
              حسابات العمل الحالية (Accounts)
            </h3>
            
            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
              <button
                onClick={() => setIsAddAccountOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-indigo-600/20"
              >
                <Plus className="w-3.5 h-3.5 animate-pulse" />
                <span>ربط حساب جديد</span>
              </button>

              {accounts.length > 0 && (
                <div className="flex items-center bg-slate-900 border border-slate-800/80 rounded-lg p-0.5 shrink-0">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 rounded transition-all ${
                      viewMode === 'list' 
                        ? 'bg-indigo-600 text-white shadow-md' 
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="عرض خطي / جدولي"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded transition-all ${
                      viewMode === 'grid' 
                        ? 'bg-indigo-600 text-white shadow-md' 
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="عرض شبكي / بطاقات"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {accounts.length === 0 ? (
            <div className="bg-slate-900/20 border border-slate-900/60 rounded-2xl p-12 text-center text-slate-500">
              <AlertCircle className="w-10 h-10 mx-auto text-slate-600 mb-3" />
              <p className="text-sm">لم يتم ربط أي حسابات عمل بهذا الموظف بعد.</p>
              <p className="text-xs text-slate-600 mt-1">يرجى التواصل مع الأدمن لربط حساباتك وإدخل ساعاتك.</p>
            </div>
          ) : viewMode === 'list' ? (
            <div className="bg-slate-900/30 border border-slate-900/80 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-slate-950/80 border-b border-slate-900 text-slate-400 font-semibold">
                      <th className="px-5 py-3.5">حساب العمل</th>
                      <th className="px-5 py-3.5 text-center">المقبولة</th>
                      <th className="px-5 py-3.5 text-center">المرفوضة</th>
                      <th className="px-5 py-3.5 text-center">المراجعة</th>
                      <th className="px-5 py-3.5 text-center">الإجمالي</th>
                      <th className="px-5 py-3.5 text-center">المبلغ المسحوب</th>
                      <th className="px-5 py-3.5">المحفظة</th>
                      <th className="px-5 py-3.5 text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900/60">
                    {accounts.map((account) => {
                      const totalHours = Number(
                        (account.accepted_hours + account.rejected_hours + account.in_review_hours).toFixed(2)
                      );
                      const isEditing = editingAccountId === account.id;
                      const isUpdating = updatingId === account.id;

                      return (
                        <tr 
                          key={account.id}
                          className="hover:bg-slate-900/20 transition-colors text-slate-300"
                        >
                          <td className="px-5 py-3.5 font-bold text-white whitespace-nowrap">
                            {account.account_name}
                          </td>
                          <td className="px-5 py-3.5 text-center font-bold">
                            {isEditing ? (
                              <input
                                type="number"
                                step="any"
                                value={editHours.accepted}
                                onChange={(e) => setEditHours(p => ({ ...p, accepted: parseFloat(e.target.value) || 0 }))}
                                className="w-16 text-center bg-slate-900 border border-slate-800 rounded font-bold text-emerald-400 py-1 text-xs outline-none focus:border-indigo-500"
                              />
                            ) : (
                              <span className="text-emerald-400 font-bold">{account.accepted_hours} hr</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-center font-bold">
                            {isEditing ? (
                              <input
                                type="number"
                                step="any"
                                value={editHours.rejected}
                                onChange={(e) => setEditHours(p => ({ ...p, rejected: parseFloat(e.target.value) || 0 }))}
                                className="w-16 text-center bg-slate-900 border border-slate-800 rounded font-bold text-rose-400 py-1 text-xs outline-none focus:border-indigo-500"
                              />
                            ) : (
                              <span className="text-rose-400 font-bold">{account.rejected_hours} hr</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-center font-bold">
                            {isEditing ? (
                              <input
                                type="number"
                                step="any"
                                value={editHours.in_review}
                                onChange={(e) => setEditHours(p => ({ ...p, in_review: parseFloat(e.target.value) || 0 }))}
                                className="w-16 text-center bg-slate-900 border border-slate-800 rounded font-bold text-amber-400 py-1 text-xs outline-none focus:border-indigo-500"
                              />
                            ) : (
                              <span className="text-amber-400 font-bold">{account.in_review_hours} hr</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-center text-slate-300 font-bold">
                            {totalHours} hr
                          </td>
                          <td className="px-5 py-3.5 text-center font-bold text-amber-500">
                            {isEditing ? (
                              <input
                                type="number"
                                step="any"
                                value={editAmountPaid}
                                onChange={(e) => setEditAmountPaid(parseFloat(e.target.value) || 0)}
                                className="w-20 text-center bg-slate-900 border border-slate-800 rounded font-bold text-amber-400 py-1 text-xs outline-none focus:border-indigo-500"
                              />
                            ) : (
                              <span className="text-amber-400 font-bold">{account.amount_paid || 0} USDT</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 font-mono text-[11px] text-slate-350">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editWalletValue}
                                onChange={(e) => setEditWalletValue(e.target.value)}
                                placeholder="USDT Wallet"
                                className="w-32 bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-[11px] outline-none focus:border-indigo-500 text-white"
                              />
                            ) : (
                              account.wallet_address || <span className="text-slate-600 italic">لا يوجد</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            {isEditing ? (
                              <div className="flex justify-center gap-1.5">
                                <button
                                  onClick={() => saveAccountDetails(account.id)}
                                  disabled={isUpdating}
                                  className="bg-indigo-600 hover:bg-indigo-500 text-white rounded p-1.5 transition-colors flex items-center justify-center"
                                  title="حفظ"
                                >
                                  {isUpdating ? (
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Check className="w-3.5 h-3.5" />
                                  )}
                                </button>
                                <button
                                  onClick={() => setEditingAccountId(null)}
                                  disabled={isUpdating}
                                  className="bg-slate-800 hover:bg-slate-700 text-slate-400 rounded p-1.5 transition-colors flex items-center justify-center"
                                  title="إلغاء"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex justify-center gap-1.5">
                                <button
                                  onClick={() => handleResetPayout(account)}
                                  className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/20 text-[10px] font-bold rounded transition-colors flex items-center gap-1"
                                  title="تصفير الحساب وترحيل الدفعة"
                                >
                                  <ArrowRightLeft className="w-2.5 h-2.5" />
                                  <span>تصفير</span>
                                </button>
                                <button
                                  onClick={() => startEditAccount(account)}
                                  className="px-2.5 py-1 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 text-[10px] font-bold rounded transition-colors flex items-center gap-1"
                                >
                                  <Edit2 className="w-2.5 h-2.5" />
                                  <span>تعديل</span>
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {accounts.map((account) => {
                const totalHours = Number(
                  (account.accepted_hours + account.rejected_hours + account.in_review_hours).toFixed(2)
                );
                const isEditing = editingAccountId === account.id;
                const isUpdating = updatingId === account.id;

                return (
                  <motion.div
                    key={account.id}
                    layout
                    className="bg-slate-900/40 backdrop-blur border border-slate-850 hover:border-slate-800 rounded-2xl p-5 flex flex-col justify-between shadow-lg relative"
                  >
                    {/* Header of Card */}
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="text-sm font-bold text-white">{account.account_name}</h4>
                        <span className="text-[9px] text-slate-500">مُعرّف: {account.id.substring(0, 8)}...</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {!isEditing && (
                          <>
                            <button
                              onClick={() => handleResetPayout(account)}
                              className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/20 text-[10px] font-bold rounded-lg transition-colors flex items-center gap-1"
                              title="تصفير الحساب وترحيل الدفعة"
                            >
                              <ArrowRightLeft className="w-3 h-3" />
                              <span>تصفير</span>
                            </button>
                            <button
                              onClick={() => startEditAccount(account)}
                              className="px-2.5 py-1 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 text-[10px] font-bold rounded-lg transition-colors flex items-center gap-1"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span>تعديل</span>
                            </button>
                          </>
                        )}
                        <span className="px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-[9px] font-semibold text-indigo-400">
                          Atlas
                        </span>
                      </div>
                    </div>

                    {/* Stats Layout */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-slate-950/60 border border-slate-900/60 rounded-xl p-2.5 text-center">
                        <span className="block text-[9px] text-slate-500 font-semibold mb-1.5 flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          المقبولة
                        </span>
                        {isEditing ? (
                          <input
                            type="number"
                            step="any"
                            value={editHours.accepted}
                            onChange={(e) => setEditHours(prev => ({ ...prev, accepted: parseFloat(e.target.value) || 0 }))}
                            className="w-full text-center bg-slate-900 border border-slate-800 rounded font-bold text-white py-1 text-xs outline-none focus:border-indigo-500"
                          />
                        ) : (
                          <span className="text-sm font-bold text-emerald-400">{account.accepted_hours} hr</span>
                        )}
                      </div>

                      <div className="bg-slate-950/60 border border-slate-900/60 rounded-xl p-2.5 text-center">
                        <span className="block text-[9px] text-slate-500 font-semibold mb-1.5 flex items-center justify-center gap-1">
                          <XCircle className="w-3 h-3 text-rose-400" />
                          المرفوضة
                        </span>
                        {isEditing ? (
                          <input
                            type="number"
                            step="any"
                            value={editHours.rejected}
                            onChange={(e) => setEditHours(prev => ({ ...prev, rejected: parseFloat(e.target.value) || 0 }))}
                            className="w-full text-center bg-slate-900 border border-slate-800 rounded font-bold text-white py-1 text-xs outline-none focus:border-indigo-500"
                          />
                        ) : (
                          <span className="text-sm font-bold text-rose-400">{account.rejected_hours} hr</span>
                        )}
                      </div>

                      <div className="bg-slate-950/60 border border-slate-900/60 rounded-xl p-2.5 text-center">
                        <span className="block text-[9px] text-slate-500 font-semibold mb-1.5 flex items-center justify-center gap-1">
                          <Clock className="w-3 h-3 text-amber-400" />
                          المراجعة
                        </span>
                        {isEditing ? (
                          <input
                            type="number"
                            step="any"
                            value={editHours.in_review}
                            onChange={(e) => setEditHours(prev => ({ ...prev, in_review: parseFloat(e.target.value) || 0 }))}
                            className="w-full text-center bg-slate-900 border border-slate-800 rounded font-bold text-white py-1 text-xs outline-none focus:border-indigo-500"
                          />
                        ) : (
                          <span className="text-sm font-bold text-amber-400">{account.in_review_hours} hr</span>
                        )}
                      </div>

                      <div className="bg-slate-950/60 border border-slate-900/60 rounded-xl p-2.5 text-center">
                        <span className="block text-[9px] text-slate-500 font-semibold mb-1.5">الإجمالي</span>
                        <span className="text-sm font-bold text-slate-200">{totalHours} hr</span>
                      </div>
                    </div>

                    {/* Amount Paid Section */}
                    <div className="bg-slate-950/40 border border-slate-900 rounded-xl p-3 mb-4 flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-semibold flex items-center gap-1">
                        <Coins className="w-3.5 h-3.5 text-amber-500" />
                        المبلغ المدفوع من الحساب:
                      </span>
                      {isEditing ? (
                        <input
                          type="number"
                          step="any"
                          value={editAmountPaid}
                          onChange={(e) => setEditAmountPaid(parseFloat(e.target.value) || 0)}
                          className="w-24 text-center bg-slate-900 border border-slate-850 focus:border-indigo-500 rounded font-bold text-white py-1 text-xs outline-none"
                        />
                      ) : (
                        <span className="font-bold text-amber-400 text-sm">{account.amount_paid || 0} USDT</span>
                      )}
                    </div>

                    {/* Wallet Address section */}
                    <div className="mt-auto border-t border-slate-800/80 pt-4 space-y-2">
                      <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                        <Wallet className="w-3 h-3 text-indigo-400" />
                        عنوان محفظة الدفع الخاصة بك
                      </span>

                      {isEditing ? (
                        <div className="flex gap-2 mt-1">
                          <input
                            type="text"
                            value={editWalletValue}
                            onChange={(e) => setEditWalletValue(e.target.value)}
                            disabled={isUpdating}
                            placeholder="أدخل عنوان USDT"
                            className="flex-1 text-xs bg-slate-950 border border-slate-800 focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500 rounded-lg px-2.5 py-1.5 text-slate-200 outline-none transition-all placeholder:text-slate-700"
                          />
                          <button
                            onClick={() => saveAccountDetails(account.id)}
                            disabled={isUpdating}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg p-2 transition-colors flex items-center justify-center w-8 h-8 flex-shrink-0"
                            title="حفظ"
                          >
                            {isUpdating ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Check className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            onClick={() => setEditingAccountId(null)}
                            disabled={isUpdating}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg p-2 transition-colors flex items-center justify-center w-8 h-8 flex-shrink-0"
                            title="إلغاء"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="text-xs bg-slate-950/40 border border-slate-900/80 rounded-lg px-3 py-2 text-slate-300 font-mono break-all leading-relaxed">
                          {account.wallet_address || (
                            <span className="text-slate-600 italic">لا يوجد عنوان محفظة مسجل</span>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </section>

        {/* SECTION: PAYOUT HISTORY */}
        <section className="space-y-4">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-400" />
            سجل التصفير والدفعات السابقة (Payout History)
          </h3>

          {payouts.length === 0 ? (
            <div className="bg-slate-900/10 border border-slate-900/40 rounded-2xl p-8 text-center text-slate-600 text-xs">
              <Calendar className="w-8 h-8 mx-auto text-slate-700 mb-2" />
              لا توجد أي دفعات أو عمليات تصفير مسجلة لهذا الحساب بعد.
            </div>
          ) : (
            <div className="bg-slate-900/30 border border-slate-900/80 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-slate-950/80 border-b border-slate-900 text-slate-400 font-semibold">
                      <th className="px-5 py-3.5">تاريخ التصفير</th>
                      <th className="px-5 py-3.5">حساب العمل</th>
                      <th className="px-5 py-3.5 text-center">المقبولة</th>
                      <th className="px-5 py-3.5 text-center">المرفوضة</th>
                      <th className="px-5 py-3.5 text-center">تحت المراجعة</th>
                      <th className="px-5 py-3.5 text-center">المبلغ المستلم</th>
                      <th className="px-5 py-3.5">المحفظة المستلمة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900/60">
                    {payouts.map((payout) => (
                      <tr 
                        key={payout.id}
                        className="hover:bg-slate-900/20 transition-colors text-slate-300"
                      >
                        <td className="px-5 py-3.5 font-medium whitespace-nowrap">
                          {new Date(payout.created_at).toLocaleDateString('ar-EG', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td className="px-5 py-3.5 font-bold text-white">
                          {accounts.find(a => a.id === payout.account_id)?.account_name || 'حساب عمل'}
                        </td>
                        <td className="px-5 py-3.5 text-center text-emerald-400 font-bold">
                          {payout.accepted_hours} hr
                        </td>
                        <td className="px-5 py-3.5 text-center text-rose-400 font-semibold">
                          {payout.rejected_hours} hr
                        </td>
                        <td className="px-5 py-3.5 text-center text-amber-500">
                          {payout.in_review_hours} hr
                        </td>
                        <td className="px-5 py-3.5 text-center text-amber-400 font-bold">
                          {payout.amount_paid || 0} USDT
                        </td>
                        <td className="px-5 py-3.5 font-mono text-[10px] break-all max-w-[150px] text-slate-400">
                          {payout.wallet_address || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

      </main>

      {/* Add Account Modal overlay */}
      {isAddAccountOpen && (
        <div className="bg-black/70 backdrop-blur-sm fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 text-slate-100 p-6 rounded-2xl shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Wallet className="w-4 h-4 text-indigo-400" />
                ربط حساب عمل جديد
              </h4>
              <button onClick={() => setIsAddAccountOpen(false)} className="text-slate-500 hover:text-slate-300">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddAccount} className="space-y-4 text-xs font-medium">
              <div>
                <label className="block mb-1.5 text-slate-400">اسم الحساب</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: حساب Outlier A"
                  value={newAccountForm.account_name}
                  onChange={(e) => setNewAccountForm(p => ({ ...p, account_name: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-indigo-500/80"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block mb-1.5 text-slate-400">ساعات مقبولة</label>
                  <input
                    type="number"
                    step="any"
                    value={newAccountForm.accepted_hours}
                    onChange={(e) => setNewAccountForm(p => ({ ...p, accepted_hours: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none text-center"
                  />
                </div>
                <div>
                  <label className="block mb-1.5 text-slate-400">مرفوضة</label>
                  <input
                    type="number"
                    step="any"
                    value={newAccountForm.rejected_hours}
                    onChange={(e) => setNewAccountForm(p => ({ ...p, rejected_hours: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none text-center"
                  />
                </div>
                <div>
                  <label className="block mb-1.5 text-slate-400">مراجعة</label>
                  <input
                    type="number"
                    step="any"
                    value={newAccountForm.in_review_hours}
                    onChange={(e) => setNewAccountForm(p => ({ ...p, in_review_hours: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none text-center"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1.5 text-slate-400">المبلغ المدفوع من الحساب (USDT)</label>
                <input
                  type="number"
                  step="any"
                  value={newAccountForm.amount_paid}
                  onChange={(e) => setNewAccountForm(p => ({ ...p, amount_paid: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none"
                />
              </div>

              <div>
                <label className="block mb-1.5 text-slate-400">عنوان المحفظة الخاص بالحساب</label>
                <input
                  type="text"
                  placeholder="أدخل عنوان USDT"
                  value={newAccountForm.wallet_address}
                  onChange={(e) => setNewAccountForm(p => ({ ...p, wallet_address: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddAccountOpen(false)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-400 hover:text-slate-350 rounded-lg"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={updatingId === 'add-account'}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold flex items-center gap-1.5"
                >
                  {updatingId === 'add-account' && <RefreshCw className="w-3 h-3 animate-spin" />}
                  <span>حفظ الحساب</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-900/60 bg-slate-950 py-6 text-center text-[10px] text-slate-500 flex flex-col items-center justify-center gap-1.5">
        <div>بوابة حسابات وأرباح موظفي أطلس ادفينشر</div>
        <div className="text-slate-600">Atlas Helper &copy; {new Date().getFullYear()} — Production Ready</div>
      </footer>
    </div>
  );
}
