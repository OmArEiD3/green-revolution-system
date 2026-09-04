import React, { useState, useEffect } from 'react';
import { MapPin, Users, ChevronLeft, ArrowRight } from 'lucide-react';
import { StreetData } from '../types';
import { reportsApi } from '../api/client';

interface StreetsViewProps {
  year: number;
  month: number;
  onSelectStreet: (streetNumber: number) => void;
}

export const StreetsView: React.FC<StreetsViewProps> = ({
  year,
  month,
  onSelectStreet,
}) => {
  const [streets, setStreets] = useState<StreetData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    reportsApi
      .streets(year, month)
      .then((res) => setStreets(res.streets))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [year, month]);

  const monthNames = [
    '', 'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];

  return (
    <div className="space-y-4 animate-slide-up">
      {/* Header */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <MapPin className="w-6 h-6 text-emerald-700" />
            <span>شوارع المنطقة (شارع 1 إلى 17)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            متابعة دقيقة لموقف التحصيل ونسب السداد لكل شارع لشهر {monthNames[month]} {year}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
            17 شارع رئيسي
          </span>
        </div>
      </div>

      {/* Street Cards Grid */}
      {loading ? (
        <div className="text-center py-16 text-slate-400 text-sm bg-white rounded-3xl border border-slate-200">
          جاري تحميل بيانات الشوارع...
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {streets.map((st) => {
            const req = Number(st.required_amount);
            const paid = Number(st.paid_amount);
            const pct = req > 0 ? Math.min(100, Math.round((paid / req) * 100)) : 0;

            return (
              <div
                key={st.street_number}
                onClick={() => onSelectStreet(st.street_number)}
                className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-emerald-500/50 transition-all duration-300 cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-700 to-teal-500 text-white flex items-center justify-center font-black text-lg shadow-md border border-emerald-400/30">
                        {st.street_number}
                      </div>
                      <div>
                        <h3 className="font-black text-slate-900 text-base group-hover:text-emerald-800 transition-colors">
                          {st.street_name}
                        </h3>
                        <span className="text-xs text-slate-500 font-semibold flex items-center gap-1 mt-0.5">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          {st.members_count} عضو مسجل
                        </span>
                      </div>
                    </div>

                    <div className="w-8 h-8 rounded-xl bg-slate-50 text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-700 flex items-center justify-center transition-colors">
                      <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                    </div>
                  </div>

                  {/* Financial Metrics */}
                  <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-2xl text-center text-xs mb-3">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">المطلوب</span>
                      <span className="font-black text-slate-800 text-xs mt-0.5 block">{st.required_amount}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-emerald-700 block font-semibold">المدفوع</span>
                      <span className="font-black text-emerald-800 text-xs mt-0.5 block">{st.paid_amount}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-amber-700 block font-semibold">المتبقي</span>
                      <span className={`font-black text-xs mt-0.5 block ${Number(st.remaining_amount) > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                        {st.remaining_amount}
                      </span>
                    </div>
                  </div>

                  {/* Collection Progress Bar */}
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 mb-1">
                      <span>نسبة التحصيل</span>
                      <span className={`${pct >= 80 ? 'text-emerald-700' : pct >= 40 ? 'text-amber-600' : 'text-rose-600'}`}>
                        {pct}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          pct >= 80 ? 'bg-emerald-600' : pct >= 40 ? 'bg-amber-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-emerald-700 group-hover:text-emerald-900">
                  <span>استعراض أعضاء الشارع والتحصيل</span>
                  <ArrowRight className="w-3 h-3 rotate-180 group-hover:-translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
