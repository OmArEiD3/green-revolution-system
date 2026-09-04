import React, { useState, useEffect } from 'react';
import { X, Check, DollarSign, UserPlus, Receipt, ArrowUpRight, CalendarPlus } from 'lucide-react';
import { Member, Practice, PracticeType } from '../types';
import { membersApi, practicesApi, paymentsApi, practiceTypesApi, expensesApi } from '../api/client';

interface ModalBaseProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// 1. Add Member Modal
export const AddMemberModal: React.FC<ModalBaseProps> = ({ isOpen, onClose, onSuccess }) => {
  const [fullName, setFullName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [streetNumber, setStreetNumber] = useState(1);
  const [hasGuard, setHasGuard] = useState(false);
  const [guardName, setGuardName] = useState('');
  const [guardMobile, setGuardMobile] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !mobileNumber.trim()) {
      setError('يرجى ملء الاسم ورقم الموبايل');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await membersApi.create({
        full_name: fullName,
        mobile_number: mobileNumber,
        national_id: nationalId,
        street_number: Number(streetNumber),
        has_guard: hasGuard,
        guard_name: hasGuard ? guardName : '',
        guard_mobile: hasGuard ? guardMobile : '',
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'حدث خطأ أثناء إضافة العضو');
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
              <UserPlus className="w-5 h-5 text-emerald-700" />
            </div>
            <span>إضافة عضو جديد بالمنطقة</span>
          </div>
          <button onClick={onClose} className="p-2 rounded-2xl hover:bg-slate-100 text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && <div className="p-3.5 mb-4 text-xs font-bold text-rose-800 bg-rose-50 rounded-2xl border border-rose-200">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4 text-right">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">الاسم بالكامل *</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="مثال: أحمد محمد السيد"
              className="w-full px-4 py-3 rounded-2xl border border-slate-300 focus:ring-4 focus:ring-emerald-500/15 focus:border-emerald-600 outline-none text-sm font-semibold"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">رقم الموبايل *</label>
              <input
                type="tel"
                required
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                placeholder="01012345678"
                className="w-full px-4 py-3 rounded-2xl border border-slate-300 focus:ring-4 focus:ring-emerald-500/15 focus:border-emerald-600 outline-none text-sm font-mono font-semibold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">الرقم القومي (اختياري)</label>
              <input
                type="text"
                value={nationalId}
                onChange={(e) => setNationalId(e.target.value)}
                placeholder="14 رقم"
                className="w-full px-4 py-3 rounded-2xl border border-slate-300 focus:ring-4 focus:ring-emerald-500/15 focus:border-emerald-600 outline-none text-sm font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">رقم الشارع (من 1 إلى 17) *</label>
            <select
              value={streetNumber}
              onChange={(e) => setStreetNumber(Number(e.target.value))}
              className="w-full px-4 py-3 rounded-2xl border border-slate-300 focus:ring-4 focus:ring-emerald-500/15 focus:border-emerald-600 outline-none text-sm font-bold bg-white"
            >
              {Array.from({ length: 17 }, (_, i) => i + 1).map((s) => (
                <option key={s} value={s}>
                  شارع {s}
                </option>
              ))}
            </select>
          </div>

          {/* Guard details */}
          <div className="pt-2 border-t border-slate-100">
            <label className="flex items-center gap-2.5 cursor-pointer mb-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <input
                type="checkbox"
                checked={hasGuard}
                onChange={(e) => setHasGuard(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded-lg border-slate-300 focus:ring-emerald-500"
              />
              <span className="text-xs font-black text-slate-800">يوجد غفير للعضو في الموقع</span>
            </label>

            {hasGuard && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-emerald-50/50 p-3.5 rounded-2xl border border-emerald-100 animate-slide-up">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">اسم الغفير</label>
                  <input
                    type="text"
                    value={guardName}
                    onChange={(e) => setGuardName(e.target.value)}
                    placeholder="اسم الغفير"
                    className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">موبايل الغفير</label>
                  <input
                    type="tel"
                    value={guardMobile}
                    onChange={(e) => setGuardMobile(e.target.value)}
                    placeholder="موبايل الغفير"
                    className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 text-xs font-mono"
                  />
                </div>
              </div>
            )}
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
              className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs sm:text-sm shadow-md shadow-emerald-900/20 flex items-center gap-2 disabled:opacity-50"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>{loading ? 'جاري الحفظ...' : 'حفظ العضو'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// 2. Add Monthly Practice Modal (Select Member -> Select Month -> Enter Amount)
interface AddPracticeModalProps extends ModalBaseProps {
  initialMemberId?: number;
  year?: number;
  month?: number;
}

export const AddPracticeModal: React.FC<AddPracticeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialMemberId,
  year = 2026,
  month = 9,
}) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [practiceTypes, setPracticeTypes] = useState<PracticeType[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<number | string>(initialMemberId || '');
  const [selectedMonth, setSelectedMonth] = useState<number>(month);
  const [selectedYear, setSelectedYear] = useState<number>(year);
  const [selectedTypeId, setSelectedTypeId] = useState<number | string>('');
  const [requiredAmount, setRequiredAmount] = useState<string>('560');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      Promise.all([membersApi.list(), practiceTypesApi.list()])
        .then(([mList, ptList]) => {
          setMembers(mList);
          setPracticeTypes(ptList);
          if (ptList.length > 0 && !selectedTypeId) {
            setSelectedTypeId(ptList[0].id);
          }
        })
        .catch(console.error);
    }
  }, [isOpen]);

  useEffect(() => {
    if (initialMemberId) setSelectedMemberId(initialMemberId);
    setSelectedMonth(month);
    setSelectedYear(year);
  }, [initialMemberId, month, year]);

  if (!isOpen) return null;

  const months = [
    { value: 1, label: 'يناير' },
    { value: 2, label: 'فبراير' },
    { value: 3, label: 'مارس' },
    { value: 4, label: 'أبريل' },
    { value: 5, label: 'مايو' },
    { value: 6, label: 'يونيو' },
    { value: 7, label: 'يوليو' },
    { value: 8, label: 'أغسطس' },
    { value: 9, label: 'سبتمبر' },
    { value: 10, label: 'أكتوبر' },
    { value: 11, label: 'نوفمبر' },
    { value: 12, label: 'ديسمبر' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberId) {
      setError('يرجى اختيار العضو أولاً');
      return;
    }
    if (!requiredAmount || Number(requiredAmount) <= 0) {
      setError('يرجى كتابة قيمة الممارسة بشكل صحيح');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await practicesApi.create({
        member: Number(selectedMemberId),
        practice_type: Number(selectedTypeId) || practiceTypes[0]?.id || 1,
        year: selectedYear,
        month: selectedMonth,
        required_amount: Number(requiredAmount),
        notes,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'حدث خطأ أثناء إضافة الممارسة');
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
              <CalendarPlus className="w-5 h-5 text-emerald-700" />
            </div>
            <span>إضافة ممارسة شهرية لعضو</span>
          </div>
          <button onClick={onClose} className="p-2 rounded-2xl hover:bg-slate-100 text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && <div className="p-3.5 mb-4 text-xs font-bold text-rose-800 bg-rose-50 rounded-2xl border border-rose-200">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4 text-right">
          {/* Step 1: Member Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">1. اختيار العضو *</label>
            <select
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
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

          {/* Step 2: Month & Year */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">2. الشهر *</label>
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

          {/* Step 3: Practice Type */}
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
            <span className="text-[11px] text-slate-400 mt-1 block">
              يمكن للعضو امتلاك أكثر من ممارسة في نفس الشهر (مثل: ممارسة كهرباء أساسية + ممارسة إضافية).
            </span>
          </div>

          {/* Step 4: Value (Variable every month) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">3. قيمة الممارسة للشهر المحدد (ج.م) *</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={requiredAmount}
              onChange={(e) => setRequiredAmount(e.target.value)}
              placeholder="مثال: 560"
              className="w-full px-4 py-3 rounded-2xl border border-slate-300 focus:ring-4 focus:ring-emerald-500/15 focus:border-emerald-600 outline-none text-xl font-black text-emerald-900 bg-emerald-50/30"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">ملاحظات أو بيان إضافي (اختياري)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ملاحظات خاصة بممارسة هذا العضو..."
              rows={2}
              className="w-full px-4 py-2.5 rounded-2xl border border-slate-300 outline-none text-xs font-medium"
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
              disabled={loading || !selectedMemberId}
              className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs sm:text-sm shadow-md shadow-emerald-900/20 flex items-center gap-2 disabled:opacity-50"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>{loading ? 'جاري الحفظ...' : 'حفظ الممارسة وتوليد الإيصال'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// 3. Record Payment Modal (Simplified to Full Payment or Overpayment)
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

// 4. Add Expense Modal
export const AddExpenseModal: React.FC<ModalBaseProps> = ({ isOpen, onClose, onSuccess }) => {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK_TRANSFER' | 'OTHER'>('CASH');
  const [description, setDescription] = useState('');
  const [documentImage, setDocumentImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
