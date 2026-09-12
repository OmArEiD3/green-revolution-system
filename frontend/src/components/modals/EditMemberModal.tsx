import React, { useState, useEffect } from 'react';
import { X, Check, UserPlus, MapPin } from 'lucide-react';
import { Member } from '../../types';
import { membersApi } from '../../api/client';
import { ModalBaseProps } from './shared';

interface EditMemberModalProps extends ModalBaseProps {
  member: Member | null;
}

export const EditMemberModal: React.FC<EditMemberModalProps> = ({ isOpen, onClose, onSuccess, member }) => {
  const [fullName, setFullName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [streetNumber, setStreetNumber] = useState(1);
  const [hasGuard, setHasGuard] = useState(false);
  const [guardName, setGuardName] = useState('');
  const [guardMobile, setGuardMobile] = useState('');
  const [guardMobile2, setGuardMobile2] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Re-fill the form every time a different member is opened for editing
  useEffect(() => {
    if (member) {
      setFullName(member.full_name || '');
      setMobileNumber(member.mobile_number || '');
      setNationalId(member.national_id || '');
      setStreetNumber(member.street_number || 1);
      setHasGuard(Boolean(member.has_guard));
      setGuardName(member.guard_name || '');
      setGuardMobile(member.guard_mobile || '');
      setGuardMobile2(member.guard_mobile_2 || '');
      setLatitude(member.latitude !== null && member.latitude !== undefined ? Number(member.latitude) : null);
      setLongitude(member.longitude !== null && member.longitude !== undefined ? Number(member.longitude) : null);
      setError('');
    }
  }, [member]);

  if (!isOpen || !member) return null;

  const handleCaptureLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('المتصفح لا يدعم تحديد الموقع الجغرافي');
      return;
    }
    setLocating(true);
    setLocationError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
        setLocating(false);
      },
      () => {
        setLocationError('تعذر الحصول على الموقع. تأكد من تفعيل صلاحية الموقع للمتصفح.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setError('يرجى إدخال اسم العضو');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await membersApi.update(member.id, {
        full_name: fullName,
        mobile_number: mobileNumber,
        national_id: nationalId,
        street_number: Number(streetNumber),
        has_guard: hasGuard,
        guard_name: hasGuard ? guardName : '',
        guard_mobile: hasGuard ? guardMobile : '',
        guard_mobile_2: hasGuard ? guardMobile2 : '',
        latitude: latitude,
        longitude: longitude,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'حدث خطأ أثناء تعديل بيانات العضو');
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
            <span>تعديل بيانات العضو</span>
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
              <label className="block text-xs font-bold text-slate-700 mb-1.5">رقم الموبايل (اختياري)</label>
              <input
                type="tel"
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
            <label className="block text-xs font-bold text-slate-700 mb-1.5">رقم الشارع (من 1 إلى 20) *</label>
            <select
              value={streetNumber}
              onChange={(e) => setStreetNumber(Number(e.target.value))}
              className="w-full px-4 py-3 rounded-2xl border border-slate-300 focus:ring-4 focus:ring-emerald-500/15 focus:border-emerald-600 outline-none text-sm font-bold bg-white"
            >
              {Array.from({ length: 20 }, (_, i) => i + 1).map((s) => (
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">اسم الغفير (اختياري)</label>
                  <input
                    type="text"
                    value={guardName}
                    onChange={(e) => setGuardName(e.target.value)}
                    placeholder="اسم الغفير"
                    className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">موبايل الغفير الأول (اختياري)</label>
                  <input
                    type="tel"
                    value={guardMobile}
                    onChange={(e) => setGuardMobile(e.target.value)}
                    placeholder="موبايل الغفير"
                    className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">موبايل الغفير الثاني (اختياري)</label>
                  <input
                    type="tel"
                    value={guardMobile2}
                    onChange={(e) => setGuardMobile2(e.target.value)}
                    placeholder="رقم موبايل إضافي للغفير"
                    className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 text-xs font-mono"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-700 mb-1.5">الموقع الجغرافي للعقار (اختياري)</label>
            {latitude !== null && longitude !== null ? (
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-between gap-2 text-xs flex-wrap">
                <span className="font-mono text-emerald-800 font-bold">
                  📍 {latitude.toFixed(6)}, {longitude.toFixed(6)}
                </span>
                <div className="flex items-center gap-3">
                  <a
                    href={`https://www.google.com/maps?q=${latitude},${longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-700 font-bold underline"
                  >
                    فتح على الخريطة
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      setLatitude(null);
                      setLongitude(null);
                    }}
                    className="text-rose-600 font-bold"
                  >
                    إزالة
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleCaptureLocation}
                disabled={locating}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50/50 text-emerald-800 font-bold text-xs hover:bg-emerald-50 disabled:opacity-60"
              >
                <MapPin className="w-4 h-4" />
                <span>{locating ? 'جاري تحديد موقعك...' : '📍 تحديد الموقع الحالي (قف أمام العقار واضغط هنا)'}</span>
              </button>
            )}
            {locationError && <p className="text-[11px] text-rose-600 font-bold mt-1.5">{locationError}</p>}
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
              <span>{loading ? 'جاري الحفظ...' : 'حفظ التعديلات'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
