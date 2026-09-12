import React, { useState, useEffect } from 'react';
import { ShieldCheck, ArrowUpRight, Plus, TrendingDown, Calendar, Search, FileText, Sparkles, Filter } from 'lucide-react';
import { Expense, FinancialTransaction } from '../types';
import { expensesApi, financialApi } from '../api/client';

interface FinancialsViewProps {
  year: number;
  month: number;
  onOpenAddExpense: () => void;
}

const MONTH_NAMES = [
  '', 'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

export const FinancialsView: React.FC<FinancialsViewProps> = ({
  year: initialYear,
  month: initialMonth,
  onOpenAddExpense,
}) => {
  const [selectedYear, setSelectedYear] = useState<number>(initialYear);
  const [selectedMonth, setSelectedMonth] = useState<number | ''>(initialMonth);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');

  const [activeTab, setActiveTab] = useState<'overpayments' | 'expenses' | 'ledger'>('overpayments');
  const [overpayments, setOverpayments] = useState<FinancialTransaction[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [ledger, setLedger] = useState<FinancialTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Manual overpayment modal
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualAmount, setManualAmount] = useState('');
  const [manualSource, setManualSource] = useState('');
  const [manualDesc, setManualDesc] = useState('');
  const [manualMethod, setManualMethod] = useState('CASH');

  // Sync with props
  useEffect(() => {
    setSelectedYear(initialYear);
    setSelectedMonth(initialMonth);
  }, [initialYear, initialMonth]);

  const fetchData = () => {
    setLoading(true);
    const filterParams: Record<string, any> = {};
    if (dateFrom || dateTo) {
      if (dateFrom) filterParams.date_from = dateFrom;
      if (dateTo) filterParams.date_to = dateTo;
    } else {
      if (selectedYear) filterParams.year = selectedYear;
      if (selectedMonth !== '') filterParams.month = selectedMonth;
    }

    Promise.all([
      financialApi.transactions({ type: 'OVERPAYMENT', ...filterParams }),
      expensesApi.list(filterParams),
      financialApi.transactions(filterParams),
    ])
      .then(([overRes, expRes, ledRes]) => {
        setOverpayments(overRes);
        setExpenses(expRes);
        setLedger(ledRes);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, [selectedYear, selectedMonth, dateFrom, dateTo]);

  const totalOver = overpayments.reduce((acc, tx) => acc + Number(tx.amount), 0);
  const totalExp = expenses.reduce((acc, ex) => acc + Number(ex.amount), 0);
  const netFund = totalOver - totalExp;

  const handleManualOverpayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualAmount || !manualSource) return;
    try {
      await financialApi.recordManualOverpayment({
        amount: Number(manualAmount),
        source_name: manualSource,
        payment_method: manualMethod,
        description: manualDesc,
      });
      setShowManualModal(false);
      setManualAmount('');
      setManualSource('');
      setManualDesc('');
      fetchData();
    } catch {
      alert('حدث خطأ أثناء حفظ المبلغ الزائد');
    }
  };

  const filteredOverpayments = overpayments.filter((tx) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      (tx.member_name && tx.member_name.toLowerCase().includes(term)) ||
      (tx.source_payer_name && tx.source_payer_name.toLowerCase().includes(term)) ||
      (tx.description && tx.description.toLowerCase().includes(term))
    );
  });

  const filteredExpenses = expenses.filter((ex) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      ex.title.toLowerCase().includes(term) ||
      (ex.description && ex.description.toLowerCase().includes(term))
    );
  });

  const filteredLedger = ledger.filter((tx) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      (tx.member_name && tx.member_name.toLowerCase().includes(term)) ||
      (tx.source_payer_name && tx.source_payer_name.toLowerCase().includes(term)) ||
      (tx.description && tx.description.toLowerCase().includes(term)) ||
      tx.transaction_type_display.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-4 sm:space-y-5 animate-slide-up">
      {/* Header & Mini Stats */}
      <div className="bg-white/95 backdrop-blur-md p-4 sm:p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-2xl bg-emerald-700 text-white flex items-center justify-center shadow-md shadow-emerald-900/20">
                <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
                  <span>الماليات ودفتر الأستاذ (Financial Ledger)</span>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {dateFrom || dateTo
                      ? `فترة مخصصة: ${dateFrom || '...'} إلى ${dateTo || '...'}`
                      : selectedMonth !== ''
                      ? `شهر ${MONTH_NAMES[selectedMonth]} ${selectedYear}`
                      : `عام ${selectedYear}`}
                  </span>
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  إدارة المبالغ الزائدة، توثيق المصروفات، ودفتر حركات الصندوق المالي
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            <button
              onClick={() => setShowManualModal(true)}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-blue-50 text-blue-900 hover:bg-blue-100 font-black text-xs border border-blue-200 transition-all active:scale-95 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>+ زيادة مستقلة</span>
            </button>
            <button
              onClick={onOpenAddExpense}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-black text-white font-black text-xs shadow-md transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>+ إضافة مصروف</span>
            </button>
          </div>
        </div>

        {/* Financial Summary Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50/90 p-4 rounded-2xl border border-slate-200/80 text-center">
          <div className="p-1">
            <span className="text-xs text-blue-700 font-bold flex items-center justify-center gap-1">
              <ArrowUpRight className="w-4 h-4" />
              إجمالي الزيادات
            </span>
            <span className="text-lg sm:text-2xl font-black text-blue-950 mt-1 block">{totalOver.toFixed(2)} ج.م</span>
          </div>
          <div className="p-1 border-x border-slate-200/80">
            <span className="text-xs text-rose-700 font-bold flex items-center justify-center gap-1">
              <TrendingDown className="w-4 h-4" />
              إجمالي المصروفات
            </span>
            <span className="text-lg sm:text-2xl font-black text-rose-950 mt-1 block">{totalExp.toFixed(2)} ج.م</span>
          </div>
          <div className="col-span-2 sm:col-span-1 p-1 pt-2 sm:pt-1 border-t sm:border-t-0 border-slate-200/80">
            <span className="text-xs text-emerald-800 font-bold flex items-center justify-center gap-1">
              <Sparkles className="w-4 h-4" />
              صافي الصندوق
            </span>
            <span className={`text-lg sm:text-2xl font-black mt-1 block ${netFund >= 0 ? 'text-emerald-800' : 'text-rose-700'}`}>
              {netFund.toFixed(2)} ج.م
            </span>
          </div>
        </div>
      </div>

      {/* Date Filter & Search Controls */}
      <div className="bg-white/95 backdrop-blur-md p-3.5 sm:p-4 rounded-3xl border border-slate-200/90 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 pb-2.5 border-b border-slate-100">
          <div className="flex items-center gap-1.5 text-xs font-black text-slate-700 shrink-0">
            <Calendar className="w-4 h-4 text-emerald-700" />
            <span>فلترة التاريخ:</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Month Filter */}
            <select
              value={selectedMonth}
              onChange={(e) => {
                setDateFrom('');
                setDateTo('');
                setSelectedMonth(e.target.value === '' ? '' : Number(e.target.value));
              }}
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
              onChange={(e) => {
                setDateFrom('');
                setDateTo('');
                setSelectedYear(Number(e.target.value));
              }}
              className="px-3 py-1.5 bg-emerald-50/60 hover:bg-emerald-50 text-emerald-950 rounded-xl border border-emerald-300 font-black text-xs outline-none cursor-pointer focus:ring-2 focus:ring-emerald-500"
            >
              {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map((y) => (
                <option key={y} value={y}>
                  سنة {y}
                </option>
              ))}
            </select>

            {/* Quick shortcuts */}
            <button
              onClick={() => {
                const now = new Date();
                setDateFrom('');
                setDateTo('');
                setSelectedYear(now.getFullYear());
                setSelectedMonth(now.getMonth() + 1);
              }}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-900 rounded-xl font-bold text-xs transition-colors"
            >
              الشهر الحالي
            </button>
            <button
              onClick={() => {
                setDateFrom('');
                setDateTo('');
                setSelectedMonth('');
              }}
              className={`px-2.5 py-1.5 rounded-xl font-bold text-xs transition-colors ${
                selectedMonth === '' && !dateFrom && !dateTo
                  ? 'bg-emerald-700 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              كل الشهور لسنة {selectedYear}
            </button>
          </div>
        </div>

        {/* Custom Date Range & Search */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-emerald-700 absolute right-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث في البيان أو اسم الشخص..."
              className="w-full pr-10 pl-4 py-2 bg-slate-50/80 rounded-2xl border border-slate-300 outline-none text-xs sm:text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 shadow-sm"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50/80 px-3 py-1.5 rounded-2xl border border-slate-300">
            <span className="text-[11px] font-bold text-slate-500 shrink-0">من تاريخ:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full bg-transparent text-xs font-bold text-slate-800 outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50/80 px-3 py-1.5 rounded-2xl border border-slate-300">
            <span className="text-[11px] font-bold text-slate-500 shrink-0">إلى تاريخ:</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full bg-transparent text-xs font-bold text-slate-800 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 bg-white/95 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200/90 shadow-sm text-xs font-black">
        {[
          { id: 'overpayments', label: `المبالغ الزائدة (${filteredOverpayments.length})` },
          { id: 'expenses', label: `المصروفات (${filteredExpenses.length})` },
          { id: 'ledger', label: `دفتر الحركات المالية (${filteredLedger.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-2.5 px-3 rounded-xl transition-all ${
              activeTab === tab.id ? 'bg-emerald-800 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Overpayments */}
      {activeTab === 'overpayments' && (
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-20 text-slate-400 text-sm bg-white/90 rounded-3xl border border-slate-200">
              <div className="flex flex-col items-center gap-2">
                <span className="w-8 h-8 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
                <span className="font-bold">جاري تحميل المبالغ الزائدة...</span>
              </div>
            </div>
          ) : filteredOverpayments.length === 0 ? (
            <div className="text-center py-16 bg-white/90 rounded-3xl border border-dashed border-slate-300 text-slate-400 text-xs font-bold">
              لا توجد مبالغ زائدة مسجلة للفترة المحددة
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredOverpayments.map((tx) => (
                <div key={tx.id} className="card-hover-effect bg-white p-5 rounded-3xl border border-slate-200/90 shadow-sm space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-black text-slate-900 text-base line-clamp-1">
                        {tx.member_name ? tx.member_name : tx.source_payer_name}
                      </h3>
                      <span className="text-xs text-slate-500 font-bold">
                        {tx.street_number ? `شارع ${tx.street_number}` : 'مصدر خارجي'}
                      </span>
                    </div>

                    <span className="px-3.5 py-1.5 rounded-2xl bg-blue-50 text-blue-900 font-black text-sm border border-blue-200 shadow-sm shrink-0">
                      +{tx.amount} ج.م
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-2xl border border-slate-100 min-h-[48px]">
                    {tx.description || 'مبلغ زائد مسجل مع التحصيل'}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2.5 border-t border-slate-100">
                    <span className="font-mono">التاريخ: {tx.transaction_date}</span>
                    <span className="font-semibold">طريقة الدفع: {tx.payment_method === 'CASH' ? 'نقدي' : 'تحويل'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Expenses */}
      {activeTab === 'expenses' && (
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-20 text-slate-400 text-sm bg-white/90 rounded-3xl border border-slate-200">
              <div className="flex flex-col items-center gap-2">
                <span className="w-8 h-8 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
                <span className="font-bold">جاري تحميل المصروفات...</span>
              </div>
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="text-center py-16 bg-white/90 rounded-3xl border border-dashed border-slate-300 text-slate-400 text-xs font-bold">
              لا توجد مصروفات مسجلة للفترة المحددة
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredExpenses.map((ex) => (
                <div key={ex.id} className="card-hover-effect bg-white p-5 rounded-3xl border border-slate-200/90 shadow-sm space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-black text-slate-900 text-base line-clamp-1">{ex.title}</h3>
                      <span className="text-xs text-slate-500 font-bold font-mono">تاريخ: {ex.expense_date}</span>
                    </div>

                    <span className="px-3.5 py-1.5 rounded-2xl bg-rose-50 text-rose-900 font-black text-sm border border-rose-200 shadow-sm shrink-0">
                      -{ex.amount} ج.م
                    </span>
                  </div>

                  {ex.description ? (
                    <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-2xl border border-slate-100 min-h-[48px]">
                      {ex.description}
                    </p>
                  ) : (
                    <div className="min-h-[48px] flex items-center text-slate-400 text-xs italic">بدون تفاصيل إضافية</div>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2.5 border-t border-slate-100">
                    <span className="font-semibold">طريقة الدفع: {ex.payment_method === 'CASH' ? 'نقدي' : 'تحويل'}</span>
                    {ex.document_image && (
                      <a
                        href={ex.document_image}
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-700 font-black underline hover:text-emerald-900"
                      >
                        عرض الفاتورة
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Complete Ledger */}
      {activeTab === 'ledger' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-black">
                <tr>
                  <th className="p-3.5">نوع المعاملة</th>
                  <th className="p-3.5">المبلغ</th>
                  <th className="p-3.5">البيان / العضو</th>
                  <th className="p-3.5">التاريخ</th>
                  <th className="p-3.5">طريقة الدفع</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLedger.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-slate-400 font-bold">
                      لا توجد حركات مالية مسجلة في هذا النطاق
                    </td>
                  </tr>
                ) : (
                  filteredLedger.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5">
                        <span
                          className={`px-2.5 py-1 rounded-full font-black text-[10px] ${
                            tx.transaction_type === 'PRACTICE_COLLECTION'
                              ? 'bg-emerald-100 text-emerald-800'
                              : tx.transaction_type === 'OVERPAYMENT'
                              ? 'bg-blue-100 text-blue-800'
                              : tx.transaction_type === 'EXPENSE'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          {tx.transaction_type_display}
                        </span>
                      </td>
                      <td className="p-3.5 font-black text-slate-900">{tx.amount} ج.م</td>
                      <td className="p-3.5 text-slate-700 font-medium">
                        {tx.member_name ? `${tx.member_name} (شارع ${tx.street_number})` : tx.source_payer_name || tx.description}
                      </td>
                      <td className="p-3.5 text-slate-500 font-mono">{tx.transaction_date}</td>
                      <td className="p-3.5 text-slate-600 font-semibold">{tx.payment_method === 'CASH' ? 'نقدي' : 'إلكتروني'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Record Manual Overpayment Modal */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-100 animate-slide-up">
            <h3 className="font-black text-slate-900 text-base mb-4 border-b pb-3">تسجيل مبلغ زائد مستقل</h3>
            <form onSubmit={handleManualOverpayment} className="space-y-4 text-right">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم الدافع / الجهة *</label>
                <input
                  type="text"
                  required
                  value={manualSource}
                  onChange={(e) => setManualSource(e.target.value)}
                  placeholder="مثال: جهة صيانة، شخص زائر..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 outline-none text-xs font-semibold focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">المبلغ (ج.م) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={manualAmount}
                    onChange={(e) => setManualAmount(e.target.value)}
                    placeholder="40"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 outline-none text-sm font-black text-blue-900 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">طريقة الدفع</label>
                  <select
                    value={manualMethod}
                    onChange={(e) => setManualMethod(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 outline-none text-xs font-bold focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="CASH">نقدي</option>
                    <option value="BANK_TRANSFER">تحويل بنكي</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">بيان / وصف</label>
                <textarea
                  value={manualDesc}
                  onChange={(e) => setManualDesc(e.target.value)}
                  rows={2}
                  placeholder="سبب الزيادة وتفاصيلها..."
                  className="w-full px-4 py-2 rounded-xl border border-slate-300 outline-none text-xs font-medium focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-black text-xs shadow-md active:scale-95 transition-all"
                >
                  حفظ الزيادة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

