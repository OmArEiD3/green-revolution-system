import React, { useState, useEffect } from 'react';
import { ReceiptText, Search, Camera, CheckCircle2, Eye, X, MapPin, Calendar, Sparkles } from 'lucide-react';
import { Receipt } from '../types';
import { receiptsApi } from '../api/client';

interface ReceiptsViewProps {
  year: number;
  month: number;
  onSelectMember: (memberId: number) => void;
}

const MONTH_NAMES = [
  '', 'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

export const ReceiptsView: React.FC<ReceiptsViewProps> = ({
  year: initialYear,
  month: initialMonth,
  onSelectMember,
}) => {
  const [selectedYear, setSelectedYear] = useState<number>(initialYear);
  const [selectedMonth, setSelectedMonth] = useState<number | ''>(initialMonth);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [streetFilter, setStreetFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [viewImageModalUrl, setViewImageModalUrl] = useState<string | null>(null);

  // Sync with prop changes if global navbar date changes
  useEffect(() => {
    setSelectedYear(initialYear);
    setSelectedMonth(initialMonth);
  }, [initialYear, initialMonth]);

  const fetchReceipts = () => {
    setLoading(true);
    receiptsApi
      .list({
        year: selectedYear || undefined,
        month: selectedMonth !== '' ? Number(selectedMonth) : undefined,
        status: statusFilter || undefined,
        street: streetFilter ? Number(streetFilter) : undefined,
        search: search || undefined,
      })
      .then(setReceipts)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchReceipts();
  }, [selectedYear, selectedMonth, statusFilter, streetFilter, search]);

  const handleMarkReceived = async (id: number) => {
    try {
      await receiptsApi.markReceived(id);
      fetchReceipts();
    } catch {
      alert('حدث خطأ أثناء تحديث حالة الإيصال');
    }
  };

  const handleMarkDelivered = async (id: number) => {
    try {
      await receiptsApi.markDelivered(id);
      fetchReceipts();
    } catch {
      alert('حدث خطأ أثناء تسجيل تسليم الإيصال');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, receiptId: number) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    try {
      await receiptsApi.uploadImage(receiptId, file);
      fetchReceipts();
    } catch {
      alert('حدث خطأ أثناء رفع صورة الإيصال');
    }
  };

  const deliveredCount = receipts.filter((r) => r.status === 'DELIVERED').length;
  const receivedCount = receipts.filter((r) => r.status === 'RECEIVED').length;
  const notReceivedCount = receipts.filter((r) => r.status === 'NOT_RECEIVED').length;

  return (
    <div className="space-y-4 sm:space-y-5 animate-slide-up">
      {/* Header */}
      <div className="bg-white/95 backdrop-blur-md p-4 sm:p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-2xl bg-emerald-700 text-white flex items-center justify-center shadow-md shadow-emerald-900/20">
                <ReceiptText className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
                  <span>مركز إدارة وتوثيق الإيصالات</span>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {selectedMonth !== '' ? `إيصالات شهر ${MONTH_NAMES[selectedMonth]} ${selectedYear}` : `عام ${selectedYear}`}
                  </span>
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  توثيق وتصوير إيصالات الكهرباء ومتابعة الاستلام والتسليم للمشتركين
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-emerald-900 bg-emerald-50 border border-emerald-200/80 px-3.5 py-2.5 rounded-2xl flex items-center gap-1.5 shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>{receipts.length} إيصال</span>
            </span>
          </div>
        </div>

        {/* Status Breakdown Ribbon */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 bg-slate-50/90 p-3 sm:p-4 rounded-2xl border border-slate-200/80 text-center">
          <div className="p-1">
            <span className="text-[11px] sm:text-xs text-emerald-700 font-bold block">تم التسليم للعضو</span>
            <span className="font-black text-sm sm:text-xl text-emerald-800 mt-0.5 block">{deliveredCount}</span>
          </div>
          <div className="p-1 border-x border-slate-200/80">
            <span className="text-[11px] sm:text-xs text-blue-700 font-bold block">مستلم من الكهرباء</span>
            <span className="font-black text-sm sm:text-xl text-blue-800 mt-0.5 block">{receivedCount}</span>
          </div>
          <div className="p-1">
            <span className="text-[11px] sm:text-xs text-slate-500 font-bold block">لم تستلم بعد</span>
            <span className="font-black text-sm sm:text-xl text-slate-700 mt-0.5 block">{notReceivedCount}</span>
          </div>
        </div>
      </div>

      {/* Date & Search Filters Bar */}
      <div className="bg-white/95 backdrop-blur-md p-3.5 sm:p-4 rounded-3xl border border-slate-200/90 shadow-sm space-y-3">
        {/* Top row: Month & Year Selector */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 pb-2.5 border-b border-slate-100">
          <div className="flex items-center gap-1.5 text-xs font-black text-slate-700 shrink-0">
            <Calendar className="w-4 h-4 text-emerald-700" />
            <span>فلترة التاريخ:</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Month Filter */}
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value === '' ? '' : Number(e.target.value))}
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
              onChange={(e) => setSelectedYear(Number(e.target.value))}
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
                setSelectedYear(now.getFullYear());
                setSelectedMonth(now.getMonth() + 1);
              }}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-900 rounded-xl font-bold text-xs transition-colors"
            >
              الشهر الحالي
            </button>
            <button
              onClick={() => setSelectedMonth('')}
              className={`px-2.5 py-1.5 rounded-xl font-bold text-xs transition-colors ${
                selectedMonth === ''
                  ? 'bg-emerald-700 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              كل إيصالات سنة {selectedYear}
            </button>
          </div>
        </div>

        {/* Second row: Search & Status & Street */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-emerald-700 absolute right-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث بالاسم أو رقم الإيصال..."
              className="w-full pr-10 pl-4 py-2 bg-slate-50/80 rounded-2xl border border-slate-300 outline-none text-xs sm:text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 shadow-sm"
            />
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50/80 rounded-2xl border border-slate-300 outline-none text-xs sm:text-sm font-bold text-slate-700 shadow-sm focus:bg-white focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">جميع حالات الإيصالات</option>
              <option value="DELIVERED">تم التسليم للعضو</option>
              <option value="RECEIVED">مستلم من شركة الكهرباء</option>
              <option value="NOT_RECEIVED">لم تستلم من الكهرباء</option>
            </select>
          </div>

          <div>
            <select
              value={streetFilter}
              onChange={(e) => setStreetFilter(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50/80 rounded-2xl border border-slate-300 outline-none text-xs sm:text-sm font-bold text-slate-700 shadow-sm focus:bg-white focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">جميع الشوارع (1 إلى 20)</option>
              {Array.from({ length: 20 }, (_, i) => i + 1).map((s) => (
                <option key={s} value={s}>
                  شارع {s}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Receipts Cards */}
      {loading ? (
        <div className="text-center py-20 text-slate-400 text-sm bg-white/90 rounded-3xl border border-slate-200">
          <div className="flex flex-col items-center gap-2">
            <span className="w-8 h-8 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
            <span className="font-bold">جاري تحميل سجل الإيصالات...</span>
          </div>
        </div>
      ) : receipts.length === 0 ? (
        <div className="text-center py-16 bg-white/90 rounded-3xl border border-dashed border-slate-300 text-slate-400 text-xs font-bold">
          لا توجد إيصالات مسجلة مطابقة لخيارات الفلترة المحددة
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {receipts.map((rc) => (
            <div
              key={rc.id}
              className="card-hover-effect bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-sm flex flex-col justify-between"
            >
              <div>
                {/* Receipt Month Prominent Header Badge */}
                <div className="flex items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-slate-100">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-teal-800 text-white text-[11px] sm:text-xs font-black shadow-sm">
                    <Calendar className="w-3.5 h-3.5 text-teal-300" />
                    <span>إيصال شهر {rc.practice_month} ({MONTH_NAMES[rc.practice_month]}) {rc.practice_year}</span>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-black ${
                      rc.status === 'DELIVERED'
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                        : rc.status === 'RECEIVED'
                        ? 'bg-blue-100 text-blue-900 border border-blue-300'
                        : 'bg-slate-100 text-slate-700 border border-slate-300'
                    }`}
                  >
                    {rc.status === 'DELIVERED'
                      ? '✓ تم التسليم'
                      : rc.status === 'RECEIVED'
                      ? 'مستلم من الكهرباء'
                      : 'لم يستلم'}
                  </span>
                </div>

                {/* Member Details */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div onClick={() => onSelectMember(rc.member)} className="cursor-pointer group flex-1">
                    <h3 className="font-black text-slate-900 text-base group-hover:text-emerald-800 transition-colors line-clamp-1">
                      {rc.member_name}
                    </h3>
                    <span className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 font-bold">
                      <MapPin className="w-3 h-3 text-emerald-600" />
                      شارع {rc.street_number} • {rc.practice_type_name}
                    </span>
                  </div>
                </div>

                {/* Receipt Values & Dates Breakdown */}
                <div className="bg-slate-50/90 p-3 rounded-2xl text-xs space-y-1.5 mb-3 border border-slate-100">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-semibold text-[11px] sm:text-xs">قيمة الإيصال:</span>
                    <span className="font-black text-slate-900 text-sm">{rc.receipt_amount} ج.م</span>
                  </div>
                  {rc.receipt_number && (
                    <div className="flex justify-between items-center text-[11px] text-slate-600">
                      <span>رقم الإيصال:</span>
                      <span className="font-mono font-bold">{rc.receipt_number}</span>
                    </div>
                  )}
                  {rc.delivery_date && (
                    <div className="flex justify-between text-emerald-700 font-bold text-[11px] pt-1 border-t border-slate-200/60">
                      <span>تاريخ التسليم للعضو:</span>
                      <span className="font-mono">{rc.delivery_date}</span>
                    </div>
                  )}
                  {rc.received_date && !rc.delivery_date && (
                    <div className="flex justify-between text-blue-700 font-bold text-[11px] pt-1 border-t border-slate-200/60">
                      <span>تاريخ الاستلام من الكهرباء:</span>
                      <span className="font-mono">{rc.received_date}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                {/* Photo Trigger */}
                <div className="flex items-center gap-1.5">
                  {rc.receipt_image ? (
                    <button
                      onClick={() => setViewImageModalUrl(rc.receipt_image)}
                      className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-black flex items-center gap-1 border border-emerald-200"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>الصورة</span>
                    </button>
                  ) : null}

                  <label className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 cursor-pointer flex items-center gap-1 text-xs font-black transition-colors">
                    <Camera className="w-3.5 h-3.5 text-emerald-700" />
                    <span>{rc.receipt_image ? 'تغيير' : 'تصوير'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => handleImageUpload(e, rc.id)}
                    />
                  </label>
                </div>

                {/* Status Action Buttons */}
                <div>
                  {rc.status === 'NOT_RECEIVED' && (
                    <button
                      onClick={() => handleMarkReceived(rc.id)}
                      className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-sm active:scale-95 transition-all"
                    >
                      وصل من الكهرباء
                    </button>
                  )}

                  {rc.status === 'RECEIVED' && (
                    <button
                      onClick={() => handleMarkDelivered(rc.id)}
                      className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-sm flex items-center gap-1 active:scale-95 transition-all"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />
                      <span>تسليم للعضو</span>
                    </button>
                  )}

                  {rc.status === 'DELIVERED' && (
                    <span className="text-emerald-700 font-black text-xs flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-100">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>تم التسليم</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Image Preview Modal */}
      {viewImageModalUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 rounded-3xl max-w-xl w-full p-4 text-white shadow-2xl relative border border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <span className="font-bold text-sm">صورة إيصال الممارسة</span>
              <button
                onClick={() => setViewImageModalUrl(null)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-[75vh] overflow-auto flex items-center justify-center rounded-2xl bg-black">
              <img src={viewImageModalUrl} alt="صورة الإيصال" className="max-w-full max-h-[70vh] object-contain rounded-xl" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

