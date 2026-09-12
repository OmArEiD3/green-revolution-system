import React, { useState, useEffect } from 'react';
import { X, Check, Receipt } from 'lucide-react';
import { expensesApi } from '../../api/client';
import { ModalBaseProps } from './shared';

export const AddExpenseModal: React.FC<ModalBaseProps> = ({ isOpen, onClose, onSuccess }) => {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK_TRANSFER' | 'OTHER'>('CASH');
  const [description, setDescription] = useState('');
  const [documentImage, setDocumentImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Always start from a clean, empty form whenever this modal is opened,
  // so a previously-added expense's data never lingers into the next one.
  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setAmount('');
      setExpenseDate(new Date().toISOString().split('T')[0]);
      setPaymentMethod('CASH');
      setDescription('');
      setDocumentImage(null);
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !amount || Number(amount) <= 0) {
      setError('يرجى تحديد عنوان وقيمة المصروف');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('amount', amount);
      formData.append('expense_date', expenseDate);
      formData.append('payment_method', paymentMethod);
      if (description) formData.append('description', description);
      if (documentImage) formData.append('document_image', documentImage);

      await expensesApi.create(formData);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'حدث خطأ أثناء حفظ المصروف');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-7 shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto animate-slide-up">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
          <div className="flex items-center gap-2.5 text-slate-900 font-black text-lg">
            <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-800 flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
            <span>تسجيل مصروف جديد</span>
          </div>
          <button onClick={onClose} className="p-2 rounded-2xl hover:bg-slate-100 text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && <div className="p-3.5 mb-4 text-xs font-bold text-rose-800 bg-rose-50 rounded-2xl border border-rose-200">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4 text-right">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">اسم / بيان المصروف *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: بنزين صيانة، لوحة كهرباء شارع 7..."
              className="w-full px-4 py-3 rounded-2xl border border-slate-300 focus:ring-4 focus:ring-emerald-500/15 focus:border-emerald-600 outline-none text-sm font-semibold"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">القيمة (ج.م) *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="250"
                className="w-full px-4 py-3 rounded-2xl border border-slate-300 focus:ring-4 focus:ring-emerald-500/15 focus:border-emerald-600 outline-none text-lg font-black text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">طريقة الدفع *</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full px-4 py-3 rounded-2xl border border-slate-300 focus:ring-4 focus:ring-emerald-500/15 focus:border-emerald-600 outline-none text-sm font-bold bg-white"
              >
                <option value="CASH">نقدي (Cash)</option>
                <option value="BANK_TRANSFER">تحويل بنكي / إلكتروني</option>
                <option value="OTHER">أخرى</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">تاريخ المصروف</label>
            <input
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl border border-slate-300 text-xs font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">الوصف والتفاصيل (اختياري)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="تفاصيل إضافية عن المصروف..."
              className="w-full px-4 py-2.5 rounded-2xl border border-slate-300 text-xs font-semibold resize-none focus:ring-4 focus:ring-emerald-500/15 focus:border-emerald-600 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">صورة الفاتورة أو المستند (اختياري)</label>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => setDocumentImage(e.target.files ? e.target.files[0] : null)}
              className="w-full text-xs text-slate-500 file:ml-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-emerald-50 file:text-emerald-800 hover:file:bg-emerald-100"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-2xl border border-slate-300 text-slate-600 font-bold text-xs hover:bg-slate-50"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-2xl bg-slate-900 hover:bg-black text-white font-black text-xs sm:text-sm shadow-md flex items-center gap-2 disabled:opacity-50"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>{loading ? 'جاري الحفظ...' : 'حفظ المصروف'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
