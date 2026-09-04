import React, { useState } from 'react';
import { Lock, User, Check, Sparkles, ShieldCheck } from 'lucide-react';
import { authApi } from '../api/client';
import { User as UserType } from '../types';

interface LoginViewProps {
  onLoginSuccess: (user: UserType) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('engineer');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('يرجى كتابة اسم المستخدم وكلمة المرور');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await authApi.login(username, password);
      if (res.success) {
        onLoginSuccess(res.user);
      } else {
        setError(res.error || 'فشل تسجيل الدخول');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'بيانات الدخول غير صحيحة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 text-white relative overflow-hidden selection:bg-emerald-500 selection:text-black">
      {/* Dynamic ambient glowing spheres */}
      <div className="absolute top-1/4 -right-24 w-96 h-96 bg-emerald-500/20 rounded-full blur-[120px] pointer-events-none animate-pulse-glow" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-teal-500/15 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-md w-full bg-slate-900/80 border border-emerald-500/20 rounded-3xl p-6 sm:p-9 shadow-2xl backdrop-blur-2xl relative z-10 animate-slide-up">
        {/* Brand Header */}
        <div className="text-center space-y-3 mb-8">
          <div className="relative inline-block">
            <div className="w-18 h-18 rounded-3xl bg-gradient-to-tr from-emerald-600 to-teal-400 mx-auto flex items-center justify-center text-4xl shadow-2xl shadow-emerald-500/30 border border-emerald-300/40">
              🌱
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-400 border-2 border-slate-900 flex items-center justify-center shadow">
              <Sparkles className="w-3.5 h-3.5 text-slate-950" />
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-4 drop-shadow">
            الثورة الخضراء
          </h1>
          <p className="text-xs text-emerald-400 font-bold uppercase tracking-wider">
            منظومة الإدارة والتحصيل الميداني
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-2xl text-xs font-bold text-right animate-slide-up">
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-right">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">اسم المستخدم (المهندس)</label>
            <div className="relative">
              <User className="w-4 h-4 text-emerald-400 absolute right-4 top-4" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="engineer"
                className="w-full pr-11 pl-4 py-3.5 bg-slate-800/80 border border-slate-700/80 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15 text-sm font-bold transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">كلمة المرور</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-emerald-400 absolute right-4 top-4" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pr-11 pl-4 py-3.5 bg-slate-800/80 border border-slate-700/80 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15 text-sm font-bold transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-3 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-sm shadow-xl shadow-emerald-900/40 transition-all duration-200 active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>{loading ? 'جاري التحقق والدخول...' : 'تسجيل الدخول للمنظومة'}</span>
          </button>
        </form>

        <div className="mt-8 pt-5 border-t border-slate-800/80 text-center text-slate-500 text-[11px] font-medium flex items-center justify-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>نظام مشفر ومؤمن بالكامل لمهندس المنطقة (الشوارع 1 إلى 17)</span>
        </div>
      </div>
    </div>
  );
};
