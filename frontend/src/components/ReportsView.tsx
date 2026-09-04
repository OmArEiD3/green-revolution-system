import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet, Download, Filter, Calendar, MapPin,
  TrendingUp, Users, DollarSign, CheckCircle2, Sparkles, ArrowRight
} from 'lucide-react';
import { StreetData } from '../types';
import { reportsApi } from '../api/client';

interface ReportsViewProps {
  year: number;
  month: number;
  onSelectStreet: (streetNumber: number) => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  year,
  month,
  onSelectStreet,
}) => {
  const [streets, setStreets] = useState<StreetData[]>([]);
  const [selectedStreetFilter, setSelectedStreetFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    reportsApi
      .streets(year, month)
      .then((res) => setStreets(res.streets))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [year, month]);

  const totalMembers = streets.reduce((acc, s) => acc + s.members_count, 0);
  const totalRequired = streets.reduce((acc, s) => acc + Number(s.required_amount), 0);
  const totalPaid = streets.reduce((acc, s) => acc + Number(s.paid_amount), 0);
  const totalRemaining = streets.reduce((acc, s) => acc + Number(s.remaining_amount), 0);

  const handleExportExcel = () => {
    const url = reportsApi.exportExcelUrl(year, month, selectedStreetFilter || undefined);
    window.open(url, '_blank');
  };

  const monthNames = [
    '', 'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];

  return (
    <div className="space-y-4 animate-slide-up">
      {/* Header & Export Action */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-emerald-700" />
            <span>التقارير المالية وتصدير البيانات (Excel)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            تقرير تحليلي شامل لموقف التحصيل والسداد لشهر {monthNames[month]} {year} لجميع شوارع الثورة الخضراء
          </p>
        </div>

        <button
          onClick={handleExportExcel}
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs sm:text-sm shadow-md shadow-emerald-900/20 transition-all active:scale-95"
        >
          <Download className="w-4 h-4 stroke-[2.5]" />
          <span>تصدير كشف إكسيل كامل (.xlsx)</span>
        </button>
      </div>

      {/* KPI Overview Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 text-center">
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-400 font-bold block">إجمالي الأعضاء</span>
          <span className="text-2xl font-black text-slate-900 mt-1 block">{totalMembers}</span>
        </div>
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-400 font-bold block">المطلوب الكلي</span>
          <span className="text-2xl font-black text-slate-900 mt-1 block">{totalRequired.toFixed(2)} ج.م</span>
        </div>
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-sm">
          <span className="text-xs text-emerald-700 font-bold block">إجمالي المحصل</span>
          <span className="text-2xl font-black text-emerald-800 mt-1 block">{totalPaid.toFixed(2)} ج.م</span>
        </div>
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-sm">
          <span className="text-xs text-amber-700 font-bold block">إجمالي المتبقي</span>
          <span className="text-2xl font-black text-amber-600 mt-1 block">{totalRemaining.toFixed(2)} ج.م</span>
        </div>
      </div>

      {/* Street Comparison Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-black text-slate-900 text-base">جدول مقارنة موقف الشوارع (1 إلى 17)</h2>
          <span className="text-xs text-slate-400 font-bold">اضغط على أي صف لفتح أعضاء الشارع</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-700 font-black border-b border-slate-200">
              <tr>
                <th className="p-4">الشارع</th>
                <th className="p-4 text-center">الأعضاء</th>
                <th className="p-4">المطلوب</th>
                <th className="p-4">المحصل</th>
                <th className="p-4">المتبقي</th>
                <th className="p-4 text-center">نسبة الإنجاز</th>
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
                    <td className="p-4 font-black text-slate-900 flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-900 flex items-center justify-center text-xs font-black">
                        {st.street_number}
                      </span>
                      <span>{st.street_name}</span>
                    </td>
                    <td className="p-4 text-center font-bold text-slate-600">{st.members_count}</td>
                    <td className="p-4 font-bold text-slate-800">{st.required_amount} ج.م</td>
                    <td className="p-4 font-black text-emerald-800">{st.paid_amount} ج.م</td>
                    <td className="p-4 font-black text-amber-600">{st.remaining_amount} ج.م</td>
                    <td className="p-4 text-center">
                      <div className="inline-flex items-center gap-2">
                        <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              pct >= 80 ? 'bg-emerald-600' : pct >= 40 ? 'bg-amber-500' : 'bg-rose-500'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="font-black text-xs text-slate-700">{pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
