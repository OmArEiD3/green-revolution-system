import React, { useState, useEffect } from 'react';
import {
  DollarSign, Search, Filter, CheckCircle2, Clock,
  AlertCircle, ArrowUpRight, Plus, Users, MapPin, ChevronLeft, CalendarPlus
} from 'lucide-react';
import { Practice } from '../types';
import { practicesApi } from '../api/client';

interface CollectionsViewProps {
  year: number;
  month: number;
  onRecordPayment: (practiceId: number, memberId: number) => void;
  onOpenAddPractice: () => void;
  onSelectMember: (memberId: number) => void;
}

export const CollectionsView: React.FC<CollectionsViewProps> = ({
  year,
  month,
  onRecordPayment,
  onOpenAddPractice,
  onSelectMember,
}) => {
  const [practices, setPractices] = useState<Practice[]>([]);
  const [streetFilter, setStreetFilter] = useState<number | string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchPractices = () => {
    setLoading(true);
    practicesApi
      .list({
        year,
        month,
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
  }, [year, month, streetFilter, statusFilter, search]);

  const totalReq = practices.reduce((acc, p) => acc + Number(p.required_amount), 0);
  const totalPaid = practices.reduce((acc, p) => acc + Number(p.total_paid), 0);
  const totalRem = practices.reduce((acc, p) => acc + Number(p.remaining_amount), 0);

  const monthNames = [
    '', 'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];

  return (
    <div className="space-y-4 animate-slide-up">
      {/* Header with Monthly summary bar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <DollarSign className="w-6 h-6 text-emerald-700" />
              <span>متابعة التحصيل والممارسات الشهرية</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              شهر {monthNames[month]} {year} — ممارسات الأعضاء الشهرية وإمكانية إضافة ممارسات متعددة
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenAddPractice}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs sm:text-sm shadow-md transition-all active:scale-95"
            >
              <CalendarPlus className="w-4 h-4" />
              <span>+ إضافة ممارسة لعضو</span>
            </button>
            <span className="text-xs font-black text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-2xl">
              {practices.length} ممارسة
            </span>
          </div>
        </div>

        {/* Totals Ribbon */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-center">
          <div>
            <span className="text-[10px] sm:text-xs text-slate-400 font-bold block">إجمالي المطلوب</span>
            <span className="font-black text-sm sm:text-lg text-slate-900 mt-0.5 block">{totalReq.toFixed(2)} ج.م</span>
          </div>
          <div>
            <span className="text-[10px] sm:text-xs text-emerald-700 font-bold block">إجمالي المحصل</span>
            <span className="font-black text-sm sm:text-lg text-emerald-800 mt-0.5 block">{totalPaid.toFixed(2)} ج.م</span>
          </div>
          <div>
            <span className="text-[10px] sm:text-xs text-amber-700 font-bold block">المتبقي للتحصيل</span>
            <span className="font-black text-sm sm:text-lg text-amber-600 mt-0.5 block">{totalRem.toFixed(2)} ج.م</span>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-emerald-700 absolute right-3.5 top-3.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث باسم العضو أو الموبايل..."
            className="w-full pr-10 pl-4 py-2.5 bg-white rounded-2xl border border-slate-300 outline-none text-xs sm:text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 shadow-sm"
          />
        </div>

        <div>
          <select
            value={streetFilter}
            onChange={(e) => setStreetFilter(e.target.value)}
            className="w-full px-4 py-2.5 bg-white rounded-2xl border border-slate-300 outline-none text-xs sm:text-sm font-bold text-slate-700 shadow-sm"
          >
            <option value="">جميع الشوارع (1 إلى 17)</option>
            {Array.from({ length: 17 }, (_, i) => i + 1).map((s) => (
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
            className="w-full px-4 py-2.5 bg-white rounded-2xl border border-slate-300 outline-none text-xs sm:text-sm font-bold text-slate-700 shadow-sm"
          >
            <option value="">جميع حالات السداد</option>
            <option value="FULLY_PAID">مسدد</option>
            <option value="UNPAID">غير مسدد</option>
          </select>
        </div>
      </div>

      {/* Practices List Cards */}
      {loading ? (
        <div className="text-center py-16 text-slate-400 text-sm bg-white rounded-3xl border border-slate-200">
          جاري تحميل سجل التحصيل...
        </div>
      ) : practices.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-300 text-slate-400 text-xs">
          لا توجد ممارسات مسجلة مطابقة لخيارات البحث
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {practices.map((p) => (
            <div
              key={p.id}
              className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-emerald-500/50 transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div onClick={() => onSelectMember(p.member)} className="cursor-pointer group">
                    <h3 className="font-black text-slate-900 text-base group-hover:text-emerald-800 transition-colors">
                      {p.member_name}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                      <span className="font-bold text-emerald-800 flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
                        <MapPin className="w-3 h-3 text-emerald-600" />
                        شارع {p.street_number}
                      </span>
                      <span>• {p.practice_type_name}</span>
                    </div>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-black ${
                      p.payment_status === 'FULLY_PAID'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {p.payment_status === 'FULLY_PAID' ? '✓ مسدد' : 'غير مسدد'}
                  </span>
                </div>

                {/* Amounts Breakdown */}
                <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-2xl text-center text-xs mb-3">
                  <div>
                    <span className="text-slate-400 block font-semibold">المطلوب</span>
                    <span className="font-black text-slate-900 text-sm mt-0.5 block">{p.required_amount}</span>
                  </div>
                  <div>
                    <span className="text-emerald-700 block font-semibold">المدفوع</span>
                    <span className="font-black text-emerald-800 text-sm mt-0.5 block">{p.total_paid}</span>
                  </div>
                  <div>
                    <span className="text-amber-700 block font-semibold">المتبقي</span>
                    <span className={`font-black text-sm mt-0.5 block ${Number(p.remaining_amount) > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                      {p.remaining_amount}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2.5 border-t border-slate-100">
                <button
                  onClick={() => onSelectMember(p.member)}
                  className="text-xs text-slate-500 hover:text-emerald-700 font-bold"
                >
                  كشف الحساب
                </button>

                {p.payment_status !== 'FULLY_PAID' ? (
                  <button
                    onClick={() => onRecordPayment(p.id, p.member)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-md shadow-emerald-900/20 active:scale-95 transition-all"
                  >
                    <DollarSign className="w-3.5 h-3.5 stroke-[3]" />
                    <span>تسجيل تحصيل</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-1 text-emerald-700 font-bold text-xs bg-emerald-50 px-3 py-1.5 rounded-xl">
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
