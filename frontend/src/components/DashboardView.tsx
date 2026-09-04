import React, { useState, useEffect } from 'react';
import { Users, DollarSign, ReceiptText, TrendingUp, CheckCircle2, Clock, ShieldCheck, ArrowRight, Zap, CalendarPlus } from 'lucide-react';
import { DashboardData } from '../types';
import { reportsApi } from '../api/client';

interface DashboardViewProps {
  year: number;
  month: number;
  onNavigateTab: (tab: string) => void;
  onOpenAddMember: () => void;
  onOpenAddPractice: () => void;
  onOpenRecordPayment: () => void;
  onOpenAddExpense: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  year,
  month,
  onNavigateTab,
  onOpenAddMember,
  onOpenAddPractice,
  onOpenRecordPayment,
  onOpenAddExpense,
}) => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = () => {
    setLoading(true);
    reportsApi
      .dashboard(year, month)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDashboard();
  }, [year, month]);

  const monthNames = [
    '', 'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];

  const totalReq = Number(data?.collections.total_required || 0);
  const totalPaid = Number(data?.collections.total_paid || 0);
  const collectionPercentage = totalReq > 0 ? Math.min(100, Math.round((totalPaid / totalReq) * 100)) : 0;

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400 text-sm font-bold animate-pulse">
        جاري تحميل بيانات لوحة التحكم...
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Hero Management Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-900 via-slate-900 to-emerald-950 p-6 sm:p-8 text-white shadow-2xl border border-emerald-500/20">
        {/* Glow ambient lights */}
        <div className="absolute -top-24 -left-24 w-80 h-80 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold shadow-inner">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>منظومة الثورة الخضراء الميدانية</span>
              <span>•</span>
              <span>{monthNames[month]} {year}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white leading-tight">
              لوحة المتابعة والتحصيل الفوري
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
              تحكم كامل في ممارسات الكهرباء للشوارع (1 إلى 17)، تحديد القيم الشهرية المتغيرة، وتوثيق التحصيل والإيصالات.
            </p>

            {/* Live Collection Progress Meter */}
            <div className="pt-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-emerald-400" />
                  نسبة إنجاز التحصيل لهذا الشهر
                </span>
                <span className="text-emerald-400 font-black text-sm">{collectionPercentage}%</span>
              </div>
              <div className="w-full h-3 bg-slate-800/80 rounded-full overflow-hidden p-0.5 border border-slate-700">
                <div
                  className="h-full bg-gradient-to-l from-emerald-400 to-teal-500 rounded-full transition-all duration-1000 shadow-sm"
                  style={{ width: `${collectionPercentage}%` }}
                />
              </div>
            </div>
          </div>

          {/* Quick Actions Floating Cluster */}
          <div className="flex flex-row lg:flex-col flex-wrap gap-2.5 sm:gap-3">
            <button
              onClick={onOpenRecordPayment}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2.5 px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs sm:text-sm shadow-xl shadow-emerald-950/50 hover:shadow-emerald-500/20 active:scale-95 transition-all duration-200"
            >
              <DollarSign className="w-4 h-4 stroke-[3]" />
              <span>+ تسجيل دفعة تحصيل</span>
            </button>

            <button
              onClick={onOpenAddPractice}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-700/80 hover:bg-emerald-600 text-white font-black text-xs sm:text-sm border border-emerald-500/40 backdrop-blur-md active:scale-95 transition-all"
            >
              <CalendarPlus className="w-4 h-4 text-emerald-300" />
              <span>+ إضافة ممارسة لعضو</span>
            </button>

            <div className="flex items-center gap-2 w-full">
              <button
                onClick={onOpenAddMember}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs border border-white/10 backdrop-blur-md active:scale-95 transition-all"
              >
                <Users className="w-3.5 h-3.5 text-emerald-300" />
                <span>+ عضو</span>
              </button>

              <button
                onClick={onOpenAddExpense}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs border border-white/10 backdrop-blur-md active:scale-95 transition-all"
              >
                <ReceiptText className="w-3.5 h-3.5 text-amber-300" />
                <span>+ مصروف</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Members */}
        <div
          onClick={() => onNavigateTab('members')}
          className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-emerald-500/50 transition-all duration-300 cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500">إجمالي الأعضاء</span>
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300 shadow-sm">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {data?.members.total_members || 0}
              <span className="text-xs font-semibold text-slate-400 mr-1.5">عضو</span>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-emerald-700 group-hover:text-emerald-900">
            <span>تصفح الشوارع 1 - 17</span>
            <ArrowRight className="w-3 h-3 rotate-180 group-hover:-translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Total Collected */}
        <div
          onClick={() => onNavigateTab('collections')}
          className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-emerald-500/50 transition-all duration-300 cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500">إجمالي المحصل</span>
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300 shadow-sm">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-800 tracking-tight">
              {data?.collections.total_paid || '0.00'}
              <span className="text-xs font-semibold text-slate-400 mr-1.5">ج.م</span>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>المطلوب: <strong className="text-slate-800">{data?.collections.total_required || '0.00'}</strong></span>
            <span className="text-emerald-700 font-bold">{collectionPercentage}%</span>
          </div>
        </div>

        {/* Remaining Dues */}
        <div
          onClick={() => onNavigateTab('collections')}
          className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-amber-500/50 transition-all duration-300 cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500">المتبقي للتحصيل</span>
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-all duration-300 shadow-sm">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-amber-700 tracking-tight">
              {data?.collections.remaining || '0.00'}
              <span className="text-xs font-semibold text-slate-400 mr-1.5">ج.م</span>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-amber-800 group-hover:text-amber-900">
            <span>مستحقات معلقة</span>
            <ArrowRight className="w-3 h-3 rotate-180 group-hover:-translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Financial Net Balance */}
        <div
          onClick={() => onNavigateTab('financials')}
          className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-blue-500/50 transition-all duration-300 cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500">صافي رصيد الصندوق</span>
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 shadow-sm">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {data?.financials.net_balance || '0.00'}
              <span className="text-xs font-semibold text-slate-400 mr-1.5">ج.م</span>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span className="text-blue-700 font-bold">الزيادات: +{data?.financials.overpayments}</span>
            <span className="text-red-700 font-bold">المصاريف: -{data?.financials.expenses}</span>
          </div>
        </div>
      </div>

      {/* Two-Column Strategic Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Payment Status Breakdown Card (2 States: FULLY_PAID vs UNPAID) */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <h3 className="font-black text-slate-900 text-sm sm:text-base">
                موقف ممارسات الشهر ({monthNames[month]} {year})
              </h3>
            </div>
            <button
              onClick={() => onNavigateTab('collections')}
              className="text-xs text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1"
            >
              <span>فتح التحصيل</span>
              <ArrowRight className="w-3 h-3 rotate-180" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3.5 text-center">
            <div className="bg-emerald-50/80 p-4 rounded-2xl border border-emerald-200/70 hover:shadow-md transition-shadow">
              <span className="text-xs text-emerald-800 font-bold block">تم التحصيل والسداد</span>
              <span className="text-3xl font-black text-emerald-900 mt-1 block">
                {data?.payment_status.fully_paid || 0}
              </span>
              <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">ممارسة مسددة</span>
            </div>

            <div className="bg-rose-50/80 p-4 rounded-2xl border border-rose-200/70 hover:shadow-md transition-shadow">
              <span className="text-xs text-rose-800 font-bold block">غير مسدد (في الانتظار)</span>
              <span className="text-3xl font-black text-rose-900 mt-1 block">
                {data?.payment_status.unpaid || 0}
              </span>
              <span className="text-[11px] text-rose-600 font-semibold mt-1 block">ممارسة معلقة</span>
            </div>
          </div>
        </div>

        {/* Receipts Distribution Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center">
                <ReceiptText className="w-4 h-4" />
              </div>
              <h3 className="font-black text-slate-900 text-sm sm:text-base">
                موقف توثيق وتسليم الإيصالات
              </h3>
            </div>
            <button
              onClick={() => onNavigateTab('receipts')}
              className="text-xs text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1"
            >
              <span>مركز الإيصالات</span>
              <ArrowRight className="w-3 h-3 rotate-180" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-emerald-50/80 p-3.5 rounded-2xl border border-emerald-200/70 hover:shadow-md transition-shadow">
              <span className="text-xs text-emerald-800 font-bold block">تم التسليم للعضو</span>
              <span className="text-2xl font-black text-emerald-900 mt-1 block">
                {data?.receipts.delivered || 0}
              </span>
              <span className="text-[10px] text-emerald-600 font-semibold mt-1 block">موثق ومسلّم</span>
            </div>

            <div className="bg-blue-50/80 p-3.5 rounded-2xl border border-blue-200/70 hover:shadow-md transition-shadow">
              <span className="text-xs text-blue-800 font-bold block">مستلم من الكهرباء</span>
              <span className="text-2xl font-black text-blue-900 mt-1 block">
                {data?.receipts.received || 0}
              </span>
              <span className="text-[10px] text-blue-600 font-semibold mt-1 block">جاهز للتسليم</span>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 hover:shadow-md transition-shadow">
              <span className="text-xs text-slate-600 font-bold block">لم تستلم بعد</span>
              <span className="text-2xl font-black text-slate-800 mt-1 block">
                {data?.receipts.not_received || 0}
              </span>
              <span className="text-[10px] text-slate-500 font-semibold mt-1 block">لدى شركة الكهرباء</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
