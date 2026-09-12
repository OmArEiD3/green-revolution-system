import React, { useState, useEffect } from 'react';
import { X, Check, CalendarPlus } from 'lucide-react';
import { Practice, PracticeType } from '../../types';
import { practicesApi, practiceTypesApi } from '../../api/client';
import { ModalBaseProps } from './shared';

interface EditPracticeModalProps extends ModalBaseProps {
  practice: Practice | null;
}

export const EditPracticeModal: React.FC<EditPracticeModalProps> = ({ isOpen, onClose, onSuccess, practice }) => {
  const [practiceTypes, setPracticeTypes] = useState<PracticeType[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState<number | string>('');
  const [selectedMonth, setSelectedMonth] = useState<number>(1);
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [requiredAmount, setRequiredAmount] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    if (isOpen) {
      practiceTypesApi.list().then(setPracticeTypes).catch(console.error);
    }
  }, [isOpen]);

  useEffect(() => {
    if (practice) {
      setSelectedTypeId(practice.practice_type);
      setSelectedMonth(practice.month);
      setSelectedYear(practice.year);
      setRequiredAmount(String(practice.required_amount));
      setNotes(practice.notes || '');
      setError('');
      setConfirmingDelete(false);
    }
  }, [practice]);

  if (!isOpen || !practice) return null;

  const months = [
    { value: 1, label: 'يناير' }, { value: 2, label: 'فبراير' }, { value: 3, label: 'مارس' },
    { value: 4, label: 'أبريل' }, { value: 5, label: 'مايو' }, { value: 6, label: 'يونيو' },
    { value: 7, label: 'يوليو' }, { value: 8, label: 'أغسطس' }, { value: 9, label: 'سبتمبر' },
    { value: 10, label: 'أكتوبر' }, { value: 11, label: 'نوفمبر' }, { value: 12, label: 'ديسمبر' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requiredAmount || Number(requiredAmount) <= 0) {
      setError('يرجى كتابة قيمة الممارسة بشكل صحيح');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await practicesApi.update(practice.id, {
        practice_type: Number(selectedTypeId),
        year: selectedYear,
        month: selectedMonth,
        required_amount: Number(requiredAmount),
        notes,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'حدث خطأ أثناء تعديل الممارسة');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setError('');
    try {
      await practicesApi.delete(practice.id);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'حدث خطأ أثناء حذف الممارسة');
      setConfirmingDelete(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-7 shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto animate-slide-up">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
          <div className="flex items-center gap-2.5 text-emerald-800 font-black text-lg">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <CalendarPlus className="w-5 h-5 text-emerald-700" />
            </div>
            <span>تعديل ممارسة: {practice.member_name}</span>
          </div>
          <button onClick={onClose} className="p-2 rounded-2xl hover:bg-slate-100 text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && <div className="p-3.5 mb-4 text-xs font-bold text-rose-800 bg-rose-50 rounded-2xl border border-rose-200">{error}</div>}

        {Number(practice.total_paid) > 0 && (
          <div className="p-3 mb-4 text-[11px] font-bold text-amber-800 bg-amber-50 rounded-2xl border border-amber-200">
            ⚠️ يوجد بالفعل دفعات مسجلة على هذه الممارسة بقيمة {practice.total_paid} ج.م. تعديل المبلغ المطلوب لن يمس الدفعات المسجلة، لكن لا يمكن حذف الممارسة إلا بعد إلغاء هذه الدفعات أولاً.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-right">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">الشهر *</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-2xl border border-slate-300 focus:ring-4 focus:ring-emerald-500/15 focus:border-emerald-600 outline-none text-sm font-bold bg-white"
              >
                {months.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label} (شهر {m.value})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">السنة *</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-2xl border border-slate-300 focus:ring-4 focus:ring-emerald-500/15 focus:border-emerald-600 outline-none text-sm font-bold bg-white"
              >
                {[2025, 2026, 2027, 2028, 2029, 2030].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">نوع الممارسة</label>
            <select
              value={selectedTypeId}
              onChange={(e) => setSelectedTypeId(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border border-slate-300 focus:ring-4 focus:ring-emerald-500/15 focus:border-emerald-600 outline-none text-sm font-semibold bg-white"
            >
              {practiceTypes.map((pt) => (
                <option key={pt.id} value={pt.id}>
                  {pt.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">قيمة الممارسة (ج.م) *</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={requiredAmount}
              onChange={(e) => setRequiredAmount(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border border-slate-300 focus:ring-4 focus:ring-emerald-500/15 focus:border-emerald-600 outline-none text-xl font-black text-emerald-900 bg-emerald-50/30"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">ملاحظات (اختياري)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-4 py-2.5 rounded-2xl border border-slate-300 outline-none text-xs font-medium"
            />
          </div>

          <div className="flex items-center justify-between gap-2.5 pt-4 border-t border-slate-100">
            <div>
              {!confirmingDelete ? (
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(true)}
                  className="px-4 py-2.5 rounded-2xl border border-rose-200 text-rose-700 font-bold text-xs hover:bg-rose-50"
                >
                  حذف الممارسة
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-rose-700">متأكد من الحذف؟</span>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs disabled:opacity-50"
                  >
                    {deleting ? 'جاري الحذف...' : 'نعم، احذف'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(false)}
                    className="px-3 py-2 rounded-xl border border-slate-300 text-slate-600 font-bold text-xs"
                  >
                    تراجع
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2.5">
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
                className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs sm:text-sm shadow-md shadow-emerald-900/20 flex items-center gap-2 disabled:opacity-50"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>{loading ? 'جاري الحفظ...' : 'حفظ التعديلات'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
