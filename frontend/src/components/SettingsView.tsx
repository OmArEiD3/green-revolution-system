import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Shield, Database, Download, History, CheckCircle2, Upload, AlertTriangle } from 'lucide-react';
import { auditLogsApi, reportsApi } from '../api/client';

export const SettingsView: React.FC = () => {
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRestorePanel, setShowRestorePanel] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [confirmPhrase, setConfirmPhrase] = useState('');
  const [restoring, setRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState('');
  const [restoreSuccess, setRestoreSuccess] = useState('');

  useEffect(() => {
    auditLogsApi
      .list()
      .then(setAuditLogs)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const REQUIRED_PHRASE = 'نعم متأكد';

  const handleRestore = async () => {
    if (!restoreFile) {
      setRestoreError('يرجى اختيار ملف النسخة الاحتياطية أولاً');
      return;
    }
    if (confirmPhrase.trim() !== REQUIRED_PHRASE) {
      setRestoreError(`يجب كتابة العبارة "${REQUIRED_PHRASE}" بالضبط للمتابعة`);
      return;
    }
    setRestoring(true);
    setRestoreError('');
    try {
      const res = await reportsApi.backupRestore(restoreFile, confirmPhrase.trim());
      // Offer the automatic pre-restore safety snapshot as a download,
      // so the admin has a local copy of what existed right before this.
      if (res.safety_snapshot) {
        const blob = new Blob([res.safety_snapshot], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = res.safety_snapshot_filename || 'safety_snapshot.json';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      }
      setRestoreSuccess(res.message);
      setRestoreFile(null);
      setConfirmPhrase('');
      // A restore replaces literally all data, so the safest way to make
      // every screen in the app reflect the new state is a full reload.
      setTimeout(() => window.location.reload(), 2500);
    } catch (err: any) {
      setRestoreError(err.response?.data?.error || 'حدث خطأ أثناء الاستعادة');
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="space-y-4 animate-slide-up">
      {/* Header */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <SettingsIcon className="w-6 h-6 text-emerald-700" />
            <span>إعدادات النظام وسجل الرقابة (Audit Trail)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            توثيق كامل لكافة العمليات المالية والإدارية وإدارة النسخ الاحتياطية
          </p>
        </div>
      </div>

      {/* System Status & Backup Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* System Info */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-emerald-800 font-black text-sm">
            <Shield className="w-5 h-5 text-emerald-600" />
            <span>معلومات النظام والمنطقة</span>
          </div>

          <div className="space-y-2.5 text-xs text-slate-600">
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-400 font-semibold">اسم المنطقة:</span>
              <span className="font-black text-slate-900">الثورة الخضراء — Al Thawra Al Khadra</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-400 font-semibold">المستخدم النشط:</span>
              <span className="font-black text-emerald-800">المهندس المسؤول (Admin)</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-400 font-semibold">نطاق التغطية:</span>
              <span className="font-black text-slate-900">شارع 1 إلى شارع 20</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-400 font-semibold">حالة الأمان وقاعدة البيانات:</span>
              <span className="font-black text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                متصلة ومؤمنة (ACID / Zero Data Loss)
              </span>
            </div>
          </div>
        </div>

        {/* Database Backup Strategy */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-blue-900 font-black text-sm">
              <Database className="w-5 h-5 text-blue-600" />
              <span>النسخ الاحتياطي والأمان المالي</span>
            </div>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed font-medium">
              يتم حفظ وتوثيق جميع السجلات المالية إلى أجل غير مسمى. ننصح بتنزيل نسخة احتياطية كاملة بشكل دوري وحفظها في مكان آمن (Google Drive مثلاً).
            </p>
          </div>

          <div className="pt-2 space-y-2.5">
            <button
              onClick={() => {
                const now = new Date();
                window.open(reportsApi.exportExcelUrl(now.getFullYear(), now.getMonth() + 1), '_blank');
              }}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-slate-900 hover:bg-black text-white font-black text-xs sm:text-sm shadow-md transition-all active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>تنزيل كشف الشهر الحالي (.xlsx)</span>
            </button>

            <button
              onClick={() => window.open(reportsApi.backupExportUrl(), '_blank')}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-blue-700 hover:bg-blue-800 text-white font-black text-xs sm:text-sm shadow-md transition-all active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>تنزيل نسخة احتياطية كاملة لكل البيانات (.json)</span>
            </button>

            <button
              onClick={() => {
                setShowRestorePanel((v) => !v);
                setRestoreError('');
                setRestoreSuccess('');
              }}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-2xl border-2 border-rose-200 hover:bg-rose-50 text-rose-700 font-black text-xs sm:text-sm transition-all active:scale-95"
            >
              <Upload className="w-4 h-4" />
              <span>استعادة نسخة احتياطية</span>
            </button>

            {showRestorePanel && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-3 animate-slide-up">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] font-bold text-rose-800 leading-relaxed">
                    تحذير: هذه العملية تستبدل كل البيانات الحالية (كل الأعضاء، الممارسات، الدفعات) بمحتوى الملف اللي هترفعه.
                    أي بيانات اتضافت بعد تاريخ النسخة دي هتضيع نهائياً. النظام هيحمّلك تلقائياً نسخة أمان من البيانات
                    الحالية قبل ما يبدأ، لكن لازم تتأكد إنك رافع الملف الصح قبل ما تكمل.
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">اختر ملف النسخة الاحتياطية (.json)</label>
                  <input
                    type="file"
                    accept="application/json"
                    onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
                    className="w-full text-[11px] file:ml-2 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-rose-100 file:text-rose-800 file:font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    اكتب "{REQUIRED_PHRASE}" بالضبط للتأكيد
                  </label>
                  <input
                    type="text"
                    value={confirmPhrase}
                    onChange={(e) => setConfirmPhrase(e.target.value)}
                    placeholder={REQUIRED_PHRASE}
                    className="w-full px-3 py-2 rounded-xl border border-rose-300 text-xs font-bold outline-none focus:ring-4 focus:ring-rose-500/15"
                  />
                </div>

                {restoreError && <p className="text-[11px] font-bold text-rose-900">{restoreError}</p>}
                {restoreSuccess && (
                  <p className="text-[11px] font-bold text-emerald-800 bg-emerald-50 p-2 rounded-xl border border-emerald-200">
                    ✓ {restoreSuccess} — سيتم تحديث الصفحة تلقائياً الآن...
                  </p>
                )}

                <button
                  onClick={handleRestore}
                  disabled={restoring || confirmPhrase.trim() !== REQUIRED_PHRASE || !restoreFile}
                  className="w-full px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {restoring ? 'جاري الاستعادة...' : 'تأكيد الاستعادة نهائياً'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-emerald-700" />
            <h2 className="font-black text-slate-900 text-base">سجل الأنشطة والرقابة الإدارية (Audit Trail)</h2>
          </div>
          <span className="text-xs text-slate-400 font-bold">{auditLogs.length} عملية مسجلة</span>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="text-center py-12 text-slate-400 text-xs">جاري التحميل...</div>
          ) : auditLogs.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">لا توجد سجلات مسجلة بعد</div>
          ) : (
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-700 font-black border-b border-slate-200">
                <tr>
                  <th className="p-4">نوع الإجراء</th>
                  <th className="p-4">الكيان المرتبط</th>
                  <th className="p-4">المستخدم</th>
                  <th className="p-4">التاريخ والوقت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-black text-slate-900">{log.action}</td>
                    <td className="p-4 text-slate-600 font-semibold">
                      {log.entity_name} #{log.entity_id}
                    </td>
                    <td className="p-4 text-slate-700 font-bold">{log.username || 'المهندس'}</td>
                    <td className="p-4 text-slate-400 font-mono">{log.created_at?.replace('T', ' ').slice(0, 16)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
