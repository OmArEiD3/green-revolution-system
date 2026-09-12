import React, { useState, useEffect } from 'react';
import { DollarSign, Search, CheckCircle2, MapPin, CalendarPlus, Pencil, Calendar, Filter, Sparkles } from 'lucide-react';
import { Practice } from '../types';
import { practicesApi } from '../api/client';

interface CollectionsViewProps {
  year: number;
  month: number;
  onRecordPayment: (practiceId: number, memberId: number) => void;
  onOpenAddPractice: () => void;
  onSelectMember: (memberId: number) => void;
  onEditPractice?: (practice: Practice) => void;
}

const MONTH_NAMES = [
  '', 'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

export const CollectionsView: React.FC<CollectionsViewProps> = ({
  year: initialYear,
  month: initialMonth,
  onRecordPayment,
  onOpenAddPractice,
  onSelectMember,
  onEditPractice,
}) => {
  const [selectedYear, setSelectedYear] = useState<number>(initialYear);
  const [selectedMonth, setSelectedMonth] = useState<number | ''>(initialMonth);
  const [practices, setPractices] = useState<Practice[]>([]);
  const [streetFilter, setStreetFilter] = useState<number | string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Sync with prop changes if global navbar date changes
  useEffect(() => {
    setSelectedYear(initialYear);
    setSelectedMonth(initialMonth);
  }, [initialYear, initialMonth]);

  const fetchPractices = () => {
    setLoading(true);
    practicesApi
      .list({
        year: selectedYear || undefined,
        month: selectedMonth !== '' ? Number(selectedMonth) : undefined,
        street: streetFilter ? Number(streetFilter) : undefined,
        search: search || undefined,
      })
      .then((data) => {
        let filtered = data;
        if (statusFilter) {
          filtered = filtered.filter((p: Practice) => p.payment_status === statusFilter);
        }
        setPractices(filtered);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPractices();
  }, [selectedYear, selectedMonth, streetFilter, statusFilter, search]);

  const totalReq = practices.reduce((acc, p) => acc + Number(p.required_amount), 0);
  const totalPaid = practices.reduce((acc, p) => acc + Number(p.total_paid), 0);
  const totalRem = practices.reduce((acc, p) => acc + Number(p.remaining_amount), 0);

  return (
    <div className="space-y-4 sm:space-y-5 animate-slide-up">
      {/* Header & Quick Stats Card */}
      <div className="bg-white/95 backdrop-blur-md p-4 sm:p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-2xl bg-emerald-700 text-white flex items-center justify-center shadow-md shadow-emerald-900/20">
                <DollarSign className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
                  <span>متابعة التحصيل والممارسات</span>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {selectedMonth !== '' ? `شهر ${MONTH_NAMES[selectedMonth]} ${selectedYear}` : `عام ${selectedYear}`}
                  </span>
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  ممارسات الأعضاء الشهرية وتوثيق الدفعات وإدارة الاستحقاقات المالية
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            <button
              onClick={onOpenAddPractice}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-800 hover:to-teal-800 text-white font-black text-xs sm:text-sm shadow-md shadow-emerald-900/15 transition-all active:scale-95"
            >
              <CalendarPlus className="w-4 h-4" />
              <span>+ إضافة ممارسة</span>
            </button>
            <span className="text-xs font-black text-emerald-900 bg-emerald-50 border border-emerald-200/80 px-3.5 py-2.5 rounded-2xl flex items-center gap-1.5 shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>{practices.length} ممارسة</span>
            </span>
          </div>
        </div>

        {/* Totals Ribbon */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 bg-slate-50/90 p-3 sm:p-4 rounded-2xl border border-slate-200/80 text-center">
          <div className="p-1">
            <span className="text-[11px] sm:text-xs text-slate-500 font-bold block">إجمالي المطلوب</span>
            <span className="font-black text-sm sm:text-xl text-slate-900 mt-0.5 block">{totalReq.toFixed(2)} ج.م</span>
          </div>
          <div className="p-1 border-x border-slate-200/80">
            <span className="text-[11px] sm:text-xs text-emerald-700 font-bold block">إجمالي المحصل</span>
            <span className="font-black text-sm sm:text-xl text-emerald-800 mt-0.5 block">{totalPaid.toFixed(2)} ج.م</span>
          </div>
          <div className="p-1">
            <span className="text-[11px] sm:text-xs text-amber-700 font-bold block">المتبقي للتحصيل</span>
            <span className="font-black text-sm sm:text-xl text-amber-600 mt-0.5 block">{totalRem.toFixed(2)} ج.م</span>
          </div>
        </div>
      </div>

      {/* Date & Search Filters Bar */}
      <div className="bg-white/95 backdrop-blur-md p-3.5 sm:p-4 rounded-3xl border border-slate-200/90 shadow-sm space-y-3">
        {/* Top filter row: Month & Year Selector */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 pb-2.5 border-b border-slate-100">
          <div className="flex items-center gap-1.5 text-xs font-black text-slate-700 shrink-0">
            <Calendar className="w-4 h-4 text-emerald-700" />
            <span>فلترة التاريخ:</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Month Filter */}
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value === '' ? '' : Number(e.target.value))}
              className="px-3 py-1.5 bg-emerald-50/60 hover:bg-emerald-50 text-emerald-950 rounded-xl border border-emerald-300 font-black text-xs outline-none cursor-pointer focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">جميع الشهور</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  شهر {m} ({MONTH_NAMES[m]})
                </option>
              ))}
            </select>

            {/* Year Filter */}
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-3 py-1.5 bg-emerald-50/60 hover:bg-emerald-50 text-emerald-950 rounded-xl border border-emerald-300 font-black text-xs outline-none cursor-pointer focus:ring-2 focus:ring-emerald-500"
            >
              {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map((y) => (
                <option key={y} value={y}>
                  سنة {y}
                </option>
              ))}
            </select>

            {/* Preset quick buttons */}
            <button
              onClick={() => {
                const now = new Date();
                setSelectedYear(now.getFullYear());
                setSelectedMonth(now.getMonth() + 1);
              }}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-900 rounded-xl font-bold text-xs transition-colors"
            >
              الشهر الحالي
            </button>
            <button
              onClick={() => setSelectedMonth('')}
              className={`px-2.5 py-1.5 rounded-xl font-bold text-xs transition-colors ${
                selectedMonth === ''
                  ? 'bg-emerald-700 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              كل الشهور لسنة {selectedYear}
            </button>
          </div>
        </div>

        {/* Second filter row: Search & Street & Status */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-emerald-700 absolute right-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث باسم العضو أو الموبايل..."
              className="w-full pr-10 pl-4 py-2 bg-slate-50/80 rounded-2xl border border-slate-300 outline-none text-xs sm:text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 shadow-sm"
            />
          </div>

          <div>
            <select
              value={streetFilter}
              onChange={(e) => setStreetFilter(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50/80 rounded-2xl border border-slate-300 outline-none text-xs sm:text-sm font-bold text-slate-700 shadow-sm focus:bg-white focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">جميع الشوارع (1 إلى 20)</option>
              {Array.from({ length: 20 }, (_, i) => i + 1).map((s) => (
                <option key={s} value={s}>
                  شارع {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50/80 rounded-2xl border border-slate-300 outline-none text-xs sm:text-sm font-bold text-slate-700 shadow-sm focus:bg-white focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">جميع حالات السداد</option>
              <option value="FULLY_PAID">مسدد بالكامل</option>
              <option value="UNPAID">غير مسدد / متبقي</option>
            </select>
          </div>
        </div>
      </div>

      {/* Practices List Cards */}
      {loading ? (
        <div className="text-center py-20 text-slate-400 text-sm bg-white/90 rounded-3xl border border-slate-200">
          <div className="flex flex-col items-center gap-2">
            <span className="w-8 h-8 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
            <span className="font-bold">جاري تحميل سجل التحصيل والممارسات...</span>
          </div>
        </div>
      ) : practices.length === 0 ? (
        <div className="text-center py-16 bg-white/90 rounded-3xl border border-dashed border-slate-300 text-slate-400 text-xs font-bold">
          لا توجد ممارسات مسجلة مطابقة لخيارات الفلترة المحددة
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {practices.map((p) => (
            <div
              key={p.id}
              className="card-hover-effect bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-sm flex flex-col justify-between"
            >
              <div>
                {/* Practice Month Prominent Header Badge */}
                <div className="flex items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-slate-100">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-800 text-white text-[11px] sm:text-xs font-black shadow-sm">
                    <Calendar className="w-3.5 h-3.5 text-emerald-300" />
                    <span>ممارسة شهر {p.month} ({MONTH_NAMES[p.month]}) {p.year}</span>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-black ${
                      p.payment_status === 'FULLY_PAID'
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                        : 'bg-rose-100 text-rose-800 border border-rose-300'
                    }`}
                  >
                    {p.payment_status === 'FULLY_PAID' ? '✓ مسدد' : 'غير مسدد'}
                  </span>
                </div>

                {/* Member Info */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div onClick={() => onSelectMember(p.member)} className="cursor-pointer group flex-1">
                    <h3 className="font-black text-slate-900 text-base group-hover:text-emerald-800 transition-colors line-clamp-1">
                      {p.member_name}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap">
                      <span className="font-bold text-emerald-800 flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
                        <MapPin className="w-3 h-3 text-emerald-600" />
                        شارع {p.street_number}
                      </span>
                      <span>• {p.practice_type_name}</span>
                    </div>
                  </div>

                  {onEditPractice && (
                    <button
                      onClick={() => onEditPractice(p)}
                      className="p-2 rounded-xl bg-slate-50 hover:bg-emerald-50 text-slate-500 hover:text-emerald-700 border border-slate-200 hover:border-emerald-300 transition-colors shrink-0"
                      title="تعديل الممارسة"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Amounts Breakdown */}
                <div className="grid grid-cols-3 gap-2 bg-slate-50/90 p-3 rounded-2xl text-center text-xs mb-3 border border-slate-100">
                  <div>
                    <span className="text-slate-400 block font-semibold text-[10px] sm:text-xs">المطلوب</span>
                    <span className="font-black text-slate-900 text-sm mt-0.5 block">{p.required_amount}</span>
                  </div>
                  <div>
                    <span className="text-emerald-700 block font-semibold text-[10px] sm:text-xs">المدفوع</span>
                    <span className="font-black text-emerald-800 text-sm mt-0.5 block">{p.total_paid}</span>
                  </div>
                  <div>
                    <span className="text-amber-700 block font-semibold text-[10px] sm:text-xs">المتبقي</span>
                    <span className={`font-black text-sm mt-0.5 block ${Number(p.remaining_amount) > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                      {p.remaining_amount}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 gap-2">
                <button
                  onClick={() => onSelectMember(p.member)}
                  className="text-xs text-slate-600 hover:text-emerald-800 font-bold px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  كشف الحساب
                </button>

                {p.payment_status !== 'FULLY_PAID' ? (
                  <button
                    onClick={() => onRecordPayment(p.id, p.member)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-md shadow-emerald-900/15 active:scale-95 transition-all"
                  >
                    <DollarSign className="w-3.5 h-3.5 stroke-[3]" />
                    <span>تسجيل تحصيل</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-1 text-emerald-700 font-bold text-xs bg-emerald-50 px-2.5 py-1.5 rounded-xl border border-emerald-100">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>تم التحصيل بالكامل</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

