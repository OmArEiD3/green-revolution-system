import React from 'react';
import {
  Home, Users, MapPin, DollarSign, ReceiptText,
  ShieldCheck, MoreHorizontal, LogOut, Calendar, Sparkles
} from 'lucide-react';
import { User } from '../types';

interface NavbarProps {
  user: User | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  year: number;
  month: number;
  setYear: (y: number) => void;
  setMonth: (m: number) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  activeTab,
  setActiveTab,
  onLogout,
  year,
  month,
  setYear,
  setMonth,
}) => {
  const months = [
    { value: 1, label: 'يناير' },
    { value: 2, label: 'فبراير' },
    { value: 3, label: 'مارس' },
    { value: 4, label: 'أبريل' },
    { value: 5, label: 'مايو' },
    { value: 6, label: 'يونيو' },
    { value: 7, label: 'يوليو' },
    { value: 8, label: 'أغسطس' },
    { value: 9, label: 'سبتمبر' },
    { value: 10, label: 'أكتوبر' },
    { value: 11, label: 'نوفمبر' },
    { value: 12, label: 'ديسمبر' },
  ];

  const navItems = [
    { id: 'dashboard', label: 'الرئيسية', icon: Home },
    { id: 'members', label: 'الأعضاء', icon: Users },
    { id: 'streets', label: 'الشوارع', icon: MapPin },
    { id: 'collections', label: 'التحصيل', icon: DollarSign },
    { id: 'receipts', label: 'الإيصالات', icon: ReceiptText },
    { id: 'financials', label: 'الماليات', icon: ShieldCheck },
    { id: 'reports', label: 'التقارير', icon: MoreHorizontal },
  ];

  return (
    <header className="sticky top-0 z-40 glass-nav shadow-lg transition-all">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-2 min-h-16 sm:min-h-18 py-2">          {/* Brand Logo & Area Identity */}
          <div
            onClick={() => setActiveTab('dashboard')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="relative">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-900/40 border border-emerald-300/30 group-hover:scale-105 transition-transform duration-300">
                <span className="text-2xl drop-shadow">🌱</span>
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 border-2 border-emerald-900 flex items-center justify-center">
                <Sparkles className="w-2.5 h-2.5 text-emerald-950" />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-base sm:text-xl text-white tracking-tight drop-shadow-sm whitespace-nowrap">                  الثورة الخضراء
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  الإدارة الميدانية
                </span>
              </div>
              <div className="hidden sm:block text-[11px] text-emerald-200/90 font-medium">                نظام إدارة الشوارع والتحصيل والممارسات
              </div>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 bg-emerald-950/40 p-1 rounded-2xl border border-emerald-800/60 shadow-inner">
            {navItems.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${isActive
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/50'
                    : 'text-emerald-200 hover:text-white hover:bg-emerald-800/50'
                    }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'stroke-[2.5]' : ''}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Period Selector & Engineer Quick Status */}
          <div className="flex items-center gap-2">
            {/* Year / Month Selector Pill */}
            <div className="flex items-center bg-emerald-950/70 hover:bg-emerald-950 rounded-2xl px-2.5 py-1.5 border border-emerald-700/50 shadow-inner transition-colors">
              <Calendar className="w-3.5 h-3.5 text-emerald-400 ml-1.5 hidden sm:inline" />
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="bg-transparent text-xs sm:text-sm font-bold text-white outline-none cursor-pointer text-center"
              >
                {months.map((m) => (
                  <option key={m.value} value={m.value} className="bg-slate-900 text-white font-semibold">
                    {m.label}
                  </option>
                ))}
              </select>
              <span className="text-emerald-500 font-bold px-1">/</span>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="bg-transparent text-xs sm:text-sm font-bold text-white outline-none cursor-pointer text-center"
              >
                {[2025, 2026, 2027, 2028, 2029, 2030].map((y) => (
                  <option key={y} value={y} className="bg-slate-900 text-white font-semibold">
                    {y}
                  </option>
                ))}
              </select>
            </div>

            {/* Logout Button */}
            {user && (
              <button
                onClick={onLogout}
                title="تسجيل الخروج"
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-emerald-950/70 hover:bg-rose-600/90 text-emerald-300 hover:text-white flex items-center justify-center border border-emerald-700/50 hover:border-rose-500 transition-all duration-200 shadow-inner"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export const BottomNav: React.FC<{
  activeTab: string;
  setActiveTab: (tab: string) => void;
}> = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'dashboard', label: 'الرئيسية', icon: Home },
    { id: 'members', label: 'الأعضاء', icon: Users },
    { id: 'streets', label: 'الشوارع', icon: MapPin },
    { id: 'collections', label: 'التحصيل', icon: DollarSign },
    { id: 'receipts', label: 'الإيصالات', icon: ReceiptText },
    { id: 'financials', label: 'الماليات', icon: MoreHorizontal },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 glass-bottom-nav shadow-2xl pb-safe">
      <div className="grid grid-cols-6 h-16 max-w-md mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center gap-1 transition-all relative ${isActive ? 'text-emerald-700 font-black' : 'text-slate-500 hover:text-slate-800 font-semibold'
                }`}
            >
              <div
                className={`p-1.5 rounded-2xl transition-all duration-300 ${isActive
                  ? 'bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-md shadow-emerald-600/30 scale-110 -translate-y-1'
                  : 'text-slate-500'
                  }`}
              >
                <Icon className="w-4 h-4 stroke-[2.5]" />
              </div>
              <span className={`text-[10px] tracking-tight leading-none ${isActive ? 'font-bold text-emerald-800' : ''}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
