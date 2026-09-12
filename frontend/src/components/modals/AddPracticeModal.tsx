import React, { useState, useEffect } from 'react';
import { X, Check, CalendarPlus } from 'lucide-react';
import { Member, Practice, PracticeType } from '../../types';
import { membersApi, practicesApi, practiceTypesApi } from '../../api/client';
import { ModalBaseProps } from './shared';

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
  const [memberSearch, setMemberSearch] = useState('');
  const [practiceTypes, setPracticeTypes] = useState<PracticeType[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<number | string>(initialMemberId || '');
  const [selectedMonth, setSelectedMonth] = useState<number>(month);
  const [selectedYear, setSelectedYear] = useState<number>(year);
  const [selectedTypeId, setSelectedTypeId] = useState<number | string>('');
  const [requiredAmount, setRequiredAmount] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [showMemberResults, setShowMemberResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Start every fresh "add practice" session with a clean form so a
      // previously-entered amount/notes/member never lingers into the next one.
      setRequiredAmount('');
      setNotes('');
      setError('');
      setSelectedMonth(month);
      setSelectedYear(year);
      setShowMemberResults(false);
      if (!initialMemberId) {
        setSelectedMemberId('');
        setMemberSearch('');
      }
      Promise.all([membersApi.list(), practiceTypesApi.list()])
        .then(([mList, ptList]) => {
          setMembers(mList);
          setPracticeTypes(ptList);
          if (ptList.length > 0) {
            setSelectedTypeId(ptList[0].id);
          }
          if (initialMemberId) {
            setSelectedMemberId(initialMemberId);
            const preselected = mList.find((m: Member) => m.id === initialMemberId);
            if (preselected) setMemberSearch(preselected.full_name);
          }
        })
        .catch(console.error);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredMembers = memberSearch.trim()
    ? members.filter((m) => {
        const q = memberSearch.trim().toLowerCase();
        return (
          m.full_name.toLowerCase().includes(q) ||
          String(m.street_number).includes(q) ||
          (m.mobile_number || '').includes(q)
        );
      })
    : members;

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
          <div className="relative">
            <label className="block text-xs font-bold text-slate-700 mb-1.5">1. اختيار العضو *</label>
            <input
              type="text"
              value={memberSearch}
              onChange={(e) => {
                setMemberSearch(e.target.value);
                setSelectedMemberId('');
                setShowMemberResults(true);
              }}
              onFocus={() => setShowMemberResults(true)}
              placeholder="ابحث بالاسم أو رقم الشارع أو الموبايل..."
              autoComplete="off"
              className="w-full px-4 py-3 rounded-2xl border border-slate-300 focus:ring-4 focus:ring-emerald-500/15 focus:border-emerald-600 outline-none text-sm font-semibold"
            />

            {selectedMemberId ? (
              <div className="mt-2 p-2.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                <span className="text-xs font-black text-emerald-800">
                  ✓ {members.find((m) => String(m.id) === String(selectedMemberId))?.full_name}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMemberId('');
                    setMemberSearch('');
                    setShowMemberResults(true);
                  }}
                  className="text-[11px] font-bold text-slate-500 hover:text-rose-600"
                >
                  تغيير
                </button>
              </div>
            ) : (
              showMemberResults &&
              memberSearch.trim() && (
                <div className="mt-1.5 max-h-52 overflow-y-auto rounded-2xl border border-slate-200 shadow-lg bg-white divide-y divide-slate-100 absolute z-10 w-full">
                  {filteredMembers.length > 0 ? (
                    filteredMembers.slice(0, 20).map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setSelectedMemberId(m.id);
                          setMemberSearch(m.full_name);
                          setShowMemberResults(false);
                        }}
                        className="w-full text-right px-4 py-2.5 hover:bg-emerald-50 text-xs font-bold text-slate-800 flex items-center justify-between"
                      >
                        <span>{m.full_name}</span>
                        <span className="text-slate-400 font-mono">شارع {m.street_number}</span>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-xs text-slate-400 font-semibold">لا يوجد أعضاء مطابقين</div>
                  )}
                </div>
              )
            )}
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
