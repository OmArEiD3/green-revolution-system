import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon, Shield, Database, Download, History,
  CheckCircle2, Upload, AlertTriangle, FileSearch, RefreshCw,
  Layers, Users, Building2, DollarSign, Receipt, FileText, CheckCircle
} from 'lucide-react';
import { auditLogsApi, reportsApi } from '../api/client';
import { BackupInspectResult } from '../types';

export const SettingsView: React.FC = () => {
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRestorePanel, setShowRestorePanel] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [confirmPhrase, setConfirmPhrase] = useState('');
  const [restoring, setRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState('');
  const [restoreSuccess, setRestoreSuccess] = useState('');

  // Backup Inspection State
  const [inspecting, setInspecting] = useState(false);
  const [inspectResult, setInspectResult] = useState<BackupInspectResult | null>(null);
  const [inspectError, setInspectError] = useState('');

  useEffect(() => {
    auditLogsApi
      .list()
      .then(setAuditLogs)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const REQUIRED_PHRASE = 'نعم متأكد';

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setRestoreFile(file);
    setInspectResult(null);
    setInspectError('');
    setRestoreError('');
    setRestoreSuccess('');

    if (file) {
      setInspecting(true);
      try {
        const result = await reportsApi.backupInspect(file);
        setInspectResult(result);
      } catch (err: any) {
        setInspectError(err.response?.data?.error || 'فشل فحص ملف النسخة الاحتياطية. تأكد أنه ملف JSON سليم.');
      } finally {
        setInspecting(false);
      }
    }
  };

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
      setInspectResult(null);
      setConfirmPhrase('');
      // Full reload after restore
      setTimeout(() => window.location.reload(), 2500);
    } catch (err: any) {
      setRestoreError(err.response?.data?.error || 'حدث خطأ أثناء الاستعادة');
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-slide-up">
      {/* Header */}
      <div className="bg-white/95 backdrop-blur-md p-5 rounded-3xl border border-slate-200/90 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-950 text-white flex items-center justify-center shadow-md shadow-slate-900/20">
            <SettingsIcon className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <span>إعدادات النظام والنسخ الاحتياطي وسجل الرقابة</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              إدارة الأمان، فحص واستعادة النسخ الاحتياطية وتوثيق كافة العمليات المالية والإدارية (Zero Data Loss)
            </p>
          </div>
        </div>
      </div>

      {/* System Status & Backup Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* System Info */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-emerald-800 font-black text-sm">
              <Shield className="w-5 h-5 text-emerald-600" />
              <span>معلومات النظام والمنطقة السكنية والتجارية</span>
            </div>

            <div className="space-y-3 text-xs text-slate-600 mt-4">
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
                <span className="font-black text-slate-900">شارع 1 إلى شارع 20 + الجهات التجارية المستقلة</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-400 font-semibold">قاعدة البيانات والأمان:</span>
                <span className="font-black text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  بيانات حقيقية مؤمنة (ACID / Zero Data Loss)
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-400 font-semibold">سرعة الاستجابة المحسنة:</span>
                <span className="font-black text-blue-700 flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" />
                  استعلامات مجمعة عالية السرعة (Ultra-Fast ORM)
                </span>
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-[11px] font-bold text-emerald-900 leading-relaxed">
            🛡️ جميع البيانات الحقيقية للعضو والجهات التجارية محفوظة بأمان دائم ولا يتم حذف أي سجل مالي بشكل نهائي لحماية التاريخ المحاسبي.
          </div>
        </div>

        {/* Database Backup Strategy */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-blue-900 font-black text-sm">
              <Database className="w-5 h-5 text-blue-600" />
              <span>إدارة النسخ الاحتياطي والأمان المالي</span>
            </div>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed font-medium">
              يمكنك تنزيل نسخة كاملة من قاعدة البيانات بصيغة JSON أو تصدير تقرير إكسيل شامل في أي وقت لحفظها في مكان آمن.
            </p>
          </div>

          <div className="pt-2 space-y-2.5">
            <button
              onClick={() => {
                const now = new Date();
                window.open(reportsApi.exportExcelUrl(now.getFullYear(), now.getMonth() + 1), '_blank');
              }}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-slate-900 hover:bg-black text-white font-black text-xs sm:text-sm shadow-md shadow-slate-900/10 transition-all active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>تنزيل تقرير إكسيل كامل للشهر الحالي (.xlsx)</span>
            </button>

            <button
              onClick={() => window.open(reportsApi.backupExportUrl(), '_blank')}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-600 hover:to-indigo-600 text-white font-black text-xs sm:text-sm shadow-md shadow-blue-900/20 transition-all active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>تنزيل نسخة احتياطية فورية لقاعدة البيانات (.json)</span>
            </button>

            <button
              onClick={() => {
                setShowRestorePanel((v) => !v);
                setRestoreError('');
                setRestoreSuccess('');
                setInspectError('');
              }}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-2xl border-2 border-rose-200 hover:bg-rose-50 text-rose-700 font-black text-xs sm:text-sm transition-all active:scale-95"
            >
              <Upload className="w-4 h-4" />
              <span>فحص واستعادة نسخة احتياطية</span>
            </button>
          </div>
        </div>
      </div>

      {/* Restore & Inspection Panel */}
      {showRestorePanel && (
        <div className="bg-rose-50/70 border-2 border-rose-200 p-5 sm:p-6 rounded-3xl space-y-4 animate-slide-up shadow-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-black text-rose-900 text-sm">أداة فحص واستعادة النسخ الاحتياطية بأمان</h3>
              <p className="text-[11px] font-bold text-rose-800 mt-1 leading-relaxed">
                عند اختيار ملف نسخة احتياطية (.json)، سيقوم النظام بفحص محتوياته وعرض تفاصيل السجلات قبل الاستعادة.
                عند الاستعادة، يقوم النظام تلقائياً بتحميل نسخة أمان فورية من بياناتك الحالية قبل التعديل.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* File Upload input */}
            <div>
              <label className="block text-xs font-black text-slate-800 mb-1.5">
                1. اختر ملف النسخة الاحتياطية (.json) للفحص:
              </label>
              <input
                type="file"
                accept="application/json"
                onChange={handleFileChange}
                className="w-full text-xs file:ml-3 file:px-4 file:py-2 file:rounded-xl file:border-0 file:bg-rose-600 file:text-white file:font-black file:cursor-pointer bg-white p-2 rounded-2xl border border-rose-200 shadow-inner"
              />
            </div>

            {/* Confirmation Phrase input */}
            <div>
              <label className="block text-xs font-black text-slate-800 mb-1.5">
                2. اكتب العبارة "{REQUIRED_PHRASE}" بالضبط للتأكيد:
              </label>
              <input
                type="text"
                value={confirmPhrase}
                onChange={(e) => setConfirmPhrase(e.target.value)}
                placeholder={REQUIRED_PHRASE}
                className="w-full px-4 py-2.5 rounded-2xl border border-rose-300 bg-white text-xs font-black outline-none focus:ring-4 focus:ring-rose-500/20 shadow-inner"
              />
            </div>
          </div>

          {/* Loading inspection state */}
          {inspecting && (
            <div className="p-4 rounded-2xl bg-white border border-rose-200 text-center text-xs font-bold text-slate-600 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-rose-600" />
              <span>جاري فحص ملف النسخة الاحتياطية والتأكد من سلامة الهيكل...</span>
            </div>
          )}

          {/* Inspection Error */}
          {inspectError && (
            <div className="p-3.5 rounded-2xl bg-rose-100 border border-rose-300 text-xs font-bold text-rose-900">
              ❌ {inspectError}
            </div>
          )}

          {/* Inspection Success Card */}
          {inspectResult && (
            <div className="p-4 sm:p-5 rounded-2xl bg-white border-2 border-emerald-300 shadow-sm space-y-3 animate-slide-up">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2 text-emerald-800 font-black text-xs sm:text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>تقرير فحص النسخة الاحتياطية قبل الاستعادة</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-900 font-black">
                  {inspectResult.filename} ({(inspectResult.file_size_bytes / 1024).toFixed(1)} KB)
                </span>
              </div>

              {/* Counts Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold block">الأعضاء السكنيون</span>
                  <span className="font-black text-slate-900 text-sm mt-0.5 block">
                    {inspectResult.counts.members_residential} عضو
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold block">الجهات التجارية</span>
                  <span className="font-black text-emerald-800 text-sm mt-0.5 block">
                    {inspectResult.counts.members_commercial} جهة
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold block">الممارسات المسجلة</span>
                  <span className="font-black text-slate-900 text-sm mt-0.5 block">
                    {inspectResult.counts.practices} ممارسة
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold block">الدفعات والمحصل</span>
                  <span className="font-black text-emerald-800 text-sm mt-0.5 block">
                    {inspectResult.counts.payments} دفعة ({Number(inspectResult.financial_totals.total_payments).toFixed(0)} ج.م)
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold block">الإيصالات</span>
                  <span className="font-black text-slate-900 text-sm mt-0.5 block">
                    {inspectResult.counts.receipts} إيصال
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold block">المصروفات</span>
                  <span className="font-black text-rose-700 text-sm mt-0.5 block">
                    {inspectResult.counts.expenses} مصروف ({Number(inspectResult.financial_totals.total_expenses).toFixed(0)} ج.م)
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold block">سجل المعاملات والرقابة</span>
                  <span className="font-black text-slate-900 text-sm mt-0.5 block">
                    {inspectResult.counts.transactions + inspectResult.counts.audit_logs} قيد
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                  <span className="text-[10px] text-emerald-800 font-bold block">إجمالي السجلات</span>
                  <span className="font-black text-emerald-950 text-sm mt-0.5 block">
                    {inspectResult.total_objects} سجل
                  </span>
                </div>
              </div>

              <div className="text-[11px] font-bold text-emerald-800 flex items-center gap-1.5 pt-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{inspectResult.message}</span>
              </div>
            </div>
          )}

          {restoreError && <p className="text-xs font-bold text-rose-900 bg-rose-100 p-2.5 rounded-xl border border-rose-300">{restoreError}</p>}
          {restoreSuccess && (
            <p className="text-xs font-bold text-emerald-900 bg-emerald-100 p-3 rounded-xl border border-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              <span>✓ {restoreSuccess} — جاري تحديث بيانات النظام تلقائياً...</span>
            </p>
          )}

          <button
            onClick={handleRestore}
            disabled={restoring || confirmPhrase.trim() !== REQUIRED_PHRASE || !restoreFile || inspecting}
            className="w-full px-5 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs sm:text-sm shadow-md shadow-rose-900/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
          >
            {restoring ? 'جاري الاستعادة وتأمين نسخة الأمان...' : 'تأكيد استعادة هذه النسخة نهائياً'}
          </button>
        </div>
      )}

      {/* Audit Log Table */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-emerald-700" />
            <h2 className="font-black text-slate-900 text-base">سجل الأنشطة والرقابة الإدارية (Audit Trail)</h2>
          </div>
          <span className="text-xs text-slate-400 font-bold">{auditLogs.length} عملية مسجلة</span>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="text-center py-16 text-slate-400 text-xs font-bold">جاري التحميل...</div>
          ) : auditLogs.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-xs font-bold">لا توجد سجلات مسجلة بعد</div>
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
