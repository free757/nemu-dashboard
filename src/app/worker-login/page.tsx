'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Sparkles, AlertCircle, ArrowLeft } from 'lucide-react';

const PIN_LENGTH = 4;

export default function WorkerLoginPage() {
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [time, setTime] = useState('');
  const [date, setDate] = useState('');
  const shakeKey = useRef(0);

  // Live clock
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }));
      setDate(now.toLocaleDateString('ar-EG', { weekday: 'long', month: 'long', day: 'numeric' }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Auto-submit when PIN is complete
  useEffect(() => {
    if (pin.length === PIN_LENGTH) {
      handleLogin(pin);
    }
  }, [pin]);

  const handleLogin = useCallback(async (enteredPin: string) => {
    setIsLoading(true);
    setIsError(false);
    setErrorMsg('');

    try {
      // Query atlas_workers for the worker matching this PIN
      const { data, error } = await supabase
        .from('atlas_workers')
        .select('id, username, pin, is_blocked')
        .eq('pin', enteredPin)
        .single();

      if (error || !data) {
        // Wrong PIN — shake and clear
        shakeKey.current += 1;
        setIsError(true);
        setErrorMsg('الرمز التعريفي (PIN) غير صحيح. حاول مجدداً.');
        setTimeout(() => {
          setPin('');
          setIsError(false);
          setErrorMsg('');
        }, 800);
      } else if (data.is_blocked) {
        shakeKey.current += 1;
        setIsError(true);
        setErrorMsg('هذا الحساب معطل من قبل الإدارة.');
        setTimeout(() => {
          setPin('');
          setIsError(false);
          setErrorMsg('');
        }, 1200);
      } else {
        // Success — store worker session and redirect
        sessionStorage.setItem('worker_auth', JSON.stringify({ 
          id: data.id, 
          username: data.username
        }));
        router.push('/worker-dashboard');
      }
    } catch (err) {
      setIsError(true);
      setErrorMsg('خطأ في الاتصال بالسيرفر. يرجى المحاولة لاحقاً.');
      setTimeout(() => { setPin(''); setIsError(false); }, 1000);
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  const handleKeyPress = (digit: string) => {
    if (isLoading || isError) return;
    if (pin.length < PIN_LENGTH) {
      setPin(prev => prev + digit);
    }
  };

  const handleBackspace = () => {
    if (isLoading || isError) return;
    setPin(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    if (isLoading || isError) return;
    setPin('');
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-between p-6 relative overflow-hidden selection:bg-indigo-500/30">
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.08)_0,transparent_60%)] pointer-events-none" />

      {/* Top Bar with Clock and Navigation */}
      <div className="w-full max-w-md flex justify-between items-center z-10">
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors bg-slate-900/60 backdrop-blur border border-slate-800 px-3 py-1.5 rounded-lg"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>الرئيسية</span>
        </button>
        <div className="text-right">
          <div className="text-sm font-semibold tracking-wide text-indigo-400">{time}</div>
          <div className="text-[10px] text-slate-500 font-medium">{date}</div>
        </div>
      </div>

      {/* Login Box */}
      <div className="w-full max-w-md my-auto flex flex-col items-center justify-center z-10 relative">
        <motion.div
          key={shakeKey.current}
          animate={isError ? { x: [-10, 10, -10, 10, 0] } : {}}
          transition={{ duration: 0.4 }}
          className="w-full bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl p-8 flex flex-col items-center shadow-2xl"
        >
          {/* Logo & Header */}
          <div className="w-16 h-16 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-indigo-400" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white mb-1">
            تسجيل دخول الموظفين
          </h2>
          <p className="text-xs text-slate-400 mb-6 text-center">
            أدخل الرمز التعريفي (PIN) الخاص بك للدخول إلى حسابات أطلس
          </p>

          {/* Dots Indicator */}
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
            {isError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-2 text-rose-400 text-xs bg-rose-500/10 border border-rose-500/20 px-3 py-2 rounded-lg w-full mb-6 justify-center"
              >
                <AlertCircle className="w-4 h-4" />
                <span>{errorMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex items-center justify-center gap-2 py-2 mb-4">
              <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          )}

          {/* Numeric Keypad */}
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
