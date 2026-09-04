import React, { useState, useEffect } from 'react';
import {
  X, Phone, Shield, Calendar, DollarSign, ReceiptText,
  ArrowUpRight, CheckCircle2, Clock, AlertCircle, Sparkles, MapPin, CalendarPlus, Plus
} from 'lucide-react';
import { MemberStatement } from '../types';
import { membersApi } from '../api/client';

interface MemberDetailModalProps {
  memberId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onRecordPayment: (practiceId: number, memberId: number) => void;
  onOpenAddPracticeForMember?: (memberId: number) => void;
  year: number;
  month: number;
}

export const MemberDetailModal: React.FC<MemberDetailModalProps> = ({
  memberId,
  isOpen,
  onClose,
  onRecordPayment,
  onOpenAddPracticeForMember,
  year,
  month,
}) => {
  const [statement, setStatement] = useState<MemberStatement | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'current' | 'history' | 'payments' | 'receipts'>('current');

  useEffect(() => {
    if (isOpen && memberId) {
      setLoading(true);
      membersApi
        .statement(memberId, year, month)
        .then(setStatement)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [isOpen, memberId, year, month]);

  if (!isOpen || !memberId) return null;

  const m = statement?.member;
  const summary = statement?.summary;

  const monthNames = [
    '', 'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-100 max-h-[92vh] flex flex-col overflow-hidden animate-slide-up">
        {/* Header with Member Dossier Info */}
        <div className="p-4 sm:p-6 bg-slate-50 border-b border-slate-200">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-700 to-teal-500 text-white flex items-center justify-center font-black text-xl shadow-lg border border-emerald-400/30">
                {m?.street_number ? `ش${m.street_number}` : '🌱'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight">{m?.full_name}</h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    شارع {m?.street_number}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                  <a href={`tel:${m?.mobile_number}`} className="flex items-center gap-1 hover:text-emerald-700 font-bold">
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="font-mono">{m?.mobile_number}</span>
                  </a>
                  {m?.national_id && <span className="font-mono text-slate-400">الرقم القومي: {m.national_id}</span>}
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-2xl bg-white hover:bg-slate-200 text-slate-400 hover:text-slate-700 border border-slate-200 transition-colors shadow-sm"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Guard details pill */}
          {m?.has_guard && (
            <div className="mt-3.5 p-2.5 bg-white rounded-2xl border border-slate-200 flex items-center justify-between text-xs shadow-sm">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-700" />
                <span className="text-slate-700 font-semibold">
                  الغفير المسؤول: <strong>{m.guard_name || 'مسجل'}</strong>
                </span>
              </div>
              {m.guard_mobile && (
                <a
                  href={`tel:${m.guard_mobile}`}
                  className="text-emerald-700 font-bold flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200"
                >
                  <Phone className="w-3 h-3" />
                  <span className="font-mono">{m.guard_mobile}</span>
                </a>
              )}
            </div>
          )}
        </div>

        {/* Current Month Financial KPI Card */}
        {summary && (
          <div className="px-4 sm:px-6 pt-4">
            <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-white shadow-xl border border-emerald-500/20 relative overflow-hidden">
              <div className="flex items-center justify-between text-xs text-slate-300 mb-3">
                <span className="font-bold flex items-center gap-1.5 text-emerald-300">
                  <Calendar className="w-4 h-4 text-emerald-400" />
                  مستحقات شهر {monthNames[month]} {year}
                </span>

                <div className="flex items-center gap-2">
                  {onOpenAddPracticeForMember && (
                    <button
                      onClick={() => {
                        onClose();
                        onOpenAddPracticeForMember(m!.id);
                      }}
                      className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1 shadow-sm"
                    >
                      <Plus className="w-3 h-3" />
                      <span>+ ممارسة</span>
                    </button>
                  )}

                  <span
                    className={`px-3 py-1 rounded-full font-black text-xs ${
                      summary.status === 'FULLY_PAID'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 shadow-sm'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-400/40 shadow-sm'
                    }`}
                  >
                    {summary.status === 'FULLY_PAID' ? '✓ تم السداد بالكامل' : 'غير مسدد'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 text-center py-2.5 border-t border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">المطلوب</span>
                  <span className="font-black text-sm sm:text-lg text-white mt-0.5 block">{summary.total_required}</span>
                </div>
                <div>
                  <span className="text-[10px] text-emerald-300 block font-semibold">المدفوع</span>
                  <span className="font-black text-sm sm:text-lg text-emerald-400 mt-0.5 block">{summary.total_paid}</span>
                </div>
                <div>
                  <span className="text-[10px] text-amber-300 block font-semibold">المتبقي</span>
                  <span className={`font-black text-sm sm:text-lg mt-0.5 block ${Number(summary.remaining) > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                    {summary.remaining}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-blue-300 block font-semibold">المبلغ الزائد</span>
                  <span className="font-black text-sm sm:text-lg text-blue-400 mt-0.5 block">{summary.overpayment}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Navigation Tabs */}
        <div className="flex items-center gap-2 px-4 sm:px-6 pt-4 border-b border-slate-200 text-xs font-bold text-slate-600">
          {[
            { id: 'current', label: 'ممارسات الشهر' },
            { id: 'history', label: 'كل الممارسات' },
            { id: 'payments', label: 'سجل الدفعات' },
            { id: 'receipts', label: 'الإيصالات' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`pb-3 px-2 border-b-2 font-black transition-all ${
                activeTab === t.id
                  ? 'border-emerald-700 text-emerald-800'
                  : 'border-transparent text-slate-400 hover:text-slate-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {loading ? (
            <div className="text-center py-10 text-slate-400 text-xs">جاري التحميل...</div>
          ) : (
            <>
              {/* Tab 1: Current Month Practices */}
              {activeTab === 'current' && (
                <div className="space-y-3">
                  {statement?.practices.filter((p) => p.year === year && p.month === month).length === 0 ? (
                    <div className="text-center py-10 text-slate-400 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                      <p>لا توجد ممارسات مسجلة لهذا العضو في شهر {month}/{year}</p>
                      {onOpenAddPracticeForMember && (
                        <button
                          onClick={() => {
                            onClose();
                            onOpenAddPracticeForMember(m!.id);
                          }}
                          className="px-4 py-2 rounded-xl bg-emerald-700 text-white font-bold text-xs"
                        >
                          + إضافة ممارسة لهذا العضو
                        </button>
                      )}
                    </div>
                  ) : (
                    statement?.practices
                      .filter((p) => p.year === year && p.month === month)
                      .map((p) => (
                        <div key={p.id} className="p-4 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-black text-sm text-slate-900">{p.practice_type_name}</span>
                              <span className="text-xs text-slate-500 block mt-0.5">شهر {p.month} / {p.year}</span>
                            </div>
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-black ${
                                p.payment_status === 'FULLY_PAID'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {p.payment_status === 'FULLY_PAID' ? '✓ مسدد' : 'غير مسدد'}
                            </span>
                          </div>

                          <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-2xl text-center text-xs">
                            <div>
                              <span className="text-slate-400 block font-semibold">المطلوب</span>
                              <span className="font-black text-slate-900 text-sm mt-0.5 block">{p.required_amount} ج.م</span>
                            </div>
                            <div>
                              <span className="text-emerald-700 block font-semibold">المدفوع</span>
                              <span className="font-black text-emerald-800 text-sm mt-0.5 block">{p.total_paid} ج.م</span>
                            </div>
                            <div>
                              <span className="text-amber-700 block font-semibold">المتبقي</span>
                              <span className="font-black text-amber-700 text-sm mt-0.5 block">{p.remaining_amount} ج.م</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                            <span className="text-xs text-slate-500">
                              حالة الإيصال: <strong>{p.receipt?.status === 'DELIVERED' ? 'تم التسليم' : p.receipt?.status === 'RECEIVED' ? 'مستلم من الكهرباء' : 'لم يستلم'}</strong>
                            </span>

                            {p.payment_status !== 'FULLY_PAID' && (
                              <button
                                onClick={() => {
                                  onClose();
                                  onRecordPayment(p.id, m!.id);
                                }}
                                className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs shadow-md shadow-emerald-900/20 active:scale-95 transition-all flex items-center gap-1.5"
                              >
                                <DollarSign className="w-3.5 h-3.5 stroke-[3]" />
                                <span>تسجيل تحصيل</span>
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                  )}
                </div>
              )}

              {/* Tab 2: All History */}
              {activeTab === 'history' && (
                <div className="space-y-2.5">
                  {statement?.practices.map((p) => (
                    <div key={p.id} className="p-3.5 bg-white rounded-2xl border border-slate-200 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-black text-slate-900 block">{p.practice_type_name}</span>
                        <span className="text-slate-500 text-[11px]">شهر {p.month} / {p.year}</span>
                      </div>
                      <div className="text-left">
                        <span className="font-black text-slate-900 block">{p.required_amount} ج.م</span>
                        <span className={`text-[11px] font-bold ${p.payment_status === 'FULLY_PAID' ? 'text-emerald-700' : 'text-rose-600'}`}>
                          {p.payment_status === 'FULLY_PAID' ? 'مسدد' : `متبقي ${p.remaining_amount} ج.م`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Tab 3: Payments */}
              {activeTab === 'payments' && (
                <div className="space-y-2.5">
                  {statement?.payments.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-xs">لا توجد دفعات مسجلة بعد</div>
                  ) : (
                    statement?.payments.map((pay) => (
                      <div key={pay.id} className="p-3.5 bg-white rounded-2xl border border-slate-200 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-black text-sm">
                            💵
                          </div>
                          <div>
                            <span className="font-black text-slate-900 block">دفعة {pay.amount} ج.م</span>
                            <span className="text-slate-400 text-[11px]">
                              {pay.payment_date} • {pay.payment_method === 'CASH' ? 'نقدي' : 'تحويل'}
                            </span>
                          </div>
                        </div>
                        {pay.notes && <span className="text-xs text-slate-500 italic max-w-xs truncate">{pay.notes}</span>}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Tab 4: Receipts */}
              {activeTab === 'receipts' && (
                <div className="space-y-2.5">
                  {statement?.receipts.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-xs">لا توجد إيصالات مسجلة بعد</div>
                  ) : (
                    statement?.receipts.map((rc) => (
                      <div key={rc.id} className="p-3.5 bg-white rounded-2xl border border-slate-200 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-black text-slate-900 block">
                            إيصال {rc.practice_type_name} (شهر {rc.practice_month}/{rc.practice_year})
                          </span>
                          <span className="text-slate-500 text-[11px]">القيمة: {rc.receipt_amount} ج.م</span>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full font-bold text-xs ${
                            rc.status === 'DELIVERED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : rc.status === 'RECEIVED'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {rc.status === 'DELIVERED' ? 'تم التسليم للعضو' : rc.status === 'RECEIVED' ? 'مستلم من الكهرباء' : 'لم يستلم بعد'}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
