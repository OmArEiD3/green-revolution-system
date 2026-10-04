import React, { useState, useEffect } from 'react';
import { Lock, User, Check, Sparkles, ShieldCheck, Eye, EyeOff, KeyRound, Building2 } from 'lucide-react';
import { authApi } from '../api/client';
import { User as UserType } from '../types';

interface LoginViewProps {
  onLoginSuccess: (user: UserType) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState(() => localStorage.getItem('green_rev_saved_user') || 'engineer');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const quickRoles = [
    { label: 'المهندس المسؤول', username: 'engineer', icon: '👷' },
    { label: 'الإدارة العامة', username: 'admin', icon: '👑' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('يرجى إدخال اسم المستخدم');
      return;
    }
    if (password === '') {
      setError('يرجى إدخال كلمة المرور');
      return;
    }

    if (rememberMe) {
      localStorage.setItem('green_rev_saved_user', username.trim());
    } else {
      localStorage.removeItem('green_rev_saved_user');
    }

    setLoading(true);
    setError('');
    try {
      const res = await authApi.login(username.trim(), password);
      if (res.success) {
        onLoginSuccess(res.user);
      } else {
        setError(res.error || 'فشل تسجيل الدخول');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'اسم المستخدم أو كلمة المرور غير صحيحة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 text-white relative overflow-hidden selection:bg-emerald-500 selection:text-black">
      {/* Dynamic ambient glowing background */}
      <div className="absolute top-1/4 -right-24 w-96 h-96 bg-emerald-500/20 rounded-full blur-[140px] pointer-events-none animate-pulse" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-teal-500/20 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-md w-full bg-slate-900/90 border border-emerald-500/25 rounded-3xl p-6 sm:p-9 shadow-2xl backdrop-blur-2xl relative z-10 animate-slide-up">
        {/* Brand Header */}
        <div className="text-center space-y-3 mb-6">
          <div className="relative inline-block">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-emerald-400 mx-auto flex items-center justify-center text-4xl shadow-2xl shadow-emerald-500/40 border border-emerald-300/40 hover:scale-105 transition-transform">
              🌱
            </div>
            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-emerald-400 border-2 border-slate-900 flex items-center justify-center shadow">
              <Sparkles className="w-4 h-4 text-slate-950" />
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-4 drop-shadow">
            منظومة الثورة الخضراء
          </h1>
          <p className="text-xs text-emerald-400 font-bold uppercase tracking-wider">
            نظام الإدارة الميدانية والتحصيل الذكي (الشوارع 1 - 20)
          </p>
        </div>

        {/* Quick Account Switcher Chips */}
        <div className="mb-5">
          <div className="text-[11px] font-bold text-slate-400 mb-2 text-right">اختيار الحساب السريع:</div>
          <div className="grid grid-cols-2 gap-2">
            {quickRoles.map((role) => (
              <button
                key={role.username}
                type="button"
                onClick={() => {
                  setUsername(role.username);
                  setError('');
                }}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-black transition-all ${
                  username === role.username
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-md shadow-emerald-950'
                    : 'bg-slate-800/60 border-slate-700/70 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <span>{role.icon}</span>
                <span>{role.label}</span>
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-5 p-3.5 bg-rose-500/15 border border-rose-500/40 text-rose-300 rounded-2xl text-xs font-bold text-right animate-slide-up flex items-center gap-2">
            <span className="text-rose-400">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-right">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">اسم المستخدم</label>
            <div className="relative">
              <User className="w-4 h-4 text-emerald-400 absolute right-4 top-4" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="engineer"
                autoComplete="username"
                className="w-full pr-11 pl-4 py-3.5 bg-slate-800/90 border border-slate-700/80 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 text-sm font-bold transition-all text-right"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-emerald-400/90">
                حرية تامة (أرقام فقط أو حروف أو رموز بدون قيود)
              </span>
              <label className="text-xs font-bold text-slate-300">كلمة المرور</label>
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3.5 top-3.5 text-slate-400 hover:text-emerald-400 transition-colors p-1"
                title={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <Lock className="w-4 h-4 text-emerald-400 absolute right-4 top-4" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="أدخل كلمة المرور..."
                autoComplete="current-password"
                className="w-full pr-11 pl-11 py-3.5 bg-slate-800/90 border border-slate-700/80 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 text-sm font-bold transition-all text-right font-mono"
              />
            </div>
          </div>

          {/* Remember me toggle */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-slate-400 font-medium">
              حفظ اسم المستخدم على هذا الجهاز
            </span>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-emerald-600 focus:ring-emerald-500 focus:ring-offset-slate-900 cursor-pointer accent-emerald-500"
              />
              <span className="text-xs font-bold text-slate-300">تذكرني</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-sm shadow-xl shadow-emerald-900/50 transition-all duration-200 active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>{loading ? 'جاري التحقق والدخول...' : 'تسجيل الدخول للمنظومة'}</span>
          </button>
        </form>

        <div className="mt-7 pt-4 border-t border-slate-800/80 text-center text-slate-400 text-[11px] font-medium flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>منظومة مؤمنة ومشفرة — بيانات حقيقية للعميل بدون فقدان (Zero Data Loss)</span>
        </div>
      </div>
    </div>
  );
};
