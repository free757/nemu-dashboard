"use client";

import React, { useState, useEffect } from "react";
import { X, RefreshCw } from "lucide-react";

interface AdminAddPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: "ar" | "en";
  isDark: boolean;
  defaultWalletAddress: string;
  actionLoading: boolean;
  onSubmit: (amount: number, method: string, wallet: string, notes: string) => Promise<void>;
}

export const AdminAddPaymentModal: React.FC<AdminAddPaymentModalProps> = ({
  isOpen,
  onClose,
  lang,
  isDark,
  defaultWalletAddress,
  actionLoading,
  onSubmit,
}) => {
  const [amount, setAmount] = useState<number>(0);
  const [payoutMethod, setPayoutMethod] = useState<string>("USDT");
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  useEffect(() => {
    if (isOpen) {
      setAmount(0);
      setPayoutMethod("USDT");
      setWalletAddress(defaultWalletAddress);
      setNotes("");
    }
  }, [isOpen, defaultWalletAddress]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) return;
    await onSubmit(amount, payoutMethod, walletAddress, notes);
  };

  return (
    <div className="bg-black/60 backdrop-blur-sm fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl ${
          isDark ? "bg-[#0f0f0f] border-white/10 text-white" : "bg-white border-gray-200 text-gray-900"
        }`}
      >
        <div className="flex justify-between items-center mb-6">
          <h4 className="text-lg font-bold">
            {lang === "ar" ? "تسجيل دفعة مسلّمة جديدة" : "Log New Payment Transfer"}
          </h4>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-medium">
          <div>
            <label className="block mb-1.5 text-gray-400">
              {lang === "ar" ? "المبلغ المستلم (USDT)" : "Amount (USDT)"}
            </label>
            <input
              type="number"
              step="any"
              required
              value={amount || ""}
              placeholder="e.g. 150.00"
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              className={`w-full px-4 py-2.5 rounded-xl border outline-none ${
                isDark
                  ? "bg-white/5 border-white/10 focus:border-blue-500"
                  : "bg-gray-50 border-gray-200 focus:border-blue-500"
              }`}
            />
          </div>

          <div>
            <label className="block mb-1.5 text-gray-400">
              {lang === "ar" ? "طريقة الدفع" : "Payment Method"}
            </label>
            <select
              value={payoutMethod}
              onChange={(e) => setPayoutMethod(e.target.value)}
              className={`w-full px-4 py-2.5 rounded-xl border outline-none ${
                isDark
                  ? "bg-slate-900 border-white/10 text-white focus:border-blue-500"
                  : "bg-gray-50 border-gray-200 text-gray-900 focus:border-blue-500"
              }`}
            >
              <option value="USDT">USDT</option>
              <option value="Cash">{lang === "ar" ? "نقداً (Cash)" : "Cash"}</option>
              <option value="Other">{lang === "ar" ? "أخرى (Other)" : "Other"}</option>
            </select>
          </div>

          <div>
            <label className="block mb-1.5 text-gray-400">
              {lang === "ar" ? "عنوان محفظة الاستلام (اختياري)" : "Wallet Address (Optional)"}
            </label>
            <input
              type="text"
              placeholder="USDT Wallet Address"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              className={`w-full px-4 py-2.5 rounded-xl border outline-none ${
                isDark
                  ? "bg-white/5 border-white/10 focus:border-blue-500"
                  : "bg-gray-50 border-gray-200 focus:border-blue-500"
              }`}
            />
          </div>

          <div>
            <label className="block mb-1.5 text-gray-400">
              {lang === "ar" ? "ملاحظات / رقم المعاملة (اختياري)" : "Notes / Tx Hash (Optional)"}
            </label>
            <input
              type="text"
              placeholder="e.g. Transaction Hash or Cash Details"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={`w-full px-4 py-2.5 rounded-xl border outline-none ${
                isDark
                  ? "bg-white/5 border-white/10 focus:border-blue-500"
                  : "bg-gray-50 border-gray-200 focus:border-blue-500"
              }`}
            />
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2.5 rounded-xl font-bold ${
                isDark
                  ? "bg-white/5 hover:bg-white/10 text-gray-400"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-600"
              }`}
            >
              {lang === "ar" ? "إلغاء" : "Cancel"}
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl flex items-center gap-2"
            >
              {actionLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>{lang === "ar" ? "تسجيل الدفعة" : "Log Payment"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
