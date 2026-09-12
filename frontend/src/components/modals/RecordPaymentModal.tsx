import React, { useState, useEffect } from 'react';
import { X, Check, DollarSign, ArrowUpRight } from 'lucide-react';
import { Member, Practice } from '../../types';
import { membersApi, practicesApi, paymentsApi } from '../../api/client';
import { ModalBaseProps } from './shared';

interface RecordPaymentModalProps extends ModalBaseProps {
  initialPracticeId?: number;
  initialMemberId?: number;
  year?: number;
  month?: number;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialPracticeId,
  initialMemberId,
  year = 2026,
  month = 9,
}) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<number | string>(initialMemberId || '');
  const [practices, setPractices] = useState<Practice[]>([]);
  const [selectedPracticeId, setSelectedPracticeId] = useState<number | string>(initialPracticeId || '');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'OTHER'>('CASH');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setNotes('');
      setPaymentMethod('CASH');
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setError('');
      membersApi.list().then(setMembers).catch(console.error);
    }
  }, [isOpen]);

  useEffect(() => {
    if (initialMemberId) setSelectedMemberId(initialMemberId);
    if (initialPracticeId) setSelectedPracticeId(initialPracticeId);
  }, [initialMemberId, initialPracticeId]);

  useEffect(() => {
    if (selectedMemberId) {
      practicesApi
        .list({ member_id: Number(selectedMemberId), year, month })
        .then((data) => {
          setPractices(data);
          if (data.length > 0 && !selectedPracticeId) {
            setSelectedPracticeId(data[0].id);
            setAmount(data[0].remaining_amount !== '0.00' ? data[0].remaining_amount : data[0].required_amount);
          }
        })
        .catch(console.error);
    } else {
      setPractices([]);
    }
  }, [selectedMemberId, year, month]);

  useEffect(() => {
    if (selectedPracticeId && practices.length > 0) {
      const p = practices.find((item) => item.id === Number(selectedPracticeId));
      if (p) {
        setAmount(p.remaining_amount !== '0.00' ? p.remaining_amount : p.required_amount);
      }
    }
  }, [selectedPracticeId]);

  if (!isOpen) return null;

  const currentSelectedPractice = practices.find((p) => p.id === Number(selectedPracticeId));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPracticeId || !amount || Number(amount) <= 0) {
      setError('يرجى اختيار الممارسة وتحديد المبلغ بشكل صحيح');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await paymentsApi.create({
        practice: Number(selectedPracticeId),
        amount: Number(amount),
        payment_date: paymentDate,
        payment_method: paymentMethod,
        notes,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'حدث خطأ أثناء تسجيل الدفعة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-7 shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto animate-slide-up">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
          <div className="flex items-center gap-2.5 text-emerald-800 font-black text-lg">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-emerald-700" />
            </div>
            <span>تسجيل تحصيل الممارسة</span>
          </div>
          <button onClick={onClose} className="p-2 rounded-2xl hover:bg-slate-100 text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && <div className="p-3.5 mb-4 text-xs font-bold text-rose-800 bg-rose-50 rounded-2xl border border-rose-200">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4 text-right">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">اختيار العضو *</label>
            <select
              value={selectedMemberId}
              onChange={(e) => {
                setSelectedMemberId(e.target.value);
                setSelectedPracticeId('');
              }}
              className="w-full px-4 py-3 rounded-2xl border border-slate-300 focus:ring-4 focus:ring-emerald-500/15 focus:border-emerald-600 outline-none text-sm font-bold bg-white"
            >
              <option value="">-- اختر العضو من القائمة --</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name} (شارع {m.street_number})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              الممارسة المستحقة ({month}/{year}) *
            </label>
            {practices.length === 0 ? (
              <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-xs font-semibold text-amber-900">
                لا توجد ممارسات مسجلة لهذا العضو في هذا الشهر. يمكنك إضافة ممارسة أولاً.
              </div>
            ) : (
              <select
                value={selectedPracticeId}
                onChange={(e) => setSelectedPracticeId(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-slate-300 focus:ring-4 focus:ring-emerald-500/15 focus:border-emerald-600 outline-none text-sm font-bold bg-white"
              >
                {practices.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.practice_type_name} — قيمة الممارسة: {p.required_amount} ج.م
                  </option>
                ))}
              </select>
            )}
          </div>

          {currentSelectedPractice && (
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 grid grid-cols-2 gap-2 text-center text-xs">
              <div>
                <span className="text-slate-400 block font-semibold">قيمة الممارسة المطلوبة</span>
                <span className="font-black text-slate-900 text-sm">{currentSelectedPractice.required_amount} ج.م</span>
              </div>
              <div>
                <span className="text-emerald-700 block font-semibold">المبلغ المسدد</span>
                <span className="font-black text-emerald-800 text-sm">{currentSelectedPractice.total_paid} ج.م</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">المبلغ المدفوع (ج.م) *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="560"
                className="w-full px-4 py-3 rounded-2xl border border-slate-300 focus:ring-4 focus:ring-emerald-500/15 focus:border-emerald-600 outline-none text-lg font-black text-emerald-900"
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
                <option value="BANK_TRANSFER">تحويل بنكي / فودافون كاش</option>
                <option value="CHEQUE">شيك</option>
                <option value="OTHER">أخرى</option>
              </select>
            </div>
          </div>

          {currentSelectedPractice && Number(amount) > Number(currentSelectedPractice.required_amount) && (
            <div className="p-3.5 bg-blue-50 rounded-2xl border border-blue-200 text-xs text-blue-900 flex items-center gap-2 animate-slide-up">
              <ArrowUpRight className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <span>
                تنبيه: المبلغ المدفوع يتجاوز قيمة الممارسة بـ{' '}
                <strong>{(Number(amount) - Number(currentSelectedPractice.required_amount)).toFixed(2)} ج.م</strong>. سيتم
                تسجيل الفارق تلقائياً في <strong>المبالغ الزائدة</strong>.
              </span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">تاريخ الدفع</label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl border border-slate-300 text-xs font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">ملاحظات (اختياري)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="أي تفاصيل إضافية عن الدفعة..."
              className="w-full px-4 py-2.5 rounded-2xl border border-slate-300 text-xs font-semibold resize-none focus:ring-4 focus:ring-emerald-500/15 focus:border-emerald-600 outline-none"
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
              disabled={loading || !selectedPracticeId}
              className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs sm:text-sm shadow-md shadow-emerald-900/20 flex items-center gap-2 disabled:opacity-50"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>{loading ? 'جاري التسجيل...' : 'حفظ وسداد الممارسة'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
