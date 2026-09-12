import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, Download, Calendar, Sparkles, TrendingUp, Users, DollarSign, ArrowUpRight } from 'lucide-react';
import { StreetData } from '../types';
import { reportsApi } from '../api/client';

interface ReportsViewProps {
  year: number;
  month: number;
  onSelectStreet: (streetNumber: number) => void;
}

const MONTH_NAMES = [
  '', 'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

export const ReportsView: React.FC<ReportsViewProps> = ({
  year: initialYear,
  month: initialMonth,
  onSelectStreet,
}) => {
  const [selectedYear, setSelectedYear] = useState<number>(initialYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(initialMonth);
  const [streets, setStreets] = useState<StreetData[]>([]);
  const [selectedStreetFilter, setSelectedStreetFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Sync with prop changes if global navbar date changes
  useEffect(() => {
    setSelectedYear(initialYear);
    setSelectedMonth(initialMonth);
  }, [initialYear, initialMonth]);

  useEffect(() => {
    setLoading(true);
    reportsApi
      .streets(selectedYear, selectedMonth)
      .then((res) => setStreets(res.streets))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedYear, selectedMonth]);

  const totalMembers = streets.reduce((acc, s) => acc + s.members_count, 0);
  const totalRequired = streets.reduce((acc, s) => acc + Number(s.required_amount), 0);
  const totalPaid = streets.reduce((acc, s) => acc + Number(s.paid_amount), 0);
  const totalRemaining = streets.reduce((acc, s) => acc + Number(s.remaining_amount), 0);
  const overallPct = totalRequired > 0 ? Math.min(100, Math.round((totalPaid / totalRequired) * 100)) : 0;

  const handleExportExcel = () => {
    const url = reportsApi.exportExcelUrl(selectedYear, selectedMonth, selectedStreetFilter || undefined);
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-4 sm:space-y-5 animate-slide-up">
      {/* Header & Export Action */}
      <div className="bg-white/95 backdrop-blur-md p-4 sm:p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-2xl bg-emerald-700 text-white flex items-center justify-center shadow-md shadow-emerald-900/20">
                <FileSpreadsheet className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
                  <span>التقارير المالية وتصدير البيانات (Excel)</span>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    شهر {MONTH_NAMES[selectedMonth]} {selectedYear}
                  </span>
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  تحليل شامل لموقف التحصيل والممارسات لكل شوارع الثورة الخضراء (1 إلى 20)
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedStreetFilter}
              onChange={(e) => setSelectedStreetFilter(e.target.value)}
              className="px-3.5 py-2.5 rounded-2xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none text-xs font-bold bg-slate-50/80 shadow-sm"
            >
              <option value="">كل الشوارع (1 إلى 20)</option>
              {Array.from({ length: 20 }, (_, i) => i + 1).map((s) => (
                <option key={s} value={s}>
                  شارع {s}
                </option>
              ))}
            </select>

            <button
              onClick={handleExportExcel}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs sm:text-sm shadow-md shadow-emerald-900/20 transition-all active:scale-95"
            >
              <Download className="w-4 h-4 stroke-[2.5]" />
              <span>تصدير كشف إكسيل (.xlsx)</span>
            </button>
          </div>
        </div>

        {/* Date Selector Row inside Reports */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-1.5 text-xs font-black text-slate-700 shrink-0">
            <Calendar className="w-4 h-4 text-emerald-700" />
            <span>فترة التقرير:</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="px-3 py-1.5 bg-emerald-50/60 hover:bg-emerald-50 text-emerald-950 rounded-xl border border-emerald-300 font-black text-xs outline-none cursor-pointer focus:ring-2 focus:ring-emerald-500"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  شهر {m} ({MONTH_NAMES[m]})
                </option>
              ))}
            </select>

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
          </div>
        </div>
      </div>

      {/* KPI Overview Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 text-center">
        <div className="card-hover-effect bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-sm">
          <span className="text-xs text-slate-400 font-bold block flex items-center justify-center gap-1">
            <Users className="w-3.5 h-3.5" />
            إجمالي الأعضاء
          </span>
          <span className="text-xl sm:text-2xl font-black text-slate-900 mt-1 block">{totalMembers}</span>
        </div>
        <div className="card-hover-effect bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-sm">
          <span className="text-xs text-slate-400 font-bold block flex items-center justify-center gap-1">
            <DollarSign className="w-3.5 h-3.5" />
            المطلوب الكلي
          </span>
          <span className="text-xl sm:text-2xl font-black text-slate-900 mt-1 block">{totalRequired.toFixed(2)} ج.م</span>
        </div>
        <div className="card-hover-effect bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-sm">
          <span className="text-xs text-emerald-700 font-bold block flex items-center justify-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            إجمالي المحصل
          </span>
          <span className="text-xl sm:text-2xl font-black text-emerald-800 mt-1 block">{totalPaid.toFixed(2)} ج.م</span>
        </div>
        <div className="card-hover-effect bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-sm">
          <span className="text-xs text-amber-700 font-bold block flex items-center justify-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            نسبة التحصيل
          </span>
          <span className="text-xl sm:text-2xl font-black text-amber-600 mt-1 block">{overallPct}%</span>
        </div>
      </div>

      {/* Street Comparison Table */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="font-black text-slate-900 text-base">جدول مقارنة موقف الشوارع (1 إلى 20)</h2>
          <span className="text-xs text-slate-400 font-bold">اضغط على أي صف لفتح أعضاء الشارع</span>
        </div>

        {loading ? (
          <div className="text-center py-16 text-slate-400 text-sm">
            <span className="w-8 h-8 inline-block rounded-full border-2 border-emerald-600 border-t-transparent animate-spin mb-2" />
            <div className="font-bold">جاري تحميل التقرير...</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-700 font-black border-b border-slate-200">
                <tr>
                  <th className="p-3.5 sm:p-4">الشارع</th>
                  <th className="p-3.5 sm:p-4 text-center">الأعضاء</th>
                  <th className="p-3.5 sm:p-4">المطلوب</th>
                  <th className="p-3.5 sm:p-4">المحصل</th>
                  <th className="p-3.5 sm:p-4">المتبقي</th>
                  <th className="p-3.5 sm:p-4 text-center">نسبة الإنجاز</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {streets.map((st) => {
                  const req = Number(st.required_amount);
                  const paid = Number(st.paid_amount);
                  const pct = req > 0 ? Math.min(100, Math.round((paid / req) * 100)) : 0;
                  return (
                    <tr
                      key={st.street_number}
                      onClick={() => onSelectStreet(st.street_number)}
                      className="hover:bg-emerald-50/50 cursor-pointer transition-colors"
                    >
                      <td className="p-3.5 sm:p-4 font-black text-slate-900 flex items-center gap-2.5">
                        <span className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-900 flex items-center justify-center text-xs font-black shadow-inner">
                          {st.street_number}
                        </span>
                        <span>{st.street_name}</span>
                      </td>
                      <td className="p-3.5 sm:p-4 text-center font-bold text-slate-600">{st.members_count}</td>
                      <td className="p-3.5 sm:p-4 font-bold text-slate-800">{st.required_amount} ج.م</td>
                      <td className="p-3.5 sm:p-4 font-black text-emerald-800">{st.paid_amount} ج.م</td>
                      <td className="p-3.5 sm:p-4 font-black text-amber-600">{st.remaining_amount} ج.م</td>
                      <td className="p-3.5 sm:p-4 text-center">
                        <div className="inline-flex items-center gap-2 justify-center">
                          <div className="w-16 sm:w-20 h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                pct >= 80 ? 'bg-gradient-to-l from-emerald-500 to-teal-500' : pct >= 40 ? 'bg-amber-500' : 'bg-rose-500'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="font-black text-xs text-slate-800 w-9 text-left font-mono">{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

