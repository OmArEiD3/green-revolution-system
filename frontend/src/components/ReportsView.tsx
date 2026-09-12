import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet, Download, Calendar, Sparkles, TrendingUp,
  Users, DollarSign, Building2, Search, CheckCircle2,
  AlertCircle, Receipt as ReceiptIcon, Filter, RefreshCw
} from 'lucide-react';
import { StreetData, CommercialReportRecord, CommercialReportSummary } from '../types';
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
  const [activeTab, setActiveTab] = useState<'RESIDENTIAL' | 'COMMERCIAL'>('RESIDENTIAL');
  const [selectedYear, setSelectedYear] = useState<number>(initialYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(initialMonth);
  const [useCustomDateRange, setUseCustomDateRange] = useState<boolean>(false);
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Residential state
  const [streets, setStreets] = useState<StreetData[]>([]);
  const [selectedStreetFilter, setSelectedStreetFilter] = useState<string>('');
  const [loadingResidential, setLoadingResidential] = useState<boolean>(true);

  // Commercial state
  const [commercialRecords, setCommercialRecords] = useState<CommercialReportRecord[]>([]);
  const [commercialSummary, setCommercialSummary] = useState<CommercialReportSummary | null>(null);
  const [loadingCommercial, setLoadingCommercial] = useState<boolean>(false);
  const [commercialStatusFilter, setCommercialStatusFilter] = useState<'ALL' | 'FULLY_PAID' | 'UNPAID'>('ALL');

  // Sync with prop changes if global navbar date changes
  useEffect(() => {
    setSelectedYear(initialYear);
    setSelectedMonth(initialMonth);
  }, [initialYear, initialMonth]);

  // Fetch residential reports
  useEffect(() => {
    setLoadingResidential(true);
    reportsApi
      .streets(selectedYear, selectedMonth)
      .then((res) => setStreets(res.streets))
      .catch(console.error)
      .finally(() => setLoadingResidential(false));
  }, [selectedYear, selectedMonth]);

  // Fetch commercial reports
  const fetchCommercialReport = () => {
    setLoadingCommercial(true);
    const params: any = {};
    if (useCustomDateRange) {
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
    } else {
      params.year = selectedYear;
      params.month = selectedMonth;
    }
    if (searchQuery.trim()) {
      params.search = searchQuery.trim();
    }

    reportsApi
      .commercial(params)
      .then((res) => {
        setCommercialRecords(res.records);
        setCommercialSummary(res.summary);
      })
      .catch(console.error)
      .finally(() => setLoadingCommercial(false));
  };

  useEffect(() => {
    if (activeTab === 'COMMERCIAL') {
      fetchCommercialReport();
    }
  }, [activeTab, selectedYear, selectedMonth, useCustomDateRange, dateFrom, dateTo, searchQuery]);

  // Residential Totals
  const totalResMembers = streets.reduce((acc, s) => acc + s.members_count, 0);
  const totalResRequired = streets.reduce((acc, s) => acc + Number(s.required_amount), 0);
  const totalResPaid = streets.reduce((acc, s) => acc + Number(s.paid_amount), 0);
  const totalResRemaining = streets.reduce((acc, s) => acc + Number(s.remaining_amount), 0);
  const overallResPct = totalResRequired > 0 ? Math.min(100, Math.round((totalResPaid / totalResRequired) * 100)) : 0;

  // Filtered Commercial records
  const filteredCommercialRecords = commercialRecords.filter((rec) => {
    if (commercialStatusFilter === 'FULLY_PAID') return rec.payment_status === 'FULLY_PAID';
    if (commercialStatusFilter === 'UNPAID') return rec.payment_status === 'UNPAID';
    return true;
  });

  const handleExportExcel = () => {
    const url = reportsApi.exportExcelUrl(selectedYear, selectedMonth, selectedStreetFilter || undefined);
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-slide-up">
      {/* Header & Main Actions */}
      <div className="bg-white/95 backdrop-blur-md p-4 sm:p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-700 to-teal-800 text-white flex items-center justify-center shadow-md shadow-emerald-900/20">
                <FileSpreadsheet className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2 flex-wrap">
                  <span>التقارير المالية المجمعة والأنشطة التجارية</span>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {useCustomDateRange
                      ? `فترة مخصصة (${dateFrom || 'البداية'} إلى ${dateTo || 'الآن'})`
                      : `شهر ${MONTH_NAMES[selectedMonth]} ${selectedYear}`}
                  </span>
                </h1>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                  تحليل تفصيلي شامل لكافة الشوارع السكنية والأنشطة والجهات التجارية مع إمكانية التصدير للإكسيل
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {activeTab === 'RESIDENTIAL' && (
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
            )}

            <button
              onClick={handleExportExcel}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs sm:text-sm shadow-md shadow-emerald-900/20 transition-all active:scale-95"
              title="تصدير كشف شامل للشوارع السكنية والتجارية"
            >
              <Download className="w-4 h-4 stroke-[2.5]" />
              <span>تصدير تقرير إكسيل كامل (.xlsx)</span>
            </button>
          </div>
        </div>

        {/* Tab Switcher: Residential vs Commercial */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
          <button
            onClick={() => setActiveTab('RESIDENTIAL')}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-black text-xs sm:text-sm transition-all ${
              activeTab === 'RESIDENTIAL'
                ? 'bg-emerald-700 text-white shadow-md shadow-emerald-900/20 ring-2 ring-emerald-600/30'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>الشوارع السكنية (1 إلى 20)</span>
          </button>

          <button
            onClick={() => setActiveTab('COMMERCIAL')}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-black text-xs sm:text-sm transition-all ${
              activeTab === 'COMMERCIAL'
                ? 'bg-emerald-700 text-white shadow-md shadow-emerald-900/20 ring-2 ring-emerald-600/30'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>الجهات والأنشطة التجارية</span>
            {commercialSummary && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 text-white font-bold">
                {commercialSummary.total_practices}
              </span>
            )}
          </button>
        </div>

        {/* Period Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs font-black text-slate-700 shrink-0">
              <Calendar className="w-4 h-4 text-emerald-700" />
              <span>الفترة:</span>
            </div>

            {!useCustomDateRange ? (
              <>
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
              </>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1">
                  <span className="text-[11px] font-bold text-slate-500">من:</span>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[11px] font-bold text-slate-500">إلى:</span>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            )}

            {activeTab === 'COMMERCIAL' && (
              <button
                onClick={() => setUseCustomDateRange(!useCustomDateRange)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors"
              >
                {useCustomDateRange ? 'الرجوع للشهر والسنة' : 'تحديد فترة بالتاريخ'}
              </button>
            )}
          </div>

          {activeTab === 'COMMERCIAL' && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  placeholder="بحث باسم النشاط أو الهاتف أو السجل..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pr-9 pl-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <select
                value={commercialStatusFilter}
                onChange={(e: any) => setCommercialStatusFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold bg-slate-50 outline-none"
              >
                <option value="ALL">كل الحالات</option>
                <option value="FULLY_PAID">مسدد بالكامل</option>
                <option value="UNPAID">غير مسدد / متبقي</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. RESIDENTIAL TAB CONTENT */}
      {/* ========================================================================= */}
      {activeTab === 'RESIDENTIAL' && (
        <>
          {/* Residential KPI Overview Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 text-center">
            <div className="card-hover-effect bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-sm">
              <span className="text-xs text-slate-400 font-bold block flex items-center justify-center gap-1">
                <Users className="w-3.5 h-3.5" />
                إجمالي الأعضاء السكنيين
              </span>
              <span className="text-xl sm:text-2xl font-black text-slate-900 mt-1 block">{totalResMembers}</span>
            </div>
            <div className="card-hover-effect bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-sm">
              <span className="text-xs text-slate-400 font-bold block flex items-center justify-center gap-1">
                <DollarSign className="w-3.5 h-3.5" />
                المطلوب السكني الكلي
              </span>
              <span className="text-xl sm:text-2xl font-black text-slate-900 mt-1 block">{totalResRequired.toFixed(2)} ج.م</span>
            </div>
            <div className="card-hover-effect bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-sm">
              <span className="text-xs text-emerald-700 font-bold block flex items-center justify-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" />
                المحصل السكني
              </span>
              <span className="text-xl sm:text-2xl font-black text-emerald-800 mt-1 block">{totalResPaid.toFixed(2)} ج.م</span>
            </div>
            <div className="card-hover-effect bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-sm">
              <span className="text-xs text-amber-700 font-bold block flex items-center justify-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                نسبة التحصيل السكني
              </span>
              <span className="text-xl sm:text-2xl font-black text-amber-600 mt-1 block">{overallResPct}%</span>
            </div>
          </div>

          {/* Street Comparison Table */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h2 className="font-black text-slate-900 text-base">جدول مقارنة موقف الشوارع (1 إلى 20)</h2>
              <span className="text-xs text-slate-400 font-bold">اضغط على أي صف لفتح أعضاء الشارع</span>
            </div>

            {loadingResidential ? (
              <div className="text-center py-16 text-slate-400 text-sm">
                <span className="w-8 h-8 inline-block rounded-full border-2 border-emerald-600 border-t-transparent animate-spin mb-2" />
                <div className="font-bold">جاري تحميل التقرير السكني...</div>
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
        </>
      )}

      {/* ========================================================================= */}
      {/* 2. COMMERCIAL TAB CONTENT */}
      {/* ========================================================================= */}
      {activeTab === 'COMMERCIAL' && (
        <>
          {/* Commercial KPI Overview Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 text-center">
            <div className="card-hover-effect bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-sm">
              <span className="text-xs text-slate-400 font-bold block flex items-center justify-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-slate-600" />
                الجهات التجارية
              </span>
              <span className="text-xl sm:text-2xl font-black text-slate-900 mt-1 block">
                {commercialSummary?.total_commercial_members ?? 0}
              </span>
              <span className="text-[10px] text-slate-400 font-bold">
                ({commercialSummary?.total_practices ?? 0} ممارسة مسجلة)
              </span>
            </div>

            <div className="card-hover-effect bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-sm">
              <span className="text-xs text-slate-400 font-bold block flex items-center justify-center gap-1">
                <DollarSign className="w-3.5 h-3.5" />
                المطلوب التجاري
              </span>
              <span className="text-xl sm:text-2xl font-black text-slate-900 mt-1 block">
                {Number(commercialSummary?.total_required || 0).toFixed(2)} ج.م
              </span>
            </div>

            <div className="card-hover-effect bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-sm">
              <span className="text-xs text-emerald-700 font-bold block flex items-center justify-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" />
                المحصل التجاري
              </span>
              <span className="text-xl sm:text-2xl font-black text-emerald-800 mt-1 block">
                {Number(commercialSummary?.total_paid || 0).toFixed(2)} ج.م
              </span>
            </div>

            <div className="card-hover-effect bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-sm">
              <span className="text-xs text-amber-700 font-bold block flex items-center justify-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                المتبقي التجاري
              </span>
              <span className="text-xl sm:text-2xl font-black text-amber-600 mt-1 block">
                {Number(commercialSummary?.total_remaining || 0).toFixed(2)} ج.م
              </span>
            </div>

            <div className="card-hover-effect bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-sm col-span-2 lg:col-span-1">
              <span className="text-xs text-emerald-700 font-bold block flex items-center justify-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                نسبة التحصيل
              </span>
              <span className="text-xl sm:text-2xl font-black text-emerald-700 mt-1 block">
                {commercialSummary?.collection_rate ?? 0}%
              </span>
              <span className="text-[10px] text-slate-400 font-bold">
                {commercialSummary?.fully_paid_count ?? 0} مسدد / {commercialSummary?.unpaid_count ?? 0} متبقي
              </span>
            </div>
          </div>

          {/* Commercial Entities Table */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-700" />
                <h2 className="font-black text-slate-900 text-base">كشف ممارسات وتحصيل الجهات التجارية للفترة</h2>
              </div>
              <span className="text-xs text-slate-400 font-bold">
                عرض {filteredCommercialRecords.length} ممارسة تجارية
              </span>
            </div>

            {loadingCommercial ? (
              <div className="text-center py-16 text-slate-400 text-sm">
                <span className="w-8 h-8 inline-block rounded-full border-2 border-emerald-600 border-t-transparent animate-spin mb-2" />
                <div className="font-bold">جاري تحميل تقرير الجهات التجارية...</div>
              </div>
            ) : filteredCommercialRecords.length === 0 ? (
              <div className="text-center py-16 text-slate-400 text-xs">
                <Building2 className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                <p className="font-bold text-slate-600">لا توجد ممارسات تجارية مسجلة لهذه الفترة أو مطابقة للبحث</p>
                <p className="text-[11px] text-slate-400 mt-1">تأكد من اختيار الشهر الصحيح أو إضافة جهات تجارية من شاشة الأعضاء</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-700 font-black border-b border-slate-200">
                    <tr>
                      <th className="p-3.5 sm:p-4">الجهة / النشاط التجاري</th>
                      <th className="p-3.5 sm:p-4">بيانات التواصل</th>
                      <th className="p-3.5 sm:p-4 text-center">فترة الممارسة</th>
                      <th className="p-3.5 sm:p-4">المطلوب</th>
                      <th className="p-3.5 sm:p-4">المدفوع</th>
                      <th className="p-3.5 sm:p-4">المتبقي</th>
                      <th className="p-3.5 sm:p-4 text-center">حالة السداد</th>
                      <th className="p-3.5 sm:p-4 text-center">موقف الإيصال</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCommercialRecords.map((rec) => {
                      const isPaid = rec.payment_status === 'FULLY_PAID';
                      return (
                        <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3.5 sm:p-4 font-black text-slate-900">
                            <div className="flex items-center gap-2">
                              <span className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-900 flex items-center justify-center text-xs font-black shrink-0">
                                <Building2 className="w-3.5 h-3.5" />
                              </span>
                              <div>
                                <span className="block text-slate-900 font-black">{rec.member_name}</span>
                                <span className="block text-[10px] text-slate-400 font-bold">{rec.practice_type_name}</span>
                              </div>
                            </div>
                          </td>
                          <td className="p-3.5 sm:p-4 text-slate-600 font-bold">
                            <div>{rec.mobile_number || '-'}</div>
                            {rec.national_id && (
                              <div className="text-[10px] text-slate-400 font-normal">سجل/قومي: {rec.national_id}</div>
                            )}
                          </td>
                          <td className="p-3.5 sm:p-4 text-center font-bold text-slate-700">
                            <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-800 text-[11px]">
                              {rec.month} / {rec.year}
                            </span>
                          </td>
                          <td className="p-3.5 sm:p-4 font-bold text-slate-800">{rec.required_amount} ج.م</td>
                          <td className="p-3.5 sm:p-4 font-black text-emerald-800">{rec.total_paid} ج.م</td>
                          <td className="p-3.5 sm:p-4 font-black text-amber-600">{rec.remaining_amount} ج.م</td>
                          <td className="p-3.5 sm:p-4 text-center">
                            {isPaid ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" />
                                مسدد بالكامل
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-amber-100 text-amber-800 border border-amber-200">
                                <AlertCircle className="w-3 h-3" />
                                متبقي مبالغ
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 sm:p-4 text-center">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                                rec.receipt_status === 'DELIVERED'
                                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                  : rec.receipt_status === 'RECEIVED'
                                  ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                  : 'bg-slate-100 text-slate-600 border border-slate-200'
                              }`}
                            >
                              <ReceiptIcon className="w-3 h-3" />
                              {rec.receipt_status_display}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
