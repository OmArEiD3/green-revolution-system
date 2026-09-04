import React, { useState, useEffect } from 'react';
import { ShieldCheck, ArrowUpRight, Plus, TrendingDown } from 'lucide-react';
import { Expense, FinancialTransaction } from '../types';
import { expensesApi, financialApi } from '../api/client';

interface FinancialsViewProps {
  year: number;
  month: number;
  onOpenAddExpense: () => void;
}

export const FinancialsView: React.FC<FinancialsViewProps> = ({
  year,
  month,
  onOpenAddExpense,
}) => {
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

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      financialApi.transactions({ type: 'OVERPAYMENT', year, month }),
      expensesApi.list({ year, month }),
      financialApi.transactions({ year, month }),
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
  }, [year, month]);

  const totalOver = overpayments.reduce((acc, tx) => acc + Number(tx.amount), 0);
  const totalExp = expenses.reduce((acc, ex) => acc + Number(ex.amount), 0);

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

  const monthNames = [
    '', 'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];

  return (
    <div className="space-y-4 animate-slide-up">
      {/* Header & Mini Stats */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-emerald-700" />
              <span>الماليات ودفتر الأستاذ (Financial Ledger)</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              شهر {monthNames[month]} {year} — المبالغ الزائدة والمصروفات وحركات الصندوق المالي
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowManualModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-blue-50 text-blue-800 hover:bg-blue-100 font-bold text-xs border border-blue-200 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>+ زيادة مستقلة</span>
            </button>
            <button
              onClick={onOpenAddExpense}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-black text-white font-black text-xs shadow-md transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>+ إضافة مصروف</span>
            </button>
          </div>
        </div>

        {/* Financial Summary Ribbon */}
        <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center">
          <div>
            <span className="text-xs text-blue-700 font-bold block flex items-center justify-center gap-1">
              <ArrowUpRight className="w-4 h-4" />
              إجمالي المبالغ الزائدة
            </span>
            <span className="text-xl sm:text-2xl font-black text-blue-900 mt-1 block">{totalOver.toFixed(2)} ج.م</span>
          </div>
          <div>
            <span className="text-xs text-rose-700 font-bold block flex items-center justify-center gap-1">
              <TrendingDown className="w-4 h-4" />
              إجمالي المصروفات
            </span>
            <span className="text-xl sm:text-2xl font-black text-rose-900 mt-1 block">{totalExp.toFixed(2)} ج.م</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm text-xs font-black">
        {[
          { id: 'overpayments', label: `المبالغ الزائدة (${overpayments.length})` },
          { id: 'expenses', label: `المصروفات (${expenses.length})` },
          { id: 'ledger', label: `دفتر الحركات المالية (${ledger.length})` },
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
            <div className="text-center py-16 text-slate-400 text-sm bg-white rounded-3xl border border-slate-200">
              جاري التحميل...
            </div>
          ) : overpayments.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-300 text-slate-400 text-xs">
              لا توجد مبالغ زائدة مسجلة في هذا الشهر
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {overpayments.map((tx) => (
                <div key={tx.id} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-black text-slate-900 text-base">
                        {tx.member_name ? tx.member_name : tx.source_payer_name}
                      </h3>
                      <span className="text-xs text-slate-500 font-bold">
                        {tx.street_number ? `شارع ${tx.street_number}` : 'مصدر خارجي'}
                      </span>
                    </div>

                    <span className="px-3.5 py-1.5 rounded-2xl bg-blue-50 text-blue-900 font-black text-sm border border-blue-200">
                      +{tx.amount} ج.م
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    {tx.description || 'مبلغ زائد مسجل مع التحصيل'}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                    <span>التاريخ: {tx.transaction_date}</span>
                    <span>طريقة الدفع: {tx.payment_method === 'CASH' ? 'نقدي' : 'تحويل'}</span>
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
            <div className="text-center py-16 text-slate-400 text-sm bg-white rounded-3xl border border-slate-200">
              جاري التحميل...
            </div>
          ) : expenses.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-300 text-slate-400 text-xs">
              لا توجد مصروفات مسجلة في هذا الشهر
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {expenses.map((ex) => (
                <div key={ex.id} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-black text-slate-900 text-base">{ex.title}</h3>
                      <span className="text-xs text-slate-500 font-bold">تاريخ: {ex.expense_date}</span>
                    </div>

                    <span className="px-3.5 py-1.5 rounded-2xl bg-rose-50 text-rose-900 font-black text-sm border border-rose-200">
                      -{ex.amount} ج.م
                    </span>
                  </div>

                  {ex.description && (
                    <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      {ex.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                    <span>طريقة الدفع: {ex.payment_method === 'CASH' ? 'نقدي' : 'تحويل'}</span>
                    {ex.document_image && (
                      <a
                        href={ex.document_image}
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-700 font-bold underline"
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
                {ledger.map((tx) => (
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
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Record Manual Overpayment Modal */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-slide-up">
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
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 outline-none text-xs font-semibold"
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
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 outline-none text-sm font-black text-blue-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">طريقة الدفع</label>
                  <select
                    value={manualMethod}
                    onChange={(e) => setManualMethod(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 outline-none text-xs font-bold"
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
                  className="w-full px-4 py-2 rounded-xl border border-slate-300 outline-none text-xs font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-black text-xs shadow-md"
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
