'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Wallet, Clock, CheckCircle2, XCircle, 
  Plus, Edit2, Trash2, Check, X, RefreshCw, 
  AlertCircle, History, ArrowRightLeft, UserPlus,
  Ban, ShieldCheck, LayoutGrid, List, MoreVertical
} from 'lucide-react';

interface Worker {
  id: string;
  username: string;
  pin: string;
  is_blocked: boolean;
}

interface Account {
  id: string;
  worker_id: string;
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
  worker_id: string;
  accepted_hours: number;
  rejected_hours: number;
  in_review_hours: number;
  wallet_address: string;
  amount_paid: number;
  created_at: string;
}

interface AtlasAdminPanelProps {
  lang: 'ar' | 'en';
  theme: 'dark' | 'light';
}

export default function AtlasAdminPanel({ lang, theme }: AtlasAdminPanelProps) {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [activeDropdownWorkerId, setActiveDropdownWorkerId] = useState<string | null>(null);

  // Historical Payout Edit States
  const [editingPayoutId, setEditingPayoutId] = useState<string | null>(null);
  const [editPayoutForm, setEditPayoutForm] = useState({
    accepted_hours: 0,
    rejected_hours: 0,
    in_review_hours: 0,
    amount_paid: 0,
    wallet_address: '',
    created_at: ''
  });

  // Modals / Form States
  const [isAddWorkerOpen, setIsAddWorkerOpen] = useState(false);
  const [newWorkerForm, setNewWorkerForm] = useState({
    username: '',
    pin: ''
  });

  const [isEditWorkerOpen, setIsEditWorkerOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [editWorkerForm, setEditWorkerForm] = useState({
    username: '',
    pin: ''
  });

  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [newAccountForm, setNewAccountForm] = useState({
    account_name: '',
    accepted_hours: 0,
    rejected_hours: 0,
    in_review_hours: 0,
    wallet_address: '',
    amount_paid: 0
  });

  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [editAccountForm, setEditAccountForm] = useState({
    account_name: '',
    accepted_hours: 0,
    rejected_hours: 0,
    in_review_hours: 0,
    wallet_address: '',
    amount_paid: 0
  });

  const isDark = theme === 'dark';

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Fetch all workers from atlas_workers
  const fetchWorkers = useCallback(async (selectFirst = false) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('atlas_workers')
        .select('id, username, pin, is_blocked')
        .order('username', { ascending: true });

      if (error) throw error;
      setWorkers(data || []);
      
      if (selectFirst && data && data.length > 0) {
        setSelectedWorkerId(data[0].id);
      } else if (data && data.length > 0 && !selectedWorkerId) {
        setSelectedWorkerId(data[0].id);
      } else if (!data || data.length === 0) {
        setSelectedWorkerId(null);
      }
    } catch (err) {
      console.error(err);
      showFeedback('error', lang === 'ar' ? 'فشل تحميل قائمة الموظفين' : 'Failed to load workers list');
    } finally {
      setLoading(false);
    }
  }, [lang, selectedWorkerId]);

  // Fetch accounts and payouts for selected worker
  const fetchWorkerDetails = useCallback(async (workerId: string) => {
    try {
      // Fetch accounts
      const { data: accountsData, error: accountsErr } = await supabase
        .from('atlas_accounts')
        .select('*')
        .eq('worker_id', workerId)
        .order('created_at', { ascending: true });

      if (accountsErr) throw accountsErr;
      setAccounts(accountsData || []);

      // Fetch payouts
      const { data: payoutsData, error: payoutsErr } = await supabase
        .from('atlas_payouts')
        .select('*')
        .eq('worker_id', workerId)
        .order('created_at', { ascending: false });

      if (payoutsErr) throw payoutsErr;
      setPayouts(payoutsData || []);
    } catch (err) {
      console.error(err);
      showFeedback('error', lang === 'ar' ? 'فشل تحميل تفاصيل حسابات الموظف' : 'Failed to load worker details');
    }
  }, [lang]);

  useEffect(() => {
    fetchWorkers();
  }, []);

  useEffect(() => {
    if (selectedWorkerId) {
      fetchWorkerDetails(selectedWorkerId);
    } else {
      setAccounts([]);
      setPayouts([]);
    }
  }, [selectedWorkerId, fetchWorkerDetails]);

  // Handle Add Worker
  const handleAddWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkerForm.username.trim() || !newWorkerForm.pin.trim()) return;
    setActionLoading(true);

    try {
      const { data, error } = await supabase
        .from('atlas_workers')
        .insert([{
          username: newWorkerForm.username.trim(),
          pin: newWorkerForm.pin.trim(),
          is_blocked: false
        }])
        .select();

      if (error) {
        if (error.code === '23505') {
          throw new Error(lang === 'ar' ? 'هذا الرمز (PIN) مستخدم بالفعل لموظف آخر' : 'This PIN is already used by another employee');
        }
        throw error;
      }

      showFeedback('success', lang === 'ar' ? 'تمت إضافة الموظف بنجاح' : 'Worker added successfully');
      setIsAddWorkerOpen(false);
      setNewWorkerForm({ username: '', pin: '' });
      
      const newWorker = data?.[0];
      await fetchWorkers();
      if (newWorker) {
        setSelectedWorkerId(newWorker.id);
      }
    } catch (err: any) {
      console.error(err);
      showFeedback('error', err.message || (lang === 'ar' ? 'حدث خطأ أثناء إضافة الموظف' : 'Error adding worker'));
    } finally {
      setActionLoading(false);
    }
  };

  // Start Editing Worker
  const startEditingWorker = (worker: Worker) => {
    setEditingWorker(worker);
    setEditWorkerForm({
      username: worker.username,
      pin: worker.pin
    });
    setIsEditWorkerOpen(true);
  };

  // Handle Edit Worker
  const handleEditWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWorker || !editWorkerForm.username.trim() || !editWorkerForm.pin.trim()) return;
    setActionLoading(true);

    try {
      const { error } = await supabase
        .from('atlas_workers')
        .update({
          username: editWorkerForm.username.trim(),
          pin: editWorkerForm.pin.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', editingWorker.id);

      if (error) {
        if (error.code === '23505') {
          throw new Error(lang === 'ar' ? 'هذا الرمز (PIN) مستخدم بالفعل لموظف آخر' : 'This PIN is already used by another employee');
        }
        throw error;
      }

      showFeedback('success', lang === 'ar' ? 'تم تحديث بيانات الموظف بنجاح' : 'Worker updated successfully');
      setIsEditWorkerOpen(false);
      setEditingWorker(null);
      await fetchWorkers();
    } catch (err: any) {
      console.error(err);
      showFeedback('error', err.message || (lang === 'ar' ? 'حدث خطأ أثناء تعديل بيانات الموظف' : 'Error updating worker'));
    } finally {
      setActionLoading(false);
    }
  };

  // Payout logs management
  const handleDeletePayout = async (payoutId: string) => {
    const confirmMsg = lang === 'ar' 
      ? 'هل أنت متأكد من حذف هذا السجل التاريخي بشكل نهائي؟ لا يمكن التراجع عن هذا الإجراء.' 
      : 'Are you sure you want to delete this historical log permanently? This action cannot be undone.';
    if (!window.confirm(confirmMsg)) return;

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('atlas_payouts')
        .delete()
        .eq('id', payoutId);

      if (error) throw error;

      showFeedback('success', lang === 'ar' ? 'تم حذف السجل التاريخي بنجاح' : 'Historical log deleted successfully');
      
      if (selectedWorkerId) {
        fetchWorkerDetails(selectedWorkerId);
      }
    } catch (err) {
      console.error(err);
      showFeedback('error', lang === 'ar' ? 'فشل حذف السجل. حاول مجدداً.' : 'Failed to delete historical log.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSavePayoutEdit = async (payoutId: string) => {
    setActionLoading(true);
    try {
      const chosenDate = new Date(editPayoutForm.created_at).toISOString();

      const { error } = await supabase
        .from('atlas_payouts')
        .update({
          accepted_hours: Number(editPayoutForm.accepted_hours),
          rejected_hours: Number(editPayoutForm.rejected_hours),
          in_review_hours: Number(editPayoutForm.in_review_hours),
          amount_paid: Number(editPayoutForm.amount_paid),
          wallet_address: editPayoutForm.wallet_address.trim(),
          created_at: chosenDate
        })
        .eq('id', payoutId);

      if (error) throw error;

      showFeedback('success', lang === 'ar' ? 'تم تعديل السجل التاريخي بنجاح' : 'Historical log updated successfully');
      setEditingPayoutId(null);
      
      if (selectedWorkerId) {
        fetchWorkerDetails(selectedWorkerId);
      }
    } catch (err) {
      console.error(err);
      showFeedback('error', lang === 'ar' ? 'فشل حفظ التعديلات. حاول مجدداً.' : 'Failed to update historical log.');
    } finally {
      setActionLoading(false);
    }
  };

  const toLocalISOString = (dateStr: string) => {
    const d = new Date(dateStr);
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
  };

  const startEditingPayout = (payout: Payout) => {
    setEditingPayoutId(payout.id);
    setEditPayoutForm({
      accepted_hours: payout.accepted_hours,
      rejected_hours: payout.rejected_hours,
      in_review_hours: payout.in_review_hours,
      amount_paid: payout.amount_paid || 0,
      wallet_address: payout.wallet_address || '',
      created_at: toLocalISOString(payout.created_at)
    });
  };

  // Toggle Block Worker
  const handleToggleBlockWorker = async (worker: Worker) => {
    const confirmMsg = lang === 'ar'
      ? `هل أنت متأكد من ${worker.is_blocked ? 'تفعيل' : 'تعطيل'} حساب الموظف "${worker.username}"؟`
      : `Are you sure you want to ${worker.is_blocked ? 'activate' : 'block'} worker "${worker.username}"?`;
    if (!window.confirm(confirmMsg)) return;

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('atlas_workers')
        .update({ is_blocked: !worker.is_blocked, updated_at: new Date().toISOString() })
        .eq('id', worker.id);

      if (error) throw error;

      showFeedback('success', lang === 'ar' ? 'تم تحديث حالة الموظف بنجاح' : 'Worker status updated successfully');
      setWorkers(prev => prev.map(w => w.id === worker.id ? { ...w, is_blocked: !w.is_blocked } : w));
    } catch (err) {
      console.error(err);
      showFeedback('error', lang === 'ar' ? 'فشل تحديث حالة الموظف' : 'Failed to update worker status');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Worker
  const handleDeleteWorker = async (worker: Worker) => {
    const confirmMsg = lang === 'ar'
      ? `تحذير: سيؤدي حذف الموظف "${worker.username}" إلى حذف جميع حساباته وسجل دفعاته نهائياً. هل أنت متأكد؟`
      : `Warning: Deleting worker "${worker.username}" will permanently delete all their accounts and payouts. Continue?`;
    if (!window.confirm(confirmMsg)) return;

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('atlas_workers')
        .delete()
        .eq('id', worker.id);

      if (error) throw error;

      showFeedback('success', lang === 'ar' ? 'تم حذف الموظف بنجاح' : 'Worker deleted successfully');
      
      const isCurrentSelected = selectedWorkerId === worker.id;
      await fetchWorkers(isCurrentSelected);
    } catch (err) {
      console.error(err);
      showFeedback('error', lang === 'ar' ? 'فشل حذف الموظف' : 'Failed to delete worker');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Add Account
  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkerId || !newAccountForm.account_name.trim()) return;
    setActionLoading(true);

    try {
      const { error } = await supabase
        .from('atlas_accounts')
        .insert([{
          worker_id: selectedWorkerId,
          account_name: newAccountForm.account_name.trim(),
          accepted_hours: Number(newAccountForm.accepted_hours),
          rejected_hours: Number(newAccountForm.rejected_hours),
          in_review_hours: Number(newAccountForm.in_review_hours),
          wallet_address: newAccountForm.wallet_address.trim(),
          amount_paid: Number(newAccountForm.amount_paid) || 0.0
        }]);

      if (error) throw error;

      showFeedback('success', lang === 'ar' ? 'تمت إضافة الحساب بنجاح' : 'Account added successfully');
      setIsAddAccountOpen(false);
      setNewAccountForm({
        account_name: '',
        accepted_hours: 0,
        rejected_hours: 0,
        in_review_hours: 0,
        wallet_address: '',
        amount_paid: 0
      });
      fetchWorkerDetails(selectedWorkerId);
    } catch (err) {
      console.error(err);
      showFeedback('error', lang === 'ar' ? 'حدث خطأ أثناء إضافة الحساب' : 'Error adding account');
    } finally {
      setActionLoading(false);
    }
  };

  // Start Editing Account
  const startEditing = (account: Account) => {
    setEditingAccountId(account.id);
    setEditAccountForm({
      account_name: account.account_name,
      accepted_hours: account.accepted_hours,
      rejected_hours: account.rejected_hours,
      in_review_hours: account.in_review_hours,
      wallet_address: account.wallet_address || '',
      amount_paid: account.amount_paid || 0
    });
  };

  // Save Edit Account
  const handleSaveEdit = async (accountId: string) => {
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('atlas_accounts')
        .update({
          account_name: editAccountForm.account_name.trim(),
          accepted_hours: Number(editAccountForm.accepted_hours),
          rejected_hours: Number(editAccountForm.rejected_hours),
          in_review_hours: Number(editAccountForm.in_review_hours),
          wallet_address: editAccountForm.wallet_address.trim(),
          amount_paid: Number(editAccountForm.amount_paid) || 0.0,
          updated_at: new Date().toISOString()
        })
        .eq('id', accountId);

      if (error) throw error;

      showFeedback('success', lang === 'ar' ? 'تم تحديث الحساب بنجاح' : 'Account updated successfully');
      setEditingAccountId(null);
      if (selectedWorkerId) fetchWorkerDetails(selectedWorkerId);
    } catch (err) {
      console.error(err);
      showFeedback('error', lang === 'ar' ? 'فشل حفظ تعديلات الحساب' : 'Failed to update account');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Account
  const handleDeleteAccount = async (accountId: string, name: string) => {
    const confirmMsg = lang === 'ar' 
      ? `هل أنت متأكد من حذف الحساب "${name}" نهائياً؟`
      : `Are you sure you want to permanently delete account "${name}"?`;
    if (!window.confirm(confirmMsg)) return;

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('atlas_accounts')
        .delete()
        .eq('id', accountId);

      if (error) throw error;

      showFeedback('success', lang === 'ar' ? 'تم حذف الحساب بنجاح' : 'Account deleted successfully');
      if (selectedWorkerId) fetchWorkerDetails(selectedWorkerId);
    } catch (err) {
      console.error(err);
      showFeedback('error', lang === 'ar' ? 'فشل في حذف الحساب' : 'Failed to delete account');
    } finally {
      setActionLoading(false);
    }
  };

  // Reset & Payout Account
  const handleResetPayout = async (account: Account) => {
    const confirmMsg = lang === 'ar'
      ? `هل أنت متأكد من تصفير ساعات ومبالغ الحساب "${account.account_name}"؟ سيتم ترحيل الدفعات السابقة للأرشيف.`
      : `Are you sure you want to reset hours and amounts for "${account.account_name}"? Previous payouts will be logged in history.`;
    if (!window.confirm(confirmMsg)) return;

    setActionLoading(true);
    try {
      // 1. Create a snapshot in atlas_payouts using worker_id
      const { error: payoutErr } = await supabase
        .from('atlas_payouts')
        .insert([{
          account_id: account.id,
          worker_id: account.worker_id,
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

      showFeedback('success', lang === 'ar' ? 'تم تصفير الحساب بنجاح وتسجيل الدفعة' : 'Account reset successfully and payout logged');
      if (selectedWorkerId) fetchWorkerDetails(selectedWorkerId);
    } catch (err) {
      console.error(err);
      showFeedback('error', lang === 'ar' ? 'فشل تصفير الحساب' : 'Failed to reset account');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-500">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
        <p className="text-sm">{lang === 'ar' ? 'جاري تحميل نظام حسابات أطلس...' : 'Loading Atlas Accounts...'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Feedback / Floating Toast Message */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-6 right-6 z-[9999] flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl backdrop-blur-md max-w-sm ${
              feedback.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-500/30 text-emerald-300 shadow-emerald-950/20'
                : 'bg-rose-950/80 border-rose-500/30 text-rose-350 shadow-rose-950/20'
            }`}
          >
            <div className={`p-1.5 rounded-lg ${
              feedback.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-450'
            }`}>
              <AlertCircle className="w-4 h-4 shrink-0" />
            </div>
            <div className="flex-1 text-xs font-semibold pr-2 text-right dir-rtl">
              {feedback.text}
            </div>
            <button 
              onClick={() => setFeedback(null)}
              className="text-slate-400 hover:text-white p-1 transition-colors rounded-md hover:bg-white/5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Grid: Left side Workers, Right side Accounts and Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        
        {/* WORKERS LIST PANEL */}
        <div className={`p-5 rounded-3xl border flex flex-col justify-between ${isDark ? 'bg-[#111] border-white/5' : 'bg-white border-gray-200'}`}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-4 h-4 text-blue-500" />
              {lang === 'ar' ? 'الموظفون' : 'Employees'}
            </h3>
            <button
              onClick={() => setIsAddWorkerOpen(true)}
              className="p-1.5 bg-blue-600/15 hover:bg-blue-600/25 border border-blue-500/20 text-blue-500 rounded-lg transition-all"
              title={lang === 'ar' ? 'إضافة موظف جديد' : 'Add New Worker'}
            >
              <UserPlus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Add Worker Dialog overlay */}
          {isAddWorkerOpen && (
            <div className="bg-black/60 backdrop-blur-sm fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className={`w-full max-w-sm p-6 rounded-3xl border shadow-2xl ${
                isDark ? 'bg-[#0f0f0f] border-white/10 text-white' : 'bg-white border-gray-200 text-gray-900'
              }`}>
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-sm font-bold">
                    {lang === 'ar' ? 'إضافة موظف جديد' : 'Add New Employee'}
                  </h4>
                  <button onClick={() => setIsAddWorkerOpen(false)} className="text-gray-500 hover:text-gray-300">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <form onSubmit={handleAddWorker} className="space-y-4 text-xs font-medium">
                  <div>
                    <label className="block mb-1.5 text-gray-400">{lang === 'ar' ? 'اسم الموظف' : 'Employee Name'}</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Yasmin"
                      value={newWorkerForm.username}
                      onChange={(e) => setNewWorkerForm(p => ({ ...p, username: e.target.value }))}
                      className={`w-full px-3 py-2 rounded-xl border outline-none ${
                        isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-205'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block mb-1.5 text-gray-400">{lang === 'ar' ? 'الرمز التعريفي (4 أرقام)' : 'PIN Code (4 Digits)'}</label>
                    <input
                      type="text"
                      required
                      pattern="\d{4}"
                      maxLength={4}
                      placeholder="e.g. 1234"
                      value={newWorkerForm.pin}
                      onChange={(e) => setNewWorkerForm(p => ({ ...p, pin: e.target.value }))}
                      className={`w-full px-3 py-2 rounded-xl border outline-none font-mono text-center tracking-widest ${
                        isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-205'
                      }`}
                    />
                    {workers.some(w => w.pin === newWorkerForm.pin.trim() && newWorkerForm.pin.trim() !== '') && (
                      <p className="text-red-500 text-[10px] mt-1">
                        {lang === 'ar' ? '⚠️ هذا الرمز التعريفي مستخدم بالفعل لموظف آخر.' : '⚠️ This PIN is already taken.'}
                      </p>
                    )}
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsAddWorkerOpen(false)}
                      className={`px-3 py-1.5 rounded-lg ${
                        isDark ? 'bg-white/5 text-gray-400' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                    </button>
                    <button
                      type="submit"
                      disabled={actionLoading || workers.some(w => w.pin === newWorkerForm.pin.trim() && newWorkerForm.pin.trim() !== '')}
                      className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 text-white rounded-lg font-bold flex items-center gap-1.5"
                    >
                      {actionLoading && <RefreshCw className="w-3 h-3 animate-spin" />}
                      <span>{lang === 'ar' ? 'حفظ' : 'Save'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Edit Worker Dialog overlay */}
          {isEditWorkerOpen && editingWorker && (
            <div className="bg-black/60 backdrop-blur-sm fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className={`w-full max-w-sm p-6 rounded-3xl border shadow-2xl ${
                isDark ? 'bg-[#0f0f0f] border-white/10 text-white' : 'bg-white border-gray-200 text-gray-900'
              }`}>
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-sm font-bold">
                    {lang === 'ar' ? 'تعديل بيانات الموظف' : 'Edit Employee Details'}
                  </h4>
                  <button onClick={() => { setIsEditWorkerOpen(false); setEditingWorker(null); }} className="text-gray-500 hover:text-gray-300">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <form onSubmit={handleEditWorker} className="space-y-4 text-xs font-medium">
                  <div>
                    <label className="block mb-1.5 text-gray-400">{lang === 'ar' ? 'اسم الموظف' : 'Employee Name'}</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Yasmin"
                      value={editWorkerForm.username}
                      onChange={(e) => setEditWorkerForm(p => ({ ...p, username: e.target.value }))}
                      className={`w-full px-3 py-2 rounded-xl border outline-none ${
                        isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-205'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block mb-1.5 text-gray-400">{lang === 'ar' ? 'الرمز التعريفي (4 أرقام)' : 'PIN Code (4 Digits)'}</label>
                    <input
                      type="text"
                      required
                      pattern="\d{4}"
                      maxLength={4}
                      placeholder="e.g. 1234"
                      value={editWorkerForm.pin}
                      onChange={(e) => setEditWorkerForm(p => ({ ...p, pin: e.target.value }))}
                      className={`w-full px-3 py-2 rounded-xl border outline-none font-mono text-center tracking-widest ${
                        isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-205'
                      }`}
                    />
                    {workers.some(w => w.id !== editingWorker.id && w.pin === editWorkerForm.pin.trim() && editWorkerForm.pin.trim() !== '') && (
                      <p className="text-red-500 text-[10px] mt-1">
                        {lang === 'ar' ? '⚠️ هذا الرمز التعريفي مستخدم بالفعل لموظف آخر.' : '⚠️ This PIN is already taken.'}
                      </p>
                    )}
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => { setIsEditWorkerOpen(false); setEditingWorker(null); }}
                      className={`px-3 py-1.5 rounded-lg ${
                        isDark ? 'bg-white/5 text-gray-400' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                    </button>
                    <button
                      type="submit"
                      disabled={actionLoading || workers.some(w => w.id !== editingWorker.id && w.pin === editWorkerForm.pin.trim() && editWorkerForm.pin.trim() !== '')}
                      className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 text-white rounded-lg font-bold flex items-center gap-1.5"
                    >
                      {actionLoading && <RefreshCw className="w-3 h-3 animate-spin" />}
                      <span>{lang === 'ar' ? 'حفظ التعديلات' : 'Save Changes'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Workers List */}
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {workers.length === 0 ? (
              <p className="text-xs text-gray-500 italic p-2 text-center">{lang === 'ar' ? 'لا يوجد موظفون مضافون' : 'No employees found'}</p>
            ) : (
              workers.map((worker) => (
                <div
                  key={worker.id}
                  className={`w-full flex items-center justify-between p-2.5 rounded-2xl border transition-all text-xs ${
                    selectedWorkerId === worker.id
                      ? 'bg-blue-600/10 border-blue-500/20 text-blue-500'
                      : isDark 
                        ? 'bg-white/0 border-transparent text-gray-400 hover:text-white' 
                        : 'bg-gray-50/0 border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <button
                    onClick={() => setSelectedWorkerId(worker.id)}
                    className="flex-1 text-right truncate font-semibold mr-1.5"
                  >
                    <div className="truncate flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${worker.is_blocked ? 'bg-red-500' : 'bg-green-500'}`} />
                      <span className={worker.is_blocked ? 'line-through opacity-50' : ''}>{worker.username}</span>
                    </div>
                    <span className="block text-[9px] text-gray-500 font-mono mt-0.5">PIN: {worker.pin}</span>
                  </button>

                  <div className="relative shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveDropdownWorkerId(activeDropdownWorkerId === worker.id ? null : worker.id);
                      }}
                      className={`p-1.5 rounded-lg transition-colors ${
                        selectedWorkerId === worker.id
                          ? 'text-blue-500 hover:bg-blue-500/10'
                          : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                      }`}
                      title={lang === 'ar' ? 'خيارات الموظف' : 'Employee Options'}
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>

                    {activeDropdownWorkerId === worker.id && (
                      <>
                        <div 
                          className="fixed inset-0 z-10" 
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveDropdownWorkerId(null);
                          }}
                        />
                        <div className={`absolute right-0 mt-1 w-36 rounded-xl border shadow-xl z-20 overflow-hidden ${
                          isDark ? 'bg-[#0f0f0f] border-white/10 text-white' : 'bg-white border-gray-200 text-gray-800'
                        }`}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveDropdownWorkerId(null);
                              startEditingWorker(worker);
                            }}
                            className={`w-full flex items-center gap-2 px-3 py-2 text-[10px] text-right font-bold transition-colors ${
                              isDark ? 'hover:bg-white/5 text-gray-300' : 'hover:bg-gray-50 text-gray-700'
                            }`}
                          >
                            <Edit2 className="w-3 h-3 text-blue-500" />
                            <span>{lang === 'ar' ? 'تعديل البيانات' : 'Edit Details'}</span>
                          </button>
                          
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveDropdownWorkerId(null);
                              handleToggleBlockWorker(worker);
                            }}
                            className={`w-full flex items-center gap-2 px-3 py-2 text-[10px] text-right font-bold transition-colors border-t border-b ${
                              isDark 
                                ? 'hover:bg-white/5 text-gray-300 border-white/5' 
                                : 'hover:bg-gray-50 text-gray-700 border-gray-100'
                            }`}
                          >
                            {worker.is_blocked ? (
                              <>
                                <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
                                <span>{lang === 'ar' ? 'تفعيل الحساب' : 'Unblock Account'}</span>
                              </>
                            ) : (
                              <>
                                <Ban className="w-3.5 h-3.5 text-amber-500" />
                                <span>{lang === 'ar' ? 'تعطيل الحساب' : 'Block Account'}</span>
                              </>
                            )}
                          </button>
                          
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveDropdownWorkerId(null);
                              handleDeleteWorker(worker);
                            }}
                            className={`w-full flex items-center gap-2 px-3 py-2 text-[10px] text-right font-bold text-rose-500 transition-colors ${
                              isDark ? 'hover:bg-white/5' : 'hover:bg-rose-50'
                            }`}
                          >
                            <Trash2 className="w-3 h-3 text-rose-500" />
                            <span>{lang === 'ar' ? 'حذف الموظف' : 'Delete Worker'}</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* WORKER ACCOUNTS & DETAILS PANEL */}
        <div className="lg:col-span-3 space-y-6">
          
          {selectedWorkerId ? (
            <>
              {/* Selected Worker Info Bar */}
              <div className={`p-6 rounded-3xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${
                isDark ? 'bg-[#111] border-white/5' : 'bg-white border-gray-200'
              }`}>
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    {workers.find(w => w.id === selectedWorkerId)?.username || ''}
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">
                    {lang === 'ar' 
                      ? 'إدارة حسابات هذا الموظف، تعديل الساعات، وتصفير الأرصدة المستحقة.' 
                      : 'Manage accounts, edit active hours, and log payout resets for this employee.'}
                  </p>
                </div>
                
                <button
                  onClick={() => setIsAddAccountOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-2xl transition-all shadow-lg shadow-blue-600/25 shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>{lang === 'ar' ? 'ربط حساب جديد' : 'Link New Account'}</span>
                </button>
              </div>

              {/* Add Account Modal overlay */}
              {isAddAccountOpen && (
                <div className="bg-black/60 backdrop-blur-sm fixed inset-0 z-50 flex items-center justify-center p-4">
                  <div className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl ${
                    isDark ? 'bg-[#0f0f0f] border-white/10 text-white' : 'bg-white border-gray-200 text-gray-900'
                  }`}>
                    <div className="flex justify-between items-center mb-6">
                      <h4 className="text-lg font-bold">
                        {lang === 'ar' ? 'إضافة حساب جديد للموظف' : 'Add New Account for Employee'}
                      </h4>
                      <button 
                        onClick={() => setIsAddAccountOpen(false)}
                        className="text-gray-500 hover:text-gray-300"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <form onSubmit={handleAddAccount} className="space-y-4 text-xs font-medium">
                      <div>
                        <label className="block mb-1.5 text-gray-400">{lang === 'ar' ? 'اسم الحساب' : 'Account Name'}</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Account A"
                          value={newAccountForm.account_name}
                          onChange={(e) => setNewAccountForm(prev => ({ ...prev, account_name: e.target.value }))}
                          className={`w-full px-4 py-2.5 rounded-xl border outline-none ${
                            isDark ? 'bg-white/5 border-white/10 focus:border-blue-500' : 'bg-gray-50 border-gray-200 focus:border-blue-500'
                          }`}
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block mb-1.5 text-gray-400">{lang === 'ar' ? 'ساعات مقبولة' : 'Accepted'}</label>
                          <input
                            type="number"
                            step="any"
                            value={newAccountForm.accepted_hours}
                            onChange={(e) => setNewAccountForm(prev => ({ ...prev, accepted_hours: parseFloat(e.target.value) || 0 }))}
                            className={`w-full px-4 py-2.5 rounded-xl border outline-none ${
                              isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'
                            }`}
                          />
                        </div>
                        <div>
                          <label className="block mb-1.5 text-gray-400">{lang === 'ar' ? 'مرفوضة' : 'Rejected'}</label>
                          <input
                            type="number"
                            step="any"
                            value={newAccountForm.rejected_hours}
                            onChange={(e) => setNewAccountForm(prev => ({ ...prev, rejected_hours: parseFloat(e.target.value) || 0 }))}
                            className={`w-full px-4 py-2.5 rounded-xl border outline-none ${
                              isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'
                            }`}
                          />
                        </div>
                        <div>
                          <label className="block mb-1.5 text-gray-400">{lang === 'ar' ? 'مراجعة' : 'Review'}</label>
                          <input
                            type="number"
                            step="any"
                            value={newAccountForm.in_review_hours}
                            onChange={(e) => setNewAccountForm(prev => ({ ...prev, in_review_hours: parseFloat(e.target.value) || 0 }))}
                            className={`w-full px-4 py-2.5 rounded-xl border outline-none ${
                              isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'
                            }`}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block mb-1.5 text-gray-400">{lang === 'ar' ? 'المبلغ المدفوع من الحساب (USDT)' : 'Amount Paid from Account (USDT)'}</label>
                        <input
                          type="number"
                          step="any"
                          value={newAccountForm.amount_paid}
                          onChange={(e) => setNewAccountForm(prev => ({ ...prev, amount_paid: parseFloat(e.target.value) || 0 }))}
                          className={`w-full px-4 py-2.5 rounded-xl border outline-none ${
                            isDark ? 'bg-white/5 border-white/10 focus:border-blue-500' : 'bg-gray-50 border-gray-205 focus:border-blue-500'
                          }`}
                        />
                      </div>

                      <div>
                        <label className="block mb-1.5 text-gray-400">{lang === 'ar' ? 'عنوان المحفظة' : 'Wallet Address'}</label>
                        <input
                          type="text"
                          placeholder="e.g. 0x... or USDT wallet"
                          value={newAccountForm.wallet_address}
                          onChange={(e) => setNewAccountForm(prev => ({ ...prev, wallet_address: e.target.value }))}
                          className={`w-full px-4 py-2.5 rounded-xl border outline-none ${
                            isDark ? 'bg-white/5 border-white/10 focus:border-blue-500' : 'bg-gray-50 border-gray-205 focus:border-blue-500'
                          }`}
                        />
                      </div>

                      <div className="flex gap-3 justify-end pt-4">
                        <button
                          type="button"
                          onClick={() => setIsAddAccountOpen(false)}
                          className={`px-4 py-2.5 rounded-xl font-bold ${
                            isDark ? 'bg-white/5 hover:bg-white/10 text-gray-400' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                          }`}
                        >
                          {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                        </button>
                        <button
                          type="submit"
                          disabled={actionLoading}
                          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center gap-2"
                        >
                          {actionLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                          <span>{lang === 'ar' ? 'حفظ الحساب' : 'Save Account'}</span>
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Accounts Cards List */}
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-blue-500" />
                    {lang === 'ar' ? 'حسابات العمل وساعات العمل الحالية' : 'Current Work Accounts & Hours'}
                  </h4>
                  
                  {accounts.length > 0 && (
                    <div className="flex items-center bg-slate-900 border border-slate-800/80 rounded-lg p-0.5 shrink-0">
                      <button
                        onClick={() => setViewMode('list')}
                        className={`p-1.5 rounded transition-all ${
                          viewMode === 'list' 
                            ? 'bg-blue-600 text-white shadow-md' 
                            : 'text-slate-400 hover:text-white'
                        }`}
                        title={lang === 'ar' ? 'عرض خطي / جدولي' : 'List View'}
                      >
                        <List className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setViewMode('grid')}
                        className={`p-1.5 rounded transition-all ${
                          viewMode === 'grid' 
                            ? 'bg-blue-600 text-white shadow-md' 
                            : 'text-slate-400 hover:text-white'
                        }`}
                        title={lang === 'ar' ? 'عرض شبكي / بطاقات' : 'Grid View'}
                      >
                        <LayoutGrid className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {accounts.length === 0 ? (
                  <div className={`p-12 text-center rounded-[2rem] border italic text-xs ${
                    isDark ? 'bg-[#111] border-white/5 text-gray-500' : 'bg-white border-gray-200 text-gray-400'
                  }`}>
                    {lang === 'ar' ? 'لا توجد أي حسابات مربوطة بهذا الموظف حالياً.' : 'No accounts linked to this employee yet.'}
                  </div>
                ) : viewMode === 'list' ? (
                  <div className={`border rounded-[2rem] overflow-hidden ${isDark ? 'bg-[#111]/45 border-white/5' : 'bg-white border-gray-205 shadow-sm'}`}>
                    <div className="overflow-x-auto">
                      <table className="w-full text-right text-xs">
                        <thead>
                          <tr className={`border-b ${isDark ? 'bg-black/50 border-white/5 text-gray-400' : 'bg-gray-50 border-gray-150 text-gray-500'} font-bold`}>
                            <th className="px-5 py-3.5">{lang === 'ar' ? 'حساب العمل' : 'Account Name'}</th>
                            <th className="px-5 py-3.5 text-center">{lang === 'ar' ? 'المقبولة' : 'Accepted'}</th>
                            <th className="px-5 py-3.5 text-center">{lang === 'ar' ? 'المرفوضة' : 'Rejected'}</th>
                            <th className="px-5 py-3.5 text-center">{lang === 'ar' ? 'المراجعة' : 'Review'}</th>
                            <th className="px-5 py-3.5 text-center">{lang === 'ar' ? 'الإجمالي' : 'Total'}</th>
                            <th className="px-5 py-3.5 text-center">{lang === 'ar' ? 'المبلغ المدفوع' : 'Amount Paid'}</th>
                            <th className="px-5 py-3.5">{lang === 'ar' ? 'المحفظة' : 'Wallet'}</th>
                            <th className="px-5 py-3.5 text-center">{lang === 'ar' ? 'إجراءات' : 'Actions'}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {accounts.map((account) => {
                            const total = Number(
                              (account.accepted_hours + account.rejected_hours + account.in_review_hours).toFixed(2)
                            );
                            const isEditing = editingAccountId === account.id;

                            return (
                              <tr key={account.id} className={`${isDark ? 'hover:bg-white/5 text-gray-300' : 'hover:bg-gray-50 text-gray-700'}`}>
                                <td className="px-5 py-3.5 font-bold text-white whitespace-nowrap">
                                  {isEditing ? (
                                    <input
                                      type="text"
                                      value={editAccountForm.account_name}
                                      onChange={(e) => setEditAccountForm(p => ({ ...p, account_name: e.target.value }))}
                                      className={`text-xs font-bold px-2 py-0.5 rounded border outline-none max-w-[120px] ${
                                        isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-905'
                                      }`}
                                    />
                                  ) : (
                                    account.account_name
                                  )}
                                </td>
                                <td className="px-5 py-3.5 text-center">
                                  {isEditing ? (
                                    <input
                                      type="number"
                                      step="any"
                                      value={editAccountForm.accepted_hours}
                                      onChange={(e) => setEditAccountForm(p => ({ ...p, accepted_hours: parseFloat(e.target.value) || 0 }))}
                                      className="w-16 text-center bg-slate-900 border border-slate-800 rounded font-bold text-emerald-400 py-0.5 text-xs outline-none"
                                    />
                                  ) : (
                                    <span className="text-emerald-400 font-bold">{account.accepted_hours} hr</span>
                                  )}
                                </td>
                                <td className="px-5 py-3.5 text-center">
                                  {isEditing ? (
                                    <input
                                      type="number"
                                      step="any"
                                      value={editAccountForm.rejected_hours}
                                      onChange={(e) => setEditAccountForm(p => ({ ...p, rejected_hours: parseFloat(e.target.value) || 0 }))}
                                      className="w-16 text-center bg-slate-900 border border-slate-800 rounded font-bold text-rose-400 py-0.5 text-xs outline-none"
                                    />
                                  ) : (
                                    <span className="text-rose-400 font-bold">{account.rejected_hours} hr</span>
                                  )}
                                </td>
                                <td className="px-5 py-3.5 text-center">
                                  {isEditing ? (
                                    <input
                                      type="number"
                                      step="any"
                                      value={editAccountForm.in_review_hours}
                                      onChange={(e) => setEditAccountForm(p => ({ ...p, in_review_hours: parseFloat(e.target.value) || 0 }))}
                                      className="w-16 text-center bg-slate-900 border border-slate-800 rounded font-bold text-amber-500 py-0.5 text-xs outline-none"
                                    />
                                  ) : (
                                    <span className="text-amber-400 font-bold">{account.in_review_hours} hr</span>
                                  )}
                                </td>
                                <td className="px-5 py-3.5 text-center text-gray-300 font-bold">
                                  {total} hr
                                </td>
                                <td className="px-5 py-3.5 text-center font-bold text-amber-500">
                                  {isEditing ? (
                                    <input
                                      type="number"
                                      step="any"
                                      value={editAccountForm.amount_paid}
                                      onChange={(e) => setEditAccountForm(p => ({ ...p, amount_paid: parseFloat(e.target.value) || 0 }))}
                                      className="w-20 text-center bg-slate-900 border border-slate-800 rounded font-bold text-amber-400 py-0.5 text-xs outline-none"
                                    />
                                  ) : (
                                    <span>{account.amount_paid || 0} USDT</span>
                                  )}
                                </td>
                                <td className="px-5 py-3.5 font-mono text-[11px] text-gray-300">
                                  {isEditing ? (
                                    <input
                                      type="text"
                                      value={editAccountForm.wallet_address}
                                      onChange={(e) => setEditAccountForm(p => ({ ...p, wallet_address: e.target.value }))}
                                      className="w-32 bg-slate-900 border border-slate-800 rounded px-2 py-0.5 text-[11px] outline-none text-white"
                                    />
                                  ) : (
                                    account.wallet_address || <span className="text-gray-600 italic">{lang === 'ar' ? 'لا يوجد' : 'None'}</span>
                                  )}
                                </td>
                                <td className="px-5 py-3.5">
                                  <div className="flex justify-center items-center gap-1.5">
                                    {isEditing ? (
                                      <>
                                        <button
                                          onClick={() => handleSaveEdit(account.id)}
                                          disabled={actionLoading}
                                          className="p-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded transition-all"
                                          title="حفظ"
                                        >
                                          <Check className="w-3 h-3" />
                                        </button>
                                        <button
                                          onClick={() => setEditingAccountId(null)}
                                          className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded transition-all"
                                          title="إلغاء"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        <button
                                          onClick={() => handleResetPayout(account)}
                                          disabled={actionLoading}
                                          className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-500 text-[10px] font-bold rounded transition-all flex items-center gap-1"
                                          title={lang === 'ar' ? 'تصفير وتسجيل الدفع' : 'Reset & Log Payout'}
                                        >
                                          <ArrowRightLeft className="w-2.5 h-2.5" />
                                          <span>{lang === 'ar' ? 'تصفير' : 'Reset'}</span>
                                        </button>
                                        <button
                                          onClick={() => startEditing(account)}
                                          className="p-1 bg-blue-600/10 hover:bg-blue-600/20 text-blue-500 border border-blue-500/20 rounded transition-all"
                                          title="تعديل"
                                        >
                                          <Edit2 className="w-2.5 h-2.5" />
                                        </button>
                                        <button
                                          onClick={() => handleDeleteAccount(account.id, account.account_name)}
                                          disabled={actionLoading}
                                          className="p-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 rounded transition-all"
                                          title="حذف الحساب"
                                        >
                                          <Trash2 className="w-2.5 h-2.5" />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {accounts.map((account) => {
                      const total = Number(
                        (account.accepted_hours + account.rejected_hours + account.in_review_hours).toFixed(2)
                      );
                      const isEditing = editingAccountId === account.id;

                      return (
                        <div
                          key={account.id}
                          className={`p-5 rounded-3xl border flex flex-col justify-between shadow-sm relative ${
                            isDark ? 'bg-[#111] border-white/5 hover:border-white/10' : 'bg-white border-gray-200 hover:shadow-md'
                          }`}
                        >
                          {/* Card Header */}
                          <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-3">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editAccountForm.account_name}
                                onChange={(e) => setEditAccountForm(p => ({ ...p, account_name: e.target.value }))}
                                className={`text-sm font-bold px-2.5 py-1 rounded border outline-none max-w-[150px] ${
                                  isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
                                }`}
                              />
                            ) : (
                              <h5 className="font-bold text-sm text-white">{account.account_name}</h5>
                            )}

                            {/* Actions Group */}
                            <div className="flex items-center gap-1.5">
                              {isEditing ? (
                                <>
                                  <button
                                    onClick={() => handleSaveEdit(account.id)}
                                    disabled={actionLoading}
                                    className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg transition-all"
                                    title="حفظ"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setEditingAccountId(null)}
                                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg transition-all"
                                    title="إلغاء"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleResetPayout(account)}
                                    disabled={actionLoading}
                                    className="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-500 text-[10px] font-bold rounded-lg transition-all flex items-center gap-1"
                                    title={lang === 'ar' ? 'تصفير وتسجيل الدفع' : 'Reset & Log Payout'}
                                  >
                                    <ArrowRightLeft className="w-3 h-3" />
                                    <span>{lang === 'ar' ? 'تصفير ودفع' : 'Reset & Pay'}</span>
                                  </button>
                                  <button
                                    onClick={() => startEditing(account)}
                                    className="p-1.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-500 border border-blue-500/20 rounded-lg transition-all"
                                    title="تعديل الساعات والمحفظة"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteAccount(account.id, account.account_name)}
                                    disabled={actionLoading}
                                    className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 rounded-lg transition-all"
                                    title="حذف الحساب"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Hours Layout */}
                          <div className="grid grid-cols-2 gap-3.5 text-xs font-semibold mb-4">
                            <div className={`p-2.5 rounded-2xl text-center ${isDark ? 'bg-black/45' : 'bg-gray-50 border border-gray-100'}`}>
                              <span className="block text-[10px] text-gray-500 mb-1 flex items-center justify-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                {lang === 'ar' ? 'المقبولة' : 'Accepted'}
                              </span>
                              {isEditing ? (
                                <input
                                  type="number"
                                  step="any"
                                  value={editAccountForm.accepted_hours}
                                  onChange={(e) => setEditAccountForm(p => ({ ...p, accepted_hours: parseFloat(e.target.value) || 0 }))}
                                  className="w-full text-center bg-slate-900 border border-slate-800 rounded font-bold text-white py-0.5"
                                />
                              ) : (
                                <span className="text-emerald-400 font-bold">{account.accepted_hours} hr</span>
                              )}
                            </div>

                            <div className={`p-2.5 rounded-2xl text-center ${isDark ? 'bg-black/45' : 'bg-gray-50 border border-gray-100'}`}>
                              <span className="block text-[10px] text-gray-500 mb-1 flex items-center justify-center gap-1">
                                <XCircle className="w-3 h-3 text-rose-400" />
                                {lang === 'ar' ? 'المرفوضة' : 'Rejected'}
                              </span>
                              {isEditing ? (
                                <input
                                  type="number"
                                  step="any"
                                  value={editAccountForm.rejected_hours}
                                  onChange={(e) => setEditAccountForm(p => ({ ...p, rejected_hours: parseFloat(e.target.value) || 0 }))}
                                  className="w-full text-center bg-slate-900 border border-slate-800 rounded font-bold text-white py-0.5"
                                />
                              ) : (
                                <span className="text-rose-400 font-bold">{account.rejected_hours} hr</span>
                              )}
                            </div>

                            <div className={`p-2.5 rounded-2xl text-center ${isDark ? 'bg-black/45' : 'bg-gray-50 border border-gray-100'}`}>
                              <span className="block text-[10px] text-gray-500 mb-1 flex items-center justify-center gap-1">
                                <Clock className="w-3 h-3 text-amber-500" />
                                {lang === 'ar' ? 'مراجعة' : 'Review'}
                              </span>
                              {isEditing ? (
                                <input
                                  type="number"
                                  step="any"
                                  value={editAccountForm.in_review_hours}
                                  onChange={(e) => setEditAccountForm(p => ({ ...p, in_review_hours: parseFloat(e.target.value) || 0 }))}
                                  className="w-full text-center bg-slate-900 border border-slate-800 rounded font-bold text-white py-0.5"
                                />
                              ) : (
                                <span className="text-amber-400 font-bold">{account.in_review_hours} hr</span>
                              )}
                            </div>

                            <div className={`p-2.5 rounded-2xl text-center ${isDark ? 'bg-black/45' : 'bg-gray-50 border border-gray-100'}`}>
                              <span className="block text-[10px] text-gray-500 mb-1">{lang === 'ar' ? 'الإجمالي' : 'Total'}</span>
                              <span className="text-gray-300 font-bold">{total} hr</span>
                            </div>
                          </div>

                          {/* Amount Paid section */}
                          <div className="border-t border-white/5 pt-3 mb-2 flex justify-between items-center text-xs font-semibold">
                            <span className="text-gray-500">{lang === 'ar' ? 'المبلغ المدفوع من الحساب:' : 'Amount Paid from Account:'}</span>
                            {isEditing ? (
                              <input
                                type="number"
                                step="any"
                                value={editAccountForm.amount_paid}
                                onChange={(e) => setEditAccountForm(p => ({ ...p, amount_paid: parseFloat(e.target.value) || 0 }))}
                                className={`text-center rounded border outline-none w-28 py-1 text-xs ${
                                  isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
                                }`}
                              />
                            ) : (
                              <span className="font-bold text-amber-500 text-sm">{account.amount_paid || 0} USDT</span>
                            )}
                          </div>

                          {/* Wallet address section */}
                          <div className="border-t border-white/5 pt-3 space-y-1.5">
                            <span className="block text-[10px] text-gray-500 font-semibold">{lang === 'ar' ? 'عنوان محفظة الدفع' : 'USDT Payout Wallet'}</span>
                            {isEditing ? (
                              <input
                                type="text"
                                placeholder="USDT Wallet Address"
                                value={editAccountForm.wallet_address}
                                onChange={(e) => setEditAccountForm(p => ({ ...p, wallet_address: e.target.value }))}
                                className={`w-full px-2.5 py-1.5 rounded border text-[11px] outline-none ${
                                  isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
                                }`}
                              />
                            ) : (
                              <div className="font-mono text-[10px] break-all bg-black/30 border border-white/5 rounded-lg px-2.5 py-1.5 text-gray-400">
                                {account.wallet_address || (
                                  <span className="text-gray-600 italic">{lang === 'ar' ? 'لا يوجد محفظة مسجلة' : 'No wallet registered'}</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Payout History logs */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                  <History className="w-4 h-4 text-blue-500" />
                  {lang === 'ar' ? 'أرشيف عمليات التصفير السابقة' : 'Historical Payouts Logs'}
                </h4>

                {payouts.length === 0 ? (
                  <div className={`p-8 text-center rounded-[2rem] border italic text-xs ${
                    isDark ? 'bg-[#111] border-white/5 text-gray-500' : 'bg-white border-gray-200 text-gray-400'
                  }`}>
                    {lang === 'ar' ? 'لا توجد دفعات مسجلة لهذا الموظف.' : 'No payouts logged for this employee yet.'}
                  </div>
                ) : (
                  <div className={`border rounded-[2rem] overflow-hidden ${isDark ? 'bg-[#111]/40 border-white/5' : 'bg-white border-gray-205 shadow-sm'}`}>
                    <div className="overflow-x-auto">
                      <table className="w-full text-right text-xs">
                        <thead>
                          <tr className={`border-b ${isDark ? 'bg-black/50 border-white/5 text-gray-400' : 'bg-gray-50 border-gray-150 text-gray-500'} font-bold`}>
                            <th className="px-5 py-3">{lang === 'ar' ? 'تاريخ التصفير' : 'Reset Date'}</th>
                            <th className="px-5 py-3">{lang === 'ar' ? 'الحساب' : 'Account'}</th>
                            <th className="px-5 py-3 text-center">{lang === 'ar' ? 'المقبولة' : 'Accepted'}</th>
                            <th className="px-5 py-3 text-center">{lang === 'ar' ? 'المرفوضة' : 'Rejected'}</th>
                            <th className="px-5 py-3 text-center">{lang === 'ar' ? 'تحت المراجعة' : 'In Review'}</th>
                            <th className="px-5 py-3 text-center">{lang === 'ar' ? 'المبلغ المستلم' : 'Amount Received'}</th>
                            <th className="px-5 py-3">{lang === 'ar' ? 'المحفظة المستلمة' : 'Received Wallet'}</th>
                            <th className="px-5 py-3 text-center">{lang === 'ar' ? 'إجراءات' : 'Actions'}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {payouts.map((payout) => {
                            const isEditingPayout = editingPayoutId === payout.id;

                            return (
                              <tr key={payout.id} className={`${isDark ? 'hover:bg-white/5 text-gray-300' : 'hover:bg-gray-50 text-gray-700'}`}>
                                <td className="px-5 py-3 whitespace-nowrap">
                                  {isEditingPayout ? (
                                    <input
                                      type="datetime-local"
                                      value={editPayoutForm.created_at}
                                      onChange={(e) => setEditPayoutForm(p => ({ ...p, created_at: e.target.value }))}
                                      className={`text-xs px-2 py-0.5 rounded border outline-none font-bold ${
                                        isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-905'
                                      }`}
                                    />
                                  ) : (
                                    new Date(payout.created_at).toLocaleDateString('ar-EG', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })
                                  )}
                                </td>
                                <td className="px-5 py-3 font-bold text-white">
                                  {accounts.find(a => a.id === payout.account_id)?.account_name || 'Account'}
                                </td>
                                <td className="px-5 py-3 text-center">
                                  {isEditingPayout ? (
                                    <input
                                      type="number"
                                      step="any"
                                      value={editPayoutForm.accepted_hours}
                                      onChange={(e) => setEditPayoutForm(p => ({ ...p, accepted_hours: parseFloat(e.target.value) || 0 }))}
                                      className="w-16 text-center bg-slate-900 border border-slate-800 rounded font-bold text-emerald-400 py-0.5 text-xs outline-none"
                                    />
                                  ) : (
                                    <span className="font-bold text-emerald-400">{payout.accepted_hours} hr</span>
                                  )}
                                </td>
                                <td className="px-5 py-3 text-center">
                                  {isEditingPayout ? (
                                    <input
                                      type="number"
                                      step="any"
                                      value={editPayoutForm.rejected_hours}
                                      onChange={(e) => setEditPayoutForm(p => ({ ...p, rejected_hours: parseFloat(e.target.value) || 0 }))}
                                      className="w-16 text-center bg-slate-900 border border-slate-800 rounded font-bold text-rose-400 py-0.5 text-xs outline-none"
                                    />
                                  ) : (
                                    <span className="font-semibold text-rose-400">{payout.rejected_hours} hr</span>
                                  )}
                                </td>
                                <td className="px-5 py-3 text-center">
                                  {isEditingPayout ? (
                                    <input
                                      type="number"
                                      step="any"
                                      value={editPayoutForm.in_review_hours}
                                      onChange={(e) => setEditPayoutForm(p => ({ ...p, in_review_hours: parseFloat(e.target.value) || 0 }))}
                                      className="w-16 text-center bg-slate-900 border border-slate-800 rounded font-bold text-amber-500 py-0.5 text-xs outline-none"
                                    />
                                  ) : (
                                    <span className="text-amber-500">{payout.in_review_hours} hr</span>
                                  )}
                                </td>
                                <td className="px-5 py-3 text-center">
                                  {isEditingPayout ? (
                                    <input
                                      type="number"
                                      step="any"
                                      value={editPayoutForm.amount_paid}
                                      onChange={(e) => setEditPayoutForm(p => ({ ...p, amount_paid: parseFloat(e.target.value) || 0 }))}
                                      className="w-20 text-center bg-slate-900 border border-slate-800 rounded font-bold text-amber-500 py-0.5 text-xs outline-none"
                                    />
                                  ) : (
                                    <span className="font-bold text-amber-400">{payout.amount_paid || 0} USDT</span>
                                  )}
                                </td>
                                <td className="px-5 py-3 font-mono text-[10px] text-gray-300">
                                  {isEditingPayout ? (
                                    <input
                                      type="text"
                                      value={editPayoutForm.wallet_address}
                                      onChange={(e) => setEditPayoutForm(p => ({ ...p, wallet_address: e.target.value }))}
                                      className="w-32 bg-slate-900 border border-slate-800 rounded px-2 py-0.5 text-[10px] outline-none text-white"
                                    />
                                  ) : (
                                    payout.wallet_address || '—'
                                  )}
                                </td>
                                <td className="px-5 py-3">
                                  <div className="flex justify-center items-center gap-1.5">
                                    {isEditingPayout ? (
                                      <>
                                        <button
                                          onClick={() => handleSavePayoutEdit(payout.id)}
                                          disabled={actionLoading}
                                          className="p-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded transition-all"
                                          title="حفظ"
                                        >
                                          <Check className="w-3 h-3" />
                                        </button>
                                        <button
                                          onClick={() => setEditingPayoutId(null)}
                                          className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded transition-all"
                                          title="إلغاء"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        <button
                                          onClick={() => startEditingPayout(payout)}
                                          className="p-1 bg-blue-600/10 hover:bg-blue-600/20 text-blue-500 border border-blue-500/20 rounded transition-all"
                                          title="تعديل"
                                        >
                                          <Edit2 className="w-2.5 h-2.5" />
                                        </button>
                                        <button
                                          onClick={() => handleDeletePayout(payout.id)}
                                          disabled={actionLoading}
                                          className="p-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 rounded transition-all"
                                          title="حذف السجل نهائياً"
                                        >
                                          <Trash2 className="w-2.5 h-2.5" />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className={`p-16 text-center rounded-[2rem] border ${isDark ? 'bg-[#111] border-white/5' : 'bg-white border-gray-200'} flex flex-col items-center justify-center space-y-4`}>
              <Users className="w-12 h-12 text-gray-500" />
              <h3 className="text-xl font-bold">{lang === 'ar' ? 'اختر موظفاً للمتابعة' : 'Select an Employee to Continue'}</h3>
              <p className="text-xs text-gray-500 max-w-sm">
                {lang === 'ar'
                  ? 'يرجى اختيار أحد الموظفين من القائمة الجانبية لعرض حسابات العمل الحالية، تصفير الساعات، ومتابعة سجل الدفعات.'
                  : 'Please select one of the employees from the sidebar list to view their accounts, perform resets, and manage payout logs.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
