import React, { useState, useEffect } from 'react';
import { ReceiptText, Search, Camera, CheckCircle2, Eye, X, MapPin } from 'lucide-react';
import { Receipt } from '../types';
import { receiptsApi } from '../api/client';

interface ReceiptsViewProps {
  year: number;
  month: number;
  onSelectMember: (memberId: number) => void;
}

export const ReceiptsView: React.FC<ReceiptsViewProps> = ({
  year,
  month,
  onSelectMember,
}) => {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [streetFilter, setStreetFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [viewImageModalUrl, setViewImageModalUrl] = useState<string | null>(null);

  const fetchReceipts = () => {
    setLoading(true);
    receiptsApi
      .list({
        year,
        month,
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
  }, [year, month, statusFilter, streetFilter, search]);

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

  const monthNames = [
    '', 'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];

  return (
    <div className="space-y-4 animate-slide-up">
      {/* Header */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <ReceiptText className="w-6 h-6 text-emerald-700" />
            <span>مركز إدارة وتوثيق الإيصالات</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            إيصالات ممارسات شهر {monthNames[month]} {year} — تصوير وتوثيق ومتابعة التسليم للأعضاء
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
            {receipts.length} إيصال
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-emerald-700 absolute right-3.5 top-3.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو رقم الإيصال..."
            className="w-full pr-10 pl-4 py-2.5 bg-white rounded-2xl border border-slate-300 outline-none text-xs sm:text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 shadow-sm"
          />
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-4 py-2.5 bg-white rounded-2xl border border-slate-300 outline-none text-xs sm:text-sm font-bold text-slate-700 shadow-sm"
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
            className="w-full px-4 py-2.5 bg-white rounded-2xl border border-slate-300 outline-none text-xs sm:text-sm font-bold text-slate-700 shadow-sm"
          >
            <option value="">جميع الشوارع (1 إلى 17)</option>
            {Array.from({ length: 17 }, (_, i) => i + 1).map((s) => (
              <option key={s} value={s}>
                شارع {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Receipts Cards */}
      {loading ? (
        <div className="text-center py-16 text-slate-400 text-sm bg-white rounded-3xl border border-slate-200">
          جاري تحميل الإيصالات...
        </div>
      ) : receipts.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-300 text-slate-400 text-xs">
          لا توجد إيصالات مسجلة مطابقة للبحث
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {receipts.map((rc) => (
            <div
              key={rc.id}
              className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-emerald-500/50 transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div onClick={() => onSelectMember(rc.member)} className="cursor-pointer group">
                    <h3 className="font-black text-slate-900 text-base group-hover:text-emerald-800 transition-colors">
                      {rc.member_name}
                    </h3>
                    <span className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 font-bold">
                      <MapPin className="w-3 h-3 text-emerald-600" />
                      شارع {rc.street_number} • {rc.practice_type_name}
                    </span>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-black ${
                      rc.status === 'DELIVERED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : rc.status === 'RECEIVED'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {rc.status === 'DELIVERED'
                      ? '✓ تم التسليم'
                      : rc.status === 'RECEIVED'
                      ? 'مستلم من الكهرباء'
                      : 'لم يستلم'}
                  </span>
                </div>

                <div className="bg-slate-50 p-3 rounded-2xl text-xs space-y-1.5 mb-3 border border-slate-100">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-semibold">قيمة الإيصال:</span>
                    <span className="font-black text-slate-900 text-sm">{rc.receipt_amount} ج.م</span>
                  </div>
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
              <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                {/* Photo Trigger */}
                <div className="flex items-center gap-1.5">
                  {rc.receipt_image ? (
                    <button
                      onClick={() => setViewImageModalUrl(rc.receipt_image)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-black flex items-center gap-1 border border-emerald-200"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>الصورة</span>
                    </button>
                  ) : null}

                  <label className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 cursor-pointer flex items-center gap-1 text-xs font-black transition-colors">
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

                {/* Status Trigger Buttons */}
                <div>
                  {rc.status === 'NOT_RECEIVED' && (
                    <button
                      onClick={() => handleMarkReceived(rc.id)}
                      className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-sm"
                    >
                      وصل من الكهرباء
                    </button>
                  )}

                  {rc.status === 'RECEIVED' && (
                    <button
                      onClick={() => handleMarkDelivered(rc.id)}
                      className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-sm flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />
                      <span>تسليم للعضو</span>
                    </button>
                  )}

                  {rc.status === 'DELIVERED' && (
                    <span className="text-emerald-700 font-black text-xs flex items-center gap-1 bg-emerald-50 px-3 py-1 rounded-xl">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
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
