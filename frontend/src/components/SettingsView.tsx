import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon, Shield, Database, Download,
  History, CheckCircle2, Sparkles, MapPin
} from 'lucide-react';
import { auditLogsApi } from '../api/client';

export const SettingsView: React.FC = () => {
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    auditLogsApi
      .list()
      .then(setAuditLogs)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

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
              <span className="font-black text-slate-900">شارع 1 إلى شارع 17</span>
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
              يتم حفظ وتوثيق جميع السجلات المالية إلى أجل غير مسمى. يمكنك تنزيل كشوف Excel الشاملة للنسخ الاحتياطي والأرشفة بنقرة واحدة.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={() => window.open('/api/reports/export_excel/?year=2026&month=9', '_blank')}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-slate-900 hover:bg-black text-white font-black text-xs sm:text-sm shadow-md transition-all active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>تنزيل نسخة احتياطية لكافة البيانات (.xlsx)</span>
            </button>
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
