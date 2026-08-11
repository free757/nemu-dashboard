'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, Wallet, Clock, LogOut, CheckCircle2, 
  XCircle, AlertCircle, Calendar, History, Sparkles, 
  RefreshCw, Edit2, Check, X 
} from 'lucide-react';

interface Account {
  id: string;
  account_name: string;
  accepted_hours: number;
  rejected_hours: number;
  in_review_hours: number;
  wallet_address: string;
  created_at: string;
}

interface Payout {
  id: string;
  account_name?: string; // we can join or lookup from local accounts map
  account_id: string;
  accepted_hours: number;
  rejected_hours: number;
  in_review_hours: number;
  wallet_address: string;
  created_at: string;
}

interface WorkerSession {
  id: string;
  username: string;
  is_manager: boolean;
  is_team_manager: boolean;
}

export default function WorkerDashboardPage() {
  const router = useRouter();
  const [worker, setWorker] = useState<WorkerSession | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [editWalletValue, setEditWalletValue] = useState('');
  const [updatingWalletId, setUpdatingWalletId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Authenticate from sessionStorage
  useEffect(() => {
    const authData = sessionStorage.getItem('worker_auth');
    if (!authData) {
      router.push('/worker-login');
      return;
    }
    const session = JSON.parse(authData) as WorkerSession;
    setWorker(session);
  }, [router]);

  // Load accounts and payout records
  const loadData = useCallback(async (workerId: string) => {
    try {
      // Query accounts
      const { data: accountsData, error: accountsErr } = await supabase
        .from('atlas_accounts')
        .select('*')
        .eq('user_id', workerId)
        .order('created_at', { ascending: true });

      if (accountsErr) throw accountsErr;
      setAccounts(accountsData || []);

      // Query payouts
      const { data: payoutsData, error: payoutsErr } = await supabase
        .from('atlas_payouts')
        .select('*')
        .eq('user_id', workerId)
        .order('created_at', { ascending: false });

      if (payoutsErr) throw payoutsErr;
      setPayouts(payoutsData || []);
    } catch (error) {
      console.error('Error loading worker dashboard data:', error);
      showFeedback('error', 'حدث خطأ أثناء تحميل البيانات. يرجى التحديث.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (worker) {
      loadData(worker.id);
    }
  }, [worker, loadData]);

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const handleRefresh = async () => {
    if (!worker || refreshing) return;
    setRefreshing(true);
    await loadData(worker.id);
  };

  const startEditWallet = (account: Account) => {
    setEditingAccountId(account.id);
    setEditWalletValue(account.wallet_address || '');
  };

  const saveWalletAddress = async (accountId: string) => {
    if (!worker) return;
    setUpdatingWalletId(accountId);
    try {
      const { error } = await supabase
        .from('atlas_accounts')
        .update({ 
          wallet_address: editWalletValue,
          updated_at: new Date().toISOString()
        })
        .eq('id', accountId);

      if (error) throw error;

      // Update state
      setAccounts(prev => prev.map(acc => 
        acc.id === accountId ? { ...acc, wallet_address: editWalletValue } : acc
      ));
      setEditingAccountId(null);
      showFeedback('success', 'تم تحديث عنوان المحفظة بنجاح.');
    } catch (err) {
      console.error(err);
      showFeedback('error', 'فشل في حفظ المحفظة. حاول مجدداً.');
    } finally {
      setUpdatingWalletId(null);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('worker_auth');
    router.push('/worker-login');
  };

  // Find account name by ID for payouts history
  const getAccountName = (accountId: string) => {
    const acc = accounts.find(a => a.id === accountId);
    return acc ? acc.account_name : 'حساب محذوف أو تالف';
  };

  if (loading || !worker) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-400" />
        <span className="text-sm font-medium">جاري تحميل بيانات الموظف...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col relative overflow-x-hidden selection:bg-indigo-500/30">
      {/* Background radial glow */}
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
                أطلس ادفينشر
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

        {/* Dashboard Title & Overview Card */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/30 border border-slate-900 rounded-2xl p-6">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <User className="w-5 h-5 text-indigo-400" />
              ملخص حساب الموظف
            </h2>
            <p className="text-xs text-slate-400">
              تابع ساعات عملك المسجلة وعناوين الدفع وعمليات التصفير الأخيرة
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs bg-slate-950/60 border border-slate-900 rounded-xl px-4 py-3">
            <div className="text-right">
              <span className="block text-[10px] text-slate-500 font-semibold">إجمالي الحسابات المفعلة</span>
              <span className="text-lg font-bold text-white">{accounts.length}</span>
            </div>
            <div className="w-px h-8 bg-slate-800" />
            <div className="text-right">
              <span className="block text-[10px] text-slate-500 font-semibold">تاريخ التسجيل</span>
              <span className="text-xs font-semibold text-slate-300">نشط</span>
            </div>
          </div>
        </div>

        {/* SECTION: ACCOUNTS GRID */}
        <section className="space-y-4">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Wallet className="w-4 h-4 text-indigo-400" />
            حسابات العمل الحالية (Accounts)
          </h3>

          {accounts.length === 0 ? (
            <div className="bg-slate-900/20 border border-slate-900/60 rounded-2xl p-12 text-center text-slate-500">
              <AlertCircle className="w-10 h-10 mx-auto text-slate-600 mb-3" />
              <p className="text-sm">لم يتم ربط أي حسابات عمل بهذا الموظف بعد.</p>
              <p className="text-xs text-slate-600 mt-1">يرجى التواصل مع المدير (الأدمن) لربط حساباتك.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {accounts.map((account) => {
                const totalHours = Number(
                  (account.accepted_hours + account.rejected_hours + account.in_review_hours).toFixed(2)
                );
                const isEditing = editingAccountId === account.id;
                const isUpdating = updatingWalletId === account.id;

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
                      <div className="px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-[9px] font-semibold text-indigo-400">
                        Atlas
                      </div>
                    </div>

                    {/* Stats Layout */}
                    <div className="grid grid-cols-2 gap-3 mb-5">
                      <div className="bg-slate-950/60 border border-slate-900/60 rounded-xl p-2.5 text-center">
                        <span className="block text-[9px] text-slate-500 font-semibold mb-1 flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          المقبولة
                        </span>
                        <span className="text-sm font-bold text-emerald-400">{account.accepted_hours} hr</span>
                      </div>

                      <div className="bg-slate-950/60 border border-slate-900/60 rounded-xl p-2.5 text-center">
                        <span className="block text-[9px] text-slate-500 font-semibold mb-1 flex items-center justify-center gap-1">
                          <XCircle className="w-3 h-3 text-rose-400" />
                          المرفوضة
                        </span>
                        <span className="text-sm font-bold text-rose-400">{account.rejected_hours} hr</span>
                      </div>

                      <div className="bg-slate-950/60 border border-slate-900/60 rounded-xl p-2.5 text-center">
                        <span className="block text-[9px] text-slate-500 font-semibold mb-1 flex items-center justify-center gap-1">
                          <Clock className="w-3 h-3 text-amber-400" />
                          المراجعة
                        </span>
                        <span className="text-sm font-bold text-amber-400">{account.in_review_hours} hr</span>
                      </div>

                      <div className="bg-slate-950/60 border border-slate-900/60 rounded-xl p-2.5 text-center">
                        <span className="block text-[9px] text-slate-500 font-semibold mb-1">الإجمالي</span>
                        <span className="text-sm font-bold text-slate-200">{totalHours} hr</span>
                      </div>
                    </div>

                    {/* Wallet Address section */}
                    <div className="mt-auto border-t border-slate-800/80 pt-4 space-y-2">
                      <div className="flex justify-between items-center text-[10px] text-slate-400">
                        <span className="font-semibold flex items-center gap-1">
                          <Wallet className="w-3 h-3 text-indigo-400" />
                          عنوان محفظة المستحقات
                        </span>
                        {!isEditing && (
                          <button
                            onClick={() => startEditWallet(account)}
                            className="text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-0.5"
                          >
                            <Edit2 className="w-2.5 h-2.5" />
                            تعديل
                          </button>
                        )}
                      </div>

                      {isEditing ? (
                        <div className="flex gap-2 mt-1">
                          <input
                            type="text"
                            value={editWalletValue}
                            onChange={(e) => setEditWalletValue(e.target.value)}
                            disabled={isUpdating}
                            placeholder="أدخل عنوان USDT أو المحفظة"
                            className="flex-1 text-xs bg-slate-950 border border-slate-800 focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500 rounded-lg px-2.5 py-1.5 text-slate-200 outline-none transition-all placeholder:text-slate-700"
                          />
                          <button
                            onClick={() => saveWalletAddress(account.id)}
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
                      <th className="px-5 py-3.5 text-center">المقبولة المستلمة</th>
                      <th className="px-5 py-3.5 text-center">المرفوضة</th>
                      <th className="px-5 py-3.5 text-center">تحت المراجعة</th>
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
                          {getAccountName(payout.account_id)}
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
                        <td className="px-5 py-3.5 font-mono text-[10px] break-all max-w-[200px] text-slate-400">
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

      {/* Footer */}
      <footer className="border-t border-slate-900/60 bg-slate-950 py-6 text-center text-[10px] text-slate-500 flex flex-col items-center justify-center gap-1.5">
        <div>بوابة حسابات وأرباح موظفي أطلس ادفينشر</div>
        <div className="text-slate-600">Atlas Helper &copy; {new Date().getFullYear()} — Production Ready</div>
      </footer>
    </div>
  );
}
