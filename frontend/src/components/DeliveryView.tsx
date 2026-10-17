import React, { useState, useEffect, useMemo } from 'react';
import {
  Truck, CheckCircle2, RotateCcw, Search, Plus, Users,
  Phone, Compass, ArrowUp, ArrowDown, ArrowUpToLine, ArrowDownToLine,
  Trash2, GitMerge, AlertCircle, Sparkles, Check, X, MoveVertical,
  Printer, BookmarkCheck, FolderDown, DollarSign, Layers, Edit3,
  Calendar, Info, Clock
} from 'lucide-react';
import { DeliveryStop, DeliveryAutoMergeGroup, Member, RouteTemplate } from '../types';
import { deliveryApi, membersApi } from '../api/client';

interface DeliveryViewProps {
  year: number;
  month: number;
  onSelectMember?: (memberId: number) => void;
}

export const DeliveryView: React.FC<DeliveryViewProps> = ({ year, month, onSelectMember }) => {
  // Navigation tabs
  const [activeSubTab, setActiveSubTab] = useState<'pending' | 'delivered'>('pending');

  // Route stops data
  const [stops, setStops] = useState<DeliveryStop[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Sync receipts toggle (stored in localStorage)
  const [syncReceipt, setSyncReceipt] = useState<boolean>(() => {
    const saved = localStorage.getItem('route_sync_receipt');
    return saved !== null ? saved === 'true' : true;
  });

  const handleToggleSyncReceipt = (val: boolean) => {
    setSyncReceipt(val);
    localStorage.setItem('route_sync_receipt', String(val));
    showToast(val ? 'تم تفعيل مزامنة الإيصالات تلقائياً' : 'تم تفعيل وضع خط السير المستقل (بدون اشتراط إيصالات)');
  };

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [streetFilter, setStreetFilter] = useState<number | ''>('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'RESIDENTIAL' | 'COMMERCIAL'>('ALL');

  // Debounce search by 250ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Modals state
  const [isBulkAddOpen, setIsBulkAddOpen] = useState(false);
  const [bulkSource, setBulkSource] = useState<'receipts' | 'all'>('receipts');
  const [bulkStreet, setBulkStreet] = useState<number | ''>('');
  const [bulkType, setBulkType] = useState<string>('ALL');

  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedMemberToAdd, setSelectedMemberToAdd] = useState<Member | null>(null);
  const [addPosition, setAddPosition] = useState<string>('');
  const [addCustomAmount, setAddCustomAmount] = useState<string>('');
  const [addCustomReceipt, setAddCustomReceipt] = useState<string>('');

  const [isAutoMergeOpen, setIsAutoMergeOpen] = useState(false);
  const [autoMergePreview, setAutoMergePreview] = useState<DeliveryAutoMergeGroup[]>([]);
  const [autoMergeLoading, setAutoMergeLoading] = useState(false);

  const [mergeTargetStop, setMergeTargetStop] = useState<DeliveryStop | null>(null);
  const [selectedStopIdsToMerge, setSelectedStopIdsToMerge] = useState<number[]>([]);

  const [confirmGroupDeliverStop, setConfirmGroupDeliverStop] = useState<DeliveryStop | null>(null);
  const [directPositionStop, setDirectPositionStop] = useState<DeliveryStop | null>(null);
  const [customPositionValue, setCustomPositionValue] = useState<string>('');

  // Edit custom amount / receipt number modal
  const [editAmountStop, setEditAmountStop] = useState<DeliveryStop | null>(null);
  const [editCustomAmountValue, setEditCustomAmountValue] = useState<string>('');
  const [editCustomReceiptValue, setEditCustomReceiptValue] = useState<string>('');

  // Route Templates State (Equipment route / saved ordering)
  const [templates, setTemplates] = useState<RouteTemplate[]>([]);
  const [isSaveTemplateOpen, setIsSaveTemplateOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDesc, setTemplateDesc] = useState('');

  const [isApplyTemplateOpen, setIsApplyTemplateOpen] = useState(false);
  const [applyMode, setApplyMode] = useState<'template' | 'previous_month'>('previous_month');
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | ''>('');
  const [cloneSourceMonth, setCloneSourceMonth] = useState<number>(month === 1 ? 12 : month - 1);
  const [cloneSourceYear, setCloneSourceYear] = useState<number>(month === 1 ? year - 1 : year);

  // Print Sheet Modal
  const [isPrintSheetOpen, setIsPrintSheetOpen] = useState(false);

  // Native HTML5 Drag and Drop state
  const [draggedStopId, setDraggedStopId] = useState<number | null>(null);
  const [dragOverStopId, setDragOverStopId] = useState<number | null>(null);

  // Fetch Route Stops
  const loadStops = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await deliveryApi.list({
        year,
        month,
        search: debouncedSearch || undefined,
        street: streetFilter || undefined,
        member_type: typeFilter !== 'ALL' ? typeFilter : undefined,
      });
      setStops(data);
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.error || 'فشل في تحميل خط السير');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStops();
  }, [year, month, debouncedSearch, streetFilter, typeFilter]);

  // Load all members for Add Member modal
  const loadAllMembers = async () => {
    try {
      const res = await membersApi.list({ member_type: 'ALL', is_active: true });
      setAllMembers(res);
    } catch (err) {
      console.error(err);
    }
  };

  // Load saved templates
  const loadTemplates = async () => {
    try {
      const res = await deliveryApi.templates();
      setTemplates(res);
    } catch (err) {
      console.error(err);
    }
  };

  const showToast = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3500);
  };

  // Filtered views by status
  const pendingStops = useMemo(() => stops.filter((s) => s.status === 'PENDING'), [stops]);
  // Delivered stops sorted with most recently delivered first
  const deliveredStops = useMemo(() => {
    return [...stops.filter((s) => s.status === 'DELIVERED')].sort((a, b) => {
      if (a.delivered_at && b.delivered_at) {
        return new Date(b.delivered_at).getTime() - new Date(a.delivered_at).getTime();
      }
      return b.id - a.id;
    });
  }, [stops]);

  // Count metrics
  const totalPendingMembers = useMemo(() => {
    return pendingStops.reduce((acc, s) => acc + (s.group_members_count || 1), 0);
  }, [pendingStops]);

  const totalDeliveredMembers = useMemo(() => {
    return deliveredStops.reduce((acc, s) => acc + (s.group_members_count || 1), 0);
  }, [deliveredStops]);

  // Financial calculations
  const totalRouteFinancials = useMemo(() => {
    let pendingSum = 0;
    let deliveredSum = 0;
    stops.forEach((s) => {
      const val = parseFloat(s.group_total_amount || '0') || 0;
      if (s.status === 'PENDING') {
        pendingSum += val;
      } else {
        deliveredSum += val;
      }
    });
    return {
      total: pendingSum + deliveredSum,
      pending: pendingSum,
      delivered: deliveredSum,
      rate: pendingSum + deliveredSum > 0 ? Math.round((deliveredSum / (pendingSum + deliveredSum)) * 100) : 0,
    };
  }, [stops]);

  const isFiltered = debouncedSearch !== '' || streetFilter !== '' || typeFilter !== 'ALL';

  // --- Actions ---

  // Deliver
  const handleDeliver = async (stop: DeliveryStop) => {
    if (stop.group_members_count > 1) {
      setConfirmGroupDeliverStop(stop);
      return;
    }
    executeDeliver(stop.id);
  };

  const executeDeliver = async (stopId: number) => {
    try {
      setActionLoading(true);
      await deliveryApi.deliver(stopId, { sync_receipt: syncReceipt });
      setConfirmGroupDeliverStop(null);
      showToast('تم تسجيل التسليم بنجاح');
      loadStops();
    } catch (err: any) {
      alert(err?.response?.data?.error || 'فشلت عملية التسليم');
    } finally {
      setActionLoading(false);
    }
  };

  // Undo Delivery
  const handleUndoDelivery = async (stopId: number) => {
    try {
      setActionLoading(true);
      await deliveryApi.undoDelivery(stopId);
      showToast('تم التراجع عن التسليم وإعادة العضو لآخر خط السير');
      loadStops();
    } catch (err: any) {
      alert(err?.response?.data?.error || 'فشلت عملية التراجع');
    } finally {
      setActionLoading(false);
    }
  };

  // Move
  const handleMove = async (id: number, direction: 'top' | 'up' | 'down' | 'bottom') => {
    if (isFiltered) return;
    try {
      setActionLoading(true);
      await deliveryApi.move(id, { to: direction });
      loadStops();
    } catch (err: any) {
      alert(err?.response?.data?.error || 'فشلت عملية التحريك');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSetPosition = async () => {
    if (!directPositionStop || !customPositionValue) return;
    const targetPos = parseInt(customPositionValue, 10);
    if (isNaN(targetPos) || targetPos < 1) {
      alert('يرجى إدخال رقم صحيح أكبر من 0');
      return;
    }
    try {
      setActionLoading(true);
      await deliveryApi.move(directPositionStop.id, { position: targetPos });
      setDirectPositionStop(null);
      setCustomPositionValue('');
      loadStops();
    } catch (err: any) {
      alert(err?.response?.data?.error || 'فشل تغيير الموضع');
    } finally {
      setActionLoading(false);
    }
  };

  // Drag and Drop reordering
  const handleDragStart = (id: number) => {
    if (isFiltered) return;
    setDraggedStopId(id);
  };

  const handleDragOver = (e: React.DragEvent, id: number) => {
    e.preventDefault();
    if (isFiltered || draggedStopId === null || draggedStopId === id) return;
    setDragOverStopId(id);
  };

  const handleDrop = async (e: React.DragEvent, targetId: number) => {
    e.preventDefault();
    setDragOverStopId(null);
    if (isFiltered || draggedStopId === null || draggedStopId === targetId) return;

    const fromIdx = pendingStops.findIndex((s) => s.id === draggedStopId);
    const toIdx = pendingStops.findIndex((s) => s.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;

    // Optimistic local update
    const reordered = [...pendingStops];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);

    const newIds = reordered.map((s) => s.id);
    setStops((prev) => {
      const nonPending = prev.filter((s) => s.status !== 'PENDING');
      const updatedPending = reordered.map((s, idx) => ({ ...s, position: idx + 1 }));
      return [...updatedPending, ...nonPending];
    });

    try {
      await deliveryApi.reorder(newIds);
      loadStops();
    } catch (err) {
      console.error(err);
      loadStops();
    } finally {
      setDraggedStopId(null);
    }
  };

  // Delete stop from route
  const handleDeleteStop = async (stopId: number, memberName: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف العضو "${memberName}" من خط السير لهذا الشهر؟ (لن تُمس أي بيانات مالية أو ممارسات)`)) {
      return;
    }
    try {
      setActionLoading(true);
      await deliveryApi.delete(stopId);
      showToast('تمت إزالة العضو من خط السير بنجاح');
      loadStops();
    } catch (err: any) {
      alert(err?.response?.data?.error || 'فشلت إزالة العضو');
    } finally {
      setActionLoading(false);
    }
  };

  // Unmerge
  const handleUnmerge = async (primaryStopId: number, childId: number) => {
    try {
      setActionLoading(true);
      await deliveryApi.unmerge(primaryStopId, { child_id: childId });
      showToast('تم فصل العضو وإعادته لخط السير بعد الرئيسي مباشرة');
      loadStops();
    } catch (err: any) {
      alert(err?.response?.data?.error || 'فشل فصل العضو');
    } finally {
      setActionLoading(false);
    }
  };

  // Make Primary
  const handleMakePrimary = async (primaryStopId: number, newPrimaryId: number) => {
    try {
      setActionLoading(true);
      await deliveryApi.makePrimary(primaryStopId, { new_primary_id: newPrimaryId });
      showToast('تم تعيين العضو كرئيسي للمجموعة بنجاح');
      loadStops();
    } catch (err: any) {
      alert(err?.response?.data?.error || 'فشل تغيير العضو الرئيسي');
    } finally {
      setActionLoading(false);
    }
  };

  // Bulk Add
  const handleExecuteBulkAdd = async () => {
    try {
      setActionLoading(true);
      const res = await deliveryApi.bulkAdd({
        year,
        month,
        source: bulkSource,
        street: bulkStreet || undefined,
        member_type: bulkType !== 'ALL' ? bulkType : undefined,
      });
      setIsBulkAddOpen(false);
      showToast(res.message);
      loadStops();
    } catch (err: any) {
      alert(err?.response?.data?.error || 'فشلت التعبئة التلقائية');
    } finally {
      setActionLoading(false);
    }
  };

  // Add Single Member
  const handleExecuteAddMember = async () => {
    if (!selectedMemberToAdd) return;
    try {
      setActionLoading(true);
      await deliveryApi.create({
        member: selectedMemberToAdd.id,
        year,
        month,
        position: addPosition ? parseInt(addPosition, 10) : undefined,
        custom_amount: addCustomAmount ? parseFloat(addCustomAmount) : undefined,
        custom_receipt_number: addCustomReceipt || undefined,
      });
      setIsAddMemberOpen(false);
      setSelectedMemberToAdd(null);
      setAddPosition('');
      setAddCustomAmount('');
      setAddCustomReceipt('');
      showToast('تمت إضافة العضو إلى خط السير');
      loadStops();
    } catch (err: any) {
      const msg = err?.response?.data?.member || err?.response?.data?.error || 'فشلت إضافة العضو';
      alert(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setActionLoading(false);
    }
  };

  // Edit Stop Manual Amount
  const handleSaveCustomAmount = async () => {
    if (!editAmountStop) return;
    try {
      setActionLoading(true);
      await deliveryApi.update(editAmountStop.id, {
        custom_amount: editCustomAmountValue ? parseFloat(editCustomAmountValue) : null,
        custom_receipt_number: editCustomReceiptValue || '',
      });
      setEditAmountStop(null);
      showToast('تم حفظ بيانات الإيصال/المبلغ للمحطة');
      loadStops();
    } catch (err: any) {
      alert(err?.response?.data?.error || 'فشل حفظ المبلغ');
    } finally {
      setActionLoading(false);
    }
  };

  // Auto Merge by Guard
  const handleOpenAutoMergeModal = async () => {
    try {
      setAutoMergeLoading(true);
      setIsAutoMergeOpen(true);
      const res = await deliveryApi.autoMergeGuard({ year, month, dry_run: true });
      setAutoMergePreview(res.groups || []);
    } catch (err: any) {
      alert(err?.response?.data?.error || 'فشلت معاينة الدمج التلقائي');
      setIsAutoMergeOpen(false);
    } finally {
      setAutoMergeLoading(false);
    }
  };

  const handleExecuteAutoMerge = async () => {
    try {
      setActionLoading(true);
      const res = await deliveryApi.autoMergeGuard({ year, month, dry_run: false });
      setIsAutoMergeOpen(false);
      showToast(res.message || 'تم دمج المجموعات بنجاح');
      loadStops();
    } catch (err: any) {
      alert(err?.response?.data?.error || 'فشل تنفيذ الدمج');
    } finally {
      setActionLoading(false);
    }
  };

  // Manual Merge
  const handleOpenMergeModal = (stop: DeliveryStop) => {
    setMergeTargetStop(stop);
    setSelectedStopIdsToMerge([]);
  };

  const handleExecuteManualMerge = async () => {
    if (!mergeTargetStop || selectedStopIdsToMerge.length === 0) return;
    try {
      setActionLoading(true);
      await deliveryApi.merge(mergeTargetStop.id, { stop_ids: selectedStopIdsToMerge });
      setMergeTargetStop(null);
      setSelectedStopIdsToMerge([]);
      showToast('تم دمج الأعضاء المحددين بنجاح');
      loadStops();
    } catch (err: any) {
      alert(err?.response?.data?.error || 'فشل دمج الأعضاء');
    } finally {
      setActionLoading(false);
    }
  };

  // Save Route Template
  const handleSaveRouteTemplate = async () => {
    try {
      setActionLoading(true);
      await deliveryApi.saveTemplate({
        year,
        month,
        name: templateName.trim() || undefined,
        description: templateDesc.trim() || undefined,
      });
      setIsSaveTemplateOpen(false);
      setTemplateName('');
      setTemplateDesc('');
      showToast('تم حفظ خط السير الحالي كقالب قياسي بنجاح');
    } catch (err: any) {
      alert(err?.response?.data?.error || 'فشل حفظ خط السير');
    } finally {
      setActionLoading(false);
    }
  };

  // Apply Template or Clone Month
  const handleApplyTemplate = async () => {
    try {
      setActionLoading(true);
      if (applyMode === 'template') {
        if (!selectedTemplateId) {
          alert('يرجى اختيار قالب محفوظ');
          return;
        }
        const res = await deliveryApi.applyTemplate({
          year,
          month,
          template_id: Number(selectedTemplateId),
        });
        showToast(res.message);
      } else {
        const res = await deliveryApi.applyTemplate({
          year,
          month,
          source_year: cloneSourceYear,
          source_month: cloneSourceMonth,
        });
        showToast(res.message);
      }
      setIsApplyTemplateOpen(false);
      loadStops();
    } catch (err: any) {
      alert(err?.response?.data?.error || 'فشل تطبيق خط السير');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteTemplate = async (tplId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('هل تريد حذف هذا القالب المحفوظ؟')) return;
    try {
      await deliveryApi.deleteTemplate(tplId);
      loadTemplates();
      if (selectedTemplateId === tplId) setSelectedTemplateId('');
      showToast('تم حذف القالب');
    } catch {
      alert('فشل حذف القالب');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Toast Notification */}
      {successMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 text-emerald-400 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-emerald-500/40 backdrop-blur-md animate-slide-down">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="font-bold text-sm text-white">{successMessage}</span>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="flex items-center gap-2 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs font-bold px-4 py-3 rounded-2xl">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* TOP EXECUTIVE DASHBOARD CARD */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 rounded-3xl p-5 sm:p-7 text-white shadow-xl border border-slate-700/80 relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-5">
          {/* Header Row */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-700/60 pb-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300">
                  <Truck className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                    <span>خط السير والتسليم الميداني</span>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      شهر {month} / {year}
                    </span>
                  </h1>
                  <p className="text-xs text-slate-300 font-medium">
                    إدارة خطوط السير الميدانية والمعدات، ترتيب التسليمات، ودمج المشتركين تحت خفير واحد
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Action Buttons Bar */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Auto Fill */}
              <button
                onClick={() => setIsBulkAddOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition-all cursor-pointer active:scale-95"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>تعبئة تلقائية</span>
              </button>

              {/* Add Single Member */}
              <button
                onClick={() => {
                  loadAllMembers();
                  setIsAddMemberOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-all cursor-pointer active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة عضو</span>
              </button>

              {/* Auto Merge by Guard */}
              <button
                onClick={handleOpenAutoMergeModal}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 text-xs font-bold border border-teal-500/30 transition-all cursor-pointer active:scale-95"
              >
                <GitMerge className="w-3.5 h-3.5" />
                <span>دمج بالغفير</span>
              </button>

              {/* Save Route Template */}
              <button
                onClick={() => setIsSaveTemplateOpen(true)}
                disabled={stops.length === 0}
                title="حفظ هذا الترتيب كخط سير قياسي أو خط سير للمعدات"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-emerald-300 text-xs font-bold border border-emerald-500/30 transition-all cursor-pointer active:scale-95"
              >
                <BookmarkCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>حفظ الترتيب</span>
              </button>

              {/* Apply / Clone Template */}
              <button
                onClick={() => {
                  loadTemplates();
                  setIsApplyTemplateOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-all cursor-pointer active:scale-95"
              >
                <FolderDown className="w-3.5 h-3.5 text-slate-300" />
                <span>استيراد ترتيب</span>
              </button>

              {/* Print Sheet */}
              <button
                onClick={() => setIsPrintSheetOpen(true)}
                disabled={stops.length === 0}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-700/80 hover:bg-blue-600 disabled:opacity-50 text-white text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>طباعة الكشف</span>
              </button>
            </div>
          </div>

          {/* Metrics & Financials Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Stat 1: Total Route Financials */}
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3.5 space-y-1">
              <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                إجمالي خط السير
              </span>
              <div className="text-lg sm:text-xl font-black text-white">
                {totalRouteFinancials.total.toLocaleString('ar-EG')} <span className="text-xs font-bold text-emerald-400">ج.م</span>
              </div>
              <div className="text-[10px] text-slate-400">
                {stops.length} محطة ({stops.reduce((acc, s) => acc + (s.group_members_count || 1), 0)} عضو)
              </div>
            </div>

            {/* Stat 2: Delivered Financials */}
            <div className="bg-slate-800/90 border border-emerald-500/40 rounded-2xl p-3.5 space-y-1">
              <span className="text-[11px] font-bold text-emerald-300 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                المسلّم (المحصل)
              </span>
              <div className="text-lg sm:text-xl font-black text-white">
                {totalRouteFinancials.delivered.toLocaleString('ar-EG')} <span className="text-xs font-bold text-emerald-400">ج.م</span>
              </div>
              <div className="text-[10px] text-slate-300">
                {deliveredStops.length} محطة منجزة ({totalDeliveredMembers} عضو)
              </div>
            </div>

            {/* Stat 3: Remaining Financials */}
            <div className="bg-amber-950/50 border border-amber-800/50 rounded-2xl p-3.5 space-y-1">
              <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                المتبقي ميدانياً
              </span>
              <div className="text-lg sm:text-xl font-black text-amber-300">
                {totalRouteFinancials.pending.toLocaleString('ar-EG')} <span className="text-xs font-bold">ج.م</span>
              </div>
              <div className="text-[10px] text-amber-300/80">
                {pendingStops.length} محطة متبقية ({totalPendingMembers} عضو)
              </div>
            </div>

            {/* Stat 4: Progress Bar Card */}
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3.5 flex flex-col justify-between space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
                <span>نسبة الإنجاز الميداني</span>
                <span className="font-black text-emerald-400 text-sm">
                  {totalRouteFinancials.rate}%
                </span>
              </div>
              <div className="w-full bg-slate-700/80 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-teal-400 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${totalRouteFinancials.rate}%` }}
                />
              </div>
              {/* Receipt Mode Toggle Pill */}
              <label className="flex items-center gap-2 cursor-pointer pt-1 border-t border-slate-700/60 select-none">
                <input
                  type="checkbox"
                  checked={syncReceipt}
                  onChange={(e) => handleToggleSyncReceipt(e.target.checked)}
                  className="w-3.5 h-3.5 accent-emerald-500 rounded cursor-pointer"
                />
                <span className="text-[10px] font-bold text-slate-300 hover:text-white">
                  {syncReceipt ? 'مزامنة الإيصالات مفعلة' : 'خط سير مستقل (تسليم ورقي)'}
                </span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation (Pending vs Delivered) & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          {/* Pending Route Tab */}
          <button
            onClick={() => setActiveSubTab('pending')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
              activeSubTab === 'pending'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-2 ring-emerald-500/20'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>خط السير (قيد التسليم)</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-black ${
                activeSubTab === 'pending' ? 'bg-emerald-800 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              {pendingStops.length}
            </span>
          </button>

          {/* Delivered Tab */}
          <button
            onClick={() => setActiveSubTab('delivered')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
              activeSubTab === 'delivered'
                ? 'bg-slate-800 text-white shadow-md shadow-slate-900/30'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>تم التسليم</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-black ${
                activeSubTab === 'delivered' ? 'bg-slate-950 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              {deliveredStops.length}
            </span>
          </button>
        </div>

        {/* Dynamic Summary */}
        <div className="flex items-center gap-3 text-xs font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3.5 py-2 rounded-xl">
          {activeSubTab === 'pending' ? (
            <span>
              {pendingStops.length === totalPendingMembers
                ? `${pendingStops.length} محطة متبقية`
                : `${pendingStops.length} محطة تشمل ${totalPendingMembers} عضو`}
            </span>
          ) : (
            <span>
              {deliveredStops.length === totalDeliveredMembers
                ? `${deliveredStops.length} محطة مكتملة`
                : `${deliveredStops.length} محطة تشمل ${totalDeliveredMembers} عضو`}
            </span>
          )}
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث بالاسم، الموبايل، اسم الغفير أو رقم هاتف الغفير..."
              className="w-full pr-10 pl-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white font-bold outline-none focus:border-emerald-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Street Filter */}
          <div className="w-full md:w-44 shrink-0">
            <select
              value={streetFilter}
              onChange={(e) => setStreetFilter(e.target.value ? Number(e.target.value) : '')}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white font-bold outline-none cursor-pointer focus:border-emerald-500"
            >
              <option value="">جميع الشوارع</option>
              {Array.from({ length: 20 }, (_, i) => i + 1).map((s) => (
                <option key={s} value={s}>
                  شارع {s}
                </option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div className="w-full md:w-36 shrink-0">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white font-bold outline-none cursor-pointer focus:border-emerald-500"
            >
              <option value="ALL">الكل (سكني وتجاري)</option>
              <option value="RESIDENTIAL">سكني فقط</option>
              <option value="COMMERCIAL">تجاري فقط</option>
            </select>
          </div>
        </div>

        {/* Active Filter Banner with clear Reset option */}
        {isFiltered && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-amber-50 dark:bg-slate-800 border-2 border-amber-300 dark:border-amber-500/40 text-amber-900 dark:text-amber-200 text-xs font-black px-4 py-3 rounded-2xl shadow-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>
                يتم الآن تصفية النتائج ({pendingStops.length} محطة مطابقة). الترتيب اليدوي معطّل أثناء الفلترة.
              </span>
            </div>
            <button
              onClick={() => {
                setSearchQuery('');
                setStreetFilter('');
                setTypeFilter('ALL');
              }}
              className="text-xs font-black text-amber-800 dark:text-amber-300 underline hover:text-amber-950 dark:hover:text-amber-100 cursor-pointer shrink-0 self-start sm:self-auto"
            >
              إلغاء التصفية وعرض الكل ✕
            </button>
          </div>
        )}
      </div>

      {/* Main Stops Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 space-y-3">
          <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-600 rounded-full animate-spin" />
          <span className="text-sm font-bold text-slate-500">جاري تحميل خط السير...</span>
        </div>
      ) : activeSubTab === 'pending' ? (
        /* PENDING TAB LIST */
        pendingStops.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-10 text-center space-y-4 border border-dashed border-slate-300 dark:border-slate-800">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-50 dark:bg-slate-800 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Truck className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base sm:text-lg font-black text-slate-800 dark:text-white">
                لا توجد تسليمات في خط السير حالياً
              </h3>
              <p className="text-xs sm:text-sm text-slate-500">
                يمكنك ملء خط السير تلقائياً من إيصالات الشهر، أو استيراد ترتيب الشهر السابق، أو إضافة أعضاء يدوياً
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <button
                onClick={() => setIsBulkAddOpen(true)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md cursor-pointer"
              >
                ⚡ تعبئة تلقائية من الإيصالات
              </button>
              <button
                onClick={() => {
                  loadTemplates();
                  setIsApplyTemplateOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 cursor-pointer"
              >
                📋 استيراد ترتيب الشهر السابق
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingStops.map((stop, index) => {
              const isFirst = index === 0;
              const hasGps = stop.latitude && stop.longitude;
              const isGroup = stop.group_members_count > 1;

              return (
                <div
                  key={stop.id}
                  draggable={!isFiltered}
                  onDragStart={() => handleDragStart(stop.id)}
                  onDragOver={(e) => handleDragOver(e, stop.id)}
                  onDrop={(e) => handleDrop(e, stop.id)}
                  className={`bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 transition-all shadow-xs border ${
                    isFirst
                      ? 'border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  } ${dragOverStopId === stop.id ? 'border-dashed border-2 border-emerald-500 bg-emerald-50/20' : ''}`}
                >
                  {/* Top Badge Banner (if first in queue) */}
                  {isFirst && (
                    <div className="inline-flex items-center gap-2 bg-emerald-600 text-white text-xs font-black px-3 py-1 rounded-full shadow-xs mb-3">
                      <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping" />
                      <span>الدور عليه الآن</span>
                    </div>
                  )}

                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                    {/* Left: Position & Member Info */}
                    <div className="flex items-start gap-3 sm:gap-4 w-full lg:w-auto">
                      {/* Drag Handle & Position Badge */}
                      <div className="flex flex-col items-center justify-center shrink-0">
                        <div
                          className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center font-black text-sm sm:text-base ${
                            isFirst
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          #{stop.position}
                        </div>
                        {!isFiltered && (
                          <div
                            title="اسحب بالفأرة لتغيير الترتيب"
                            className="text-slate-400 hover:text-slate-600 cursor-grab active:cursor-grabbing p-1"
                          >
                            <MoveVertical className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>

                      {/* Info Body */}
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            onClick={() => onSelectMember?.(stop.member)}
                            className="font-black text-sm sm:text-base text-slate-900 dark:text-white hover:text-emerald-500 cursor-pointer truncate"
                          >
                            {stop.member_name}
                          </span>

                          {/* Member Type Badge */}
                          <span
                            className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${
                              stop.member_type === 'COMMERCIAL'
                                ? 'bg-blue-50 dark:bg-slate-800 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-slate-700'
                                : 'bg-emerald-50 dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-slate-700'
                            }`}
                          >
                            {stop.member_type_display}
                          </span>

                          {/* Street Badge */}
                          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                            شارع {stop.street_number}
                          </span>

                          {/* Merged Group Badge */}
                          {isGroup && (
                            <span className="text-[11px] font-black bg-blue-50 dark:bg-slate-800 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-slate-700 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              <span>مجموعة: {stop.group_members_count} أعضاء</span>
                            </span>
                          )}
                        </div>

                        {/* Contacts & Guard Row */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-400 font-medium">
                          {/* Member Mobile */}
                          {stop.mobile_number ? (
                            <a
                              href={`tel:${stop.mobile_number}`}
                              className="text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
                            >
                              <Phone className="w-3 h-3" />
                              <span>{stop.mobile_number}</span>
                            </a>
                          ) : (
                            <span className="text-slate-400">بدون هاتف</span>
                          )}

                          {/* Guard Info */}
                          {stop.has_guard || stop.guard_name || stop.guard_mobile ? (
                            <span className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 text-[11px]">
                              <span>الغفير: {stop.guard_name || 'مسجل'}</span>
                              {stop.guard_mobile && (
                                <a
                                  href={`tel:${stop.guard_mobile}`}
                                  className="text-emerald-600 font-bold hover:underline"
                                >
                                  ({stop.guard_mobile})
                                </a>
                              )}
                              {stop.guard_mobile_2 && (
                                <a
                                  href={`tel:${stop.guard_mobile_2}`}
                                  className="text-emerald-600 font-bold hover:underline"
                                >
                                  - ({stop.guard_mobile_2})
                                </a>
                              )}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">بدون غفير</span>
                          )}
                        </div>

                        {/* Financial / Receipt Pill */}
                        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                          <span className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-xl font-bold border border-slate-200 dark:border-slate-700 flex items-center gap-2">
                            <span>
                              {stop.receipt_number
                                ? `إيصال #${stop.receipt_number}`
                                : stop.custom_receipt_number
                                ? `إيصال يدوي #${stop.custom_receipt_number}`
                                : 'إيصال ميداني'}
                            </span>
                            <span className="text-emerald-700 dark:text-emerald-400 font-black">
                              {isGroup
                                ? `إجمالي المجموعة: ${stop.group_total_amount} ج.م`
                                : `${stop.receipt_amount} ج.م`}
                            </span>
                            {stop.receipt_status && (
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                                  stop.receipt_status === 'RECEIVED'
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                    : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                                }`}
                              >
                                {stop.receipt_status === 'RECEIVED' ? 'جاهز بالمكتب' : 'لم يسجل كوارد'}
                              </span>
                            )}
                            <button
                              onClick={() => {
                                setEditAmountStop(stop);
                                setEditCustomAmountValue(stop.custom_amount ? String(stop.custom_amount) : stop.receipt_amount !== '0.00' ? stop.receipt_amount : '');
                                setEditCustomReceiptValue(stop.custom_receipt_number || stop.receipt_number || '');
                              }}
                              title="تعديل المبلغ أو رقم الإيصال يدوياً لهذه المحطة"
                              className="text-slate-400 hover:text-emerald-600 cursor-pointer p-0.5"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions Controls */}
                    <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800">
                      {/* GPS Directions */}
                      {hasGps ? (
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${stop.latitude},${stop.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-bold border border-blue-200 dark:border-blue-800 transition-colors"
                        >
                          <Compass className="w-3.5 h-3.5" />
                          <span>اتجاهات</span>
                        </a>
                      ) : (
                        <span
                          title="العضو لا يملك إحداثيات موقع مسجلة"
                          className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 text-xs font-bold cursor-not-allowed select-none"
                        >
                          بدون موقع
                        </span>
                      )}

                      {/* Merge with Others Button */}
                      <button
                        onClick={() => handleOpenMergeModal(stop)}
                        title="دمج أعضاء آخرين في هذا التسليم"
                        className="flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors cursor-pointer"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>دمج</span>
                      </button>

                      {/* Position Reordering Buttons (When not filtered) */}
                      {!isFiltered && (
                        <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-0.5 border border-slate-200 dark:border-slate-700">
                          <button
                            onClick={() => handleMove(stop.id, 'top')}
                            title="نقل للأول"
                            className="p-1.5 hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg cursor-pointer"
                          >
                            <ArrowUpToLine className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleMove(stop.id, 'up')}
                            title="أعلى"
                            className="p-1.5 hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg cursor-pointer"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleMove(stop.id, 'down')}
                            title="أسفل"
                            className="p-1.5 hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg cursor-pointer"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleMove(stop.id, 'bottom')}
                            title="نقل للآخر"
                            className="p-1.5 hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg cursor-pointer"
                          >
                            <ArrowDownToLine className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setDirectPositionStop(stop);
                              setCustomPositionValue(String(stop.position));
                            }}
                            title="تحديد رقم الموضع يدوياً"
                            className="px-2 py-1 text-[10px] font-black hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg cursor-pointer"
                          >
                            موضع
                          </button>
                        </div>
                      )}

                      {/* Deliver Button */}
                      <button
                        onClick={() => handleDeliver(stop)}
                        disabled={actionLoading}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 active:scale-95 text-white text-xs font-black shadow-sm transition-all cursor-pointer"
                      >
                        <Check className="w-4 h-4 stroke-[3]" />
                        <span>تسليم</span>
                      </button>

                      {/* Delete Stop from Route */}
                      <button
                        onClick={() => handleDeleteStop(stop.id, stop.member_name)}
                        title="إزالة من خط السير"
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Merged Members Sub-List (Nested inside the Primary Card) */}
                  {isGroup && (
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                        <span>الأعضاء المدموجون في نفس هذا التسليم:</span>
                        <span>إجمالي المدموجين: {stop.merged.length}</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {stop.merged.map((child) => (
                          <div
                            key={child.id}
                            className="bg-white dark:bg-slate-800 rounded-xl p-2.5 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 shadow-xs"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-xs text-slate-800 dark:text-white truncate">
                                  {child.member_name}
                                </span>
                                <span className="text-[10px] text-slate-500">شارع {child.street_number}</span>
                              </div>
                              <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                                إيصال: {child.receipt_amount} ج.م
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => handleMakePrimary(stop.id, child.id)}
                                title="جعله هو العضو الرئيسي بدلاً من الحالي"
                                className="px-2 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-[10px] font-bold rounded-lg cursor-pointer"
                              >
                                جعله رئيسي
                              </button>
                              <button
                                onClick={() => handleUnmerge(stop.id, child.id)}
                                title="فصل العضو من المجموعة وإعادته لخط السير"
                                className="px-2 py-1 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 text-amber-800 dark:text-amber-300 text-[10px] font-bold rounded-lg cursor-pointer"
                              >
                                فصل
                              </button>
                              <button
                                onClick={() => handleDeleteStop(child.id, child.member_name)}
                                title="إزالة العضو تماماً من خط سير الشهر"
                                className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* DELIVERED TAB LIST */
        deliveredStops.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-10 text-center space-y-2 border border-slate-200 dark:border-slate-800 text-slate-500">
            <CheckCircle2 className="w-12 h-12 mx-auto text-slate-400" />
            <h3 className="font-bold text-slate-700 dark:text-slate-300">لم يتم تسليم أي إيصالات بعد في هذا الشهر</h3>
          </div>
        ) : (
          <div className="space-y-3">
            {deliveredStops.map((stop) => {
              const isGroup = stop.group_members_count > 1;

              return (
                <div
                  key={stop.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-black text-sm sm:text-base text-slate-900 dark:text-white">
                        {stop.member_name}
                      </span>
                      <span className="text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                        شارع {stop.street_number}
                      </span>
                      {isGroup && (
                        <span className="text-[11px] font-bold bg-blue-50 dark:bg-blue-950 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                          مجموعة: {stop.group_members_count} أعضاء
                        </span>
                      )}
                      {stop.receipt_synced && (
                        <span className="text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          <span>تم تحديث الإيصال</span>
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span>إجمالي القيمة: {stop.group_total_amount} ج.م</span>
                      {stop.delivered_at && (
                        <span>
                          تاريخ التسليم: {new Date(stop.delivered_at).toLocaleDateString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                      {stop.delivered_by_name && (
                        <span>بواسطة: {stop.delivered_by_name}</span>
                      )}
                    </div>

                    {isGroup && (
                      <div className="text-xs text-slate-500 font-medium pt-1">
                        الأعضاء المشمولون: {stop.merged.map((m) => m.member_name).join('، ')}
                      </div>
                    )}
                  </div>

                  {/* Undo Button */}
                  <button
                    onClick={() => handleUndoDelivery(stop.id)}
                    disabled={actionLoading}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-amber-950 text-slate-700 dark:text-slate-300 hover:text-amber-800 dark:hover:text-amber-200 text-xs font-bold transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>تراجع عن التسليم</span>
                  </button>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* --- MODALS --- */}

      {/* 1. Bulk Add Modal */}
      {isBulkAddOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-600" />
                <h3 className="font-black text-base text-slate-900 dark:text-white">
                  تعبئة تلقائية لخط السير
                </h3>
              </div>
              <button
                onClick={() => setIsBulkAddOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs sm:text-sm">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300">مصدر التعبئة:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBulkSource('receipts')}
                    className={`p-3 rounded-xl border text-center font-bold cursor-pointer transition-all ${
                      bulkSource === 'receipts'
                        ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    أصحاب إيصالات هذا الشهر (غير المسلمة)
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkSource('all')}
                    className={`p-3 rounded-xl border text-center font-bold cursor-pointer transition-all ${
                      bulkSource === 'all'
                        ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    جميع الأعضاء النشطين (خط سير مستقل)
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300">تصفية حسب الشارع (اختياري):</label>
                <select
                  value={bulkStreet}
                  onChange={(e) => setBulkStreet(e.target.value ? Number(e.target.value) : '')}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                >
                  <option value="">جميع الشوارع</option>
                  {Array.from({ length: 20 }, (_, i) => i + 1).map((s) => (
                    <option key={s} value={s}>
                      شارع {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300">نوع العضوية:</label>
                <select
                  value={bulkType}
                  onChange={(e) => setBulkType(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                >
                  <option value="ALL">الكل (سكني وتجاري)</option>
                  <option value="RESIDENTIAL">سكني فقط</option>
                  <option value="COMMERCIAL">تجاري فقط</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsBulkAddOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleExecuteBulkAdd}
                disabled={actionLoading}
                className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-black shadow-md cursor-pointer"
              >
                بدء التعبئة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Add Single Member Modal */}
      {isAddMemberOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-scale-up max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-black text-base text-slate-900 dark:text-white">إضافة عضو إلى خط السير</h3>
              <button
                onClick={() => setIsAddMemberOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 flex-1 overflow-hidden flex flex-col">
              <input
                type="text"
                placeholder="ابحث بالاسم أو رقم الشارع أو الهاتف..."
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-semibold"
              />

              {/* Members List */}
              <div className="flex-1 overflow-y-auto space-y-1.5 max-h-48 pr-1">
                {allMembers
                  .filter((m) =>
                    !memberSearch ||
                    m.full_name.includes(memberSearch) ||
                    m.mobile_number.includes(memberSearch) ||
                    String(m.street_number) === memberSearch
                  )
                  .map((m) => {
                    const isSelected = selectedMemberToAdd?.id === m.id;
                    return (
                      <div
                        key={m.id}
                        onClick={() => setSelectedMemberToAdd(m)}
                        className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 font-black'
                            : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        <div>
                          <div className="text-xs sm:text-sm font-bold">{m.full_name}</div>
                          <div className="text-[11px] text-slate-500">
                            شارع {m.street_number} • {m.member_type === 'COMMERCIAL' ? 'تجاري' : 'سكني'}
                          </div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-emerald-600" />}
                      </div>
                    );
                  })}
              </div>

              {/* Optional Custom Position & Amount Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    الموضع (افتراضي: الأخير):
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="رقم الترتيب"
                    value={addPosition}
                    onChange={(e) => setAddPosition(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    مبلغ يدوي (اختياري):
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="ج.م"
                    value={addCustomAmount}
                    onChange={(e) => setAddCustomAmount(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    رقم إيصال يدوي:
                  </label>
                  <input
                    type="text"
                    placeholder="رقم الإيصال"
                    value={addCustomReceipt}
                    onChange={(e) => setAddCustomReceipt(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsAddMemberOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleExecuteAddMember}
                disabled={!selectedMemberToAdd || actionLoading}
                className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-black shadow-md cursor-pointer"
              >
                إضافة لخط السير
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Auto Merge Guard Preview & Confirm Modal */}
      {isAutoMergeOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-scale-up max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <GitMerge className="w-5 h-5 text-teal-600" />
                <h3 className="font-black text-base text-slate-900 dark:text-white">
                  معاينة الدمج التلقائي بالغفير
                </h3>
              </div>
              <button
                onClick={() => setIsAutoMergeOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {autoMergeLoading ? (
                <div className="p-8 text-center text-slate-500 font-bold">جاري فحص وتجميع أرقام الخفراء...</div>
              ) : autoMergePreview.length === 0 ? (
                <div className="p-8 text-center text-slate-500 font-bold">
                  لم يتم العثور على أي أعضاء يشتركون في نفس رقم هاتف الغفير ضمن خط سير هذا الشهر.
                </div>
              ) : (
                autoMergePreview.map((group, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between font-bold text-teal-800 dark:text-teal-300">
                      <span>هاتف الغفير: {group.guard_mobile}</span>
                      <span>اسم الغفير: {group.guard_name || 'مسجل'}</span>
                    </div>

                    <div className="bg-emerald-50 dark:bg-emerald-950/40 p-2 rounded-xl text-emerald-900 dark:text-emerald-200 font-black flex items-center justify-between">
                      <span>الرئيسي: {group.primary.member_name} (شارع {group.primary.street_number})</span>
                      <span>الترتيب: #{group.primary.position}</span>
                    </div>

                    <div className="space-y-1 text-slate-600 dark:text-slate-400 pl-2">
                      <div className="font-semibold text-[11px]">الأعضاء الذين سيتم دمجهم تحته:</div>
                      {group.members.map((m) => (
                        <div key={m.id} className="flex items-center gap-2 text-[11px]">
                          <span>•</span>
                          <span className="font-bold">{m.member_name}</span>
                          <span>(شارع {m.street_number})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsAutoMergeOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleExecuteAutoMerge}
                disabled={autoMergePreview.length === 0 || actionLoading}
                className="px-5 py-2 rounded-xl bg-teal-700 hover:bg-teal-600 disabled:opacity-50 text-white text-xs font-black shadow-md cursor-pointer"
              >
                تأكيد وتنفيذ الدمج ({autoMergePreview.length} مجموعة)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Manual Merge Selection Modal */}
      {mergeTargetStop && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-scale-up max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-black text-base text-slate-900 dark:text-white">دمج أعضاء في تسليم واحد</h3>
                <p className="text-xs text-slate-500">العضو الرئيسي: {mergeTargetStop.member_name}</p>
              </div>
              <button
                onClick={() => setMergeTargetStop(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-60">
              {pendingStops
                .filter((s) => s.id !== mergeTargetStop.id)
                .map((other) => {
                  const sharesGuard =
                    mergeTargetStop.guard_mobile &&
                    other.guard_mobile &&
                    mergeTargetStop.guard_mobile.replace(/\D/g, '') === other.guard_mobile.replace(/\D/g, '');

                  const isChecked = selectedStopIdsToMerge.includes(other.id);

                  return (
                    <label
                      key={other.id}
                      className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition-all ${
                        isChecked
                          ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100'
                          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedStopIdsToMerge([...selectedStopIdsToMerge, other.id]);
                            } else {
                              setSelectedStopIdsToMerge(selectedStopIdsToMerge.filter((id) => id !== other.id));
                            }
                          }}
                          className="w-4 h-4 accent-emerald-600 rounded"
                        />
                        <div>
                          <div className="text-xs sm:text-sm font-bold flex items-center gap-2">
                            <span>{other.member_name}</span>
                            {sharesGuard && (
                              <span className="text-[10px] font-black bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 px-2 py-0.2 rounded-full border border-teal-300 dark:border-teal-800">
                                نفس الغفير
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            شارع {other.street_number} • {other.receipt_amount} ج.م
                          </div>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-slate-400">#{other.position}</span>
                    </label>
                  );
                })}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setMergeTargetStop(null)}
                className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleExecuteManualMerge}
                disabled={selectedStopIdsToMerge.length === 0 || actionLoading}
                className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-black shadow-md cursor-pointer"
              >
                دمج المحددين ({selectedStopIdsToMerge.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Group Delivery Confirmation Modal */}
      {confirmGroupDeliverStop && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-scale-up">
            <div className="flex items-center gap-3 text-emerald-600">
              <div className="p-2.5 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-300">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="font-black text-base text-slate-900 dark:text-white">تأكيد تسليم المجموعة كاملة</h3>
            </div>

            <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 space-y-2">
              <p>
                أنت على وشك تسجيل تسليم مجموعة مدمجة تضم{' '}
                <span className="font-black text-emerald-600">{confirmGroupDeliverStop.group_members_count} أعضاء</span>{' '}
                بإجمالي إيصالات{' '}
                <span className="font-black text-emerald-600">{confirmGroupDeliverStop.group_total_amount} ج.م</span>.
              </p>
              <div className="bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl space-y-1">
                <div className="font-bold text-xs text-slate-700 dark:text-slate-200">الأعضاء المشمولون:</div>
                <div className="text-xs text-slate-600 dark:text-slate-400">
                  • {confirmGroupDeliverStop.member_name} (الرئيسي)
                </div>
                {confirmGroupDeliverStop.merged.map((m) => (
                  <div key={m.id} className="text-xs text-slate-600 dark:text-slate-400">
                    • {m.member_name}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setConfirmGroupDeliverStop(null)}
                className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => executeDeliver(confirmGroupDeliverStop.id)}
                disabled={actionLoading}
                className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-black shadow-md cursor-pointer"
              >
                تأكيد التسليم
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Custom Direct Position Modal */}
      {directPositionStop && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xs w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-scale-up">
            <h3 className="font-black text-sm text-slate-900 dark:text-white">تغيير رقم الموضع</h3>
            <div className="space-y-1">
              <label className="text-xs text-slate-500">العضو: {directPositionStop.member_name}</label>
              <input
                type="number"
                min="1"
                value={customPositionValue}
                onChange={(e) => setCustomPositionValue(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold text-center"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDirectPositionStop(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500 cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSetPosition}
                className="px-4 py-1.5 rounded-lg bg-emerald-700 text-white text-xs font-bold cursor-pointer"
              >
                تطبيق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Edit Custom Amount & Receipt Number Modal */}
      {editAmountStop && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xs w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-scale-up">
            <div>
              <h3 className="font-black text-sm text-slate-900 dark:text-white">تعديل بيانات الإيصال/المبلغ</h3>
              <p className="text-xs text-slate-500">العضو: {editAmountStop.member_name}</p>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">قيمة الإيصال / المبلغ (ج.م):</label>
                <input
                  type="number"
                  step="0.01"
                  value={editCustomAmountValue}
                  onChange={(e) => setEditCustomAmountValue(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">رقم الإيصال:</label>
                <input
                  type="text"
                  value={editCustomReceiptValue}
                  onChange={(e) => setEditCustomReceiptValue(e.target.value)}
                  placeholder="رقم الإيصال الورقي"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setEditAmountStop(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500 cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSaveCustomAmount}
                disabled={actionLoading}
                className="px-4 py-1.5 rounded-lg bg-emerald-700 text-white text-xs font-bold cursor-pointer shadow-xs"
              >
                حفظ التعديل
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Save Route Template Modal */}
      {isSaveTemplateOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-scale-up">
            <div className="flex items-center gap-2 text-emerald-600">
              <BookmarkCheck className="w-5 h-5" />
              <h3 className="font-black text-base text-slate-900 dark:text-white">حفظ الترتيب الحالي كقالب قياسي</h3>
            </div>
            <p className="text-xs text-slate-500">
              سيتم حفظ الترتيب والمجموعات المدموجة لخط سير هذا الشهر كقالب قياسي (مثل: خط سير المعدات) لتطبيقه في أي شهر مستقبلي بنقرة واحدة.
            </p>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">اسم خط السير / القالب:</label>
                <input
                  type="text"
                  placeholder="مثال: خط سير المعدات والجرار الأساسي"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-semibold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">الوصف (اختياري):</label>
                <textarea
                  rows={2}
                  placeholder="ملاحظات حول هذا الخط..."
                  value={templateDesc}
                  onChange={(e) => setTemplateDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsSaveTemplateOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSaveRouteTemplate}
                disabled={actionLoading}
                className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-black shadow-md cursor-pointer"
              >
                تأكيد الحفظ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. Apply Template / Clone Previous Month Modal */}
      {isApplyTemplateOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FolderDown className="w-5 h-5 text-emerald-600" />
                <h3 className="font-black text-base text-slate-900 dark:text-white">
                  استيراد وتطبيق خط سير
                </h3>
              </div>
              <button
                onClick={() => setIsApplyTemplateOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Selector Tabs */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => setApplyMode('previous_month')}
                className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  applyMode === 'previous_month'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                نسخ من شهر سابق
              </button>
              <button
                type="button"
                onClick={() => setApplyMode('template')}
                className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  applyMode === 'template'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                قالب محفوظ (المعدات)
              </button>
            </div>

            {applyMode === 'previous_month' ? (
              <div className="space-y-3 text-xs sm:text-sm">
                <p className="text-xs text-slate-500">
                  سيتم تطبيق الترتيب المعتمد والمجموعات المدموجة من الشهر المصدر على شهر {month}/{year}.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">الشهر المصدر:</label>
                    <select
                      value={cloneSourceMonth}
                      onChange={(e) => setCloneSourceMonth(Number(e.target.value))}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <option key={m} value={m}>
                          شهر {m}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">السنة المصدر:</label>
                    <input
                      type="number"
                      value={cloneSourceYear}
                      onChange={(e) => setCloneSourceYear(Number(e.target.value))}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-xs sm:text-sm">
                <p className="text-xs text-slate-500">اختر أحد خطوط السير المحفوظة لتطبيقه على هذا الشهر:</p>
                {templates.length === 0 ? (
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 text-center text-slate-400 text-xs">
                    لا توجد قوالب محفوظة بعد. يمكنك حفظ خط السير الحالي كقالب عبر زر "حفظ الترتيب".
                  </div>
                ) : (
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {templates.map((tpl) => (
                      <div
                        key={tpl.id}
                        onClick={() => setSelectedTemplateId(tpl.id)}
                        className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          selectedTemplateId === tpl.id
                            ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 font-bold'
                            : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div>
                          <div className="text-xs font-bold text-slate-800 dark:text-white">{tpl.name}</div>
                          <div className="text-[10px] text-slate-500">
                            {tpl.stops_count} محطة • {new Date(tpl.created_at).toLocaleDateString('ar-EG')}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {selectedTemplateId === tpl.id && <Check className="w-4 h-4 text-emerald-600" />}
                          <button
                            type="button"
                            onClick={(e) => handleDeleteTemplate(tpl.id, e)}
                            title="حذف القالب"
                            className="p-1 hover:text-rose-600 text-slate-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsApplyTemplateOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleApplyTemplate}
                disabled={actionLoading || (applyMode === 'template' && !selectedTemplateId)}
                className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-black shadow-md cursor-pointer"
              >
                تطبيق خط السير
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 10. Print Route Sheet Modal */}
      {isPrintSheetOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 print:p-0 print:bg-white print:fixed">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] flex flex-col print:border-none print:shadow-none print:p-0 print:max-w-none print:max-h-none print:bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-emerald-600" />
                <h3 className="font-black text-base text-slate-900 dark:text-white">
                  معاينة وطباعة كشف خط السير الميداني
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-black cursor-pointer shadow-sm"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة الآن</span>
                </button>
                <button
                  onClick={() => setIsPrintSheetOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Sheet View */}
            <div className="flex-1 overflow-y-auto p-4 bg-white text-black font-sans print:overflow-visible print:p-0">
              <div className="text-center pb-4 border-b-2 border-black space-y-1">
                <h2 className="text-xl font-black">جمعية الثورة الخضراء الزراعية</h2>
                <h3 className="text-base font-bold text-slate-800">
                  كشف خط سير وتسليم إيصالات الممارسات الميداني - شهر {month} / {year}
                </h3>
                <div className="text-xs text-slate-600 flex justify-center gap-6 pt-1 font-semibold">
                  <span>إجمالي المحطات: {pendingStops.length}</span>
                  <span>إجمالي المبالغ: {totalRouteFinancials.pending.toLocaleString('ar-EG')} ج.م</span>
                  <span>تاريخ الطباعة: {new Date().toLocaleDateString('ar-EG')}</span>
                </div>
              </div>

              <table className="w-full text-right text-xs mt-4 border-collapse border border-slate-400">
                <thead>
                  <tr className="bg-slate-200 text-slate-900 font-bold border-b border-slate-400">
                    <th className="p-2 border border-slate-400 text-center w-10">#</th>
                    <th className="p-2 border border-slate-400">اسم العضو / المشترك</th>
                    <th className="p-2 border border-slate-400 text-center w-16">الشارع</th>
                    <th className="p-2 border border-slate-400 w-28">رقم الموبايل</th>
                    <th className="p-2 border border-slate-400">الغفير / هاتف الغفير</th>
                    <th className="p-2 border border-slate-400 text-center w-24">المطلوب</th>
                    <th className="p-2 border border-slate-400 text-center w-36">توقيع المستلم / ملاحظات</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingStops.map((stop) => (
                    <React.Fragment key={stop.id}>
                      <tr className="border-b border-slate-300 hover:bg-slate-50">
                        <td className="p-2 border border-slate-300 text-center font-black">
                          {stop.position}
                        </td>
                        <td className="p-2 border border-slate-300 font-bold">
                          <div>{stop.member_name}</div>
                          {stop.group_members_count > 1 && (
                            <div className="text-[10px] text-blue-700">
                              (مجموعة تضم {stop.group_members_count} أعضاء)
                            </div>
                          )}
                        </td>
                        <td className="p-2 border border-slate-300 text-center">
                          شارع {stop.street_number}
                        </td>
                        <td className="p-2 border border-slate-300 font-mono">
                          {stop.mobile_number || '-'}
                        </td>
                        <td className="p-2 border border-slate-300">
                          {stop.guard_name || '-'}
                          {stop.guard_mobile ? ` (${stop.guard_mobile})` : ''}
                        </td>
                        <td className="p-2 border border-slate-300 text-center font-black text-emerald-800">
                          {stop.group_total_amount} ج.م
                        </td>
                        <td className="p-2 border border-slate-300 text-center">
                          <div className="h-6" />
                        </td>
                      </tr>
                      {/* Sub-rows for merged children */}
                      {stop.merged?.map((child) => (
                        <tr key={child.id} className="border-b border-slate-200 bg-slate-50 text-[11px]">
                          <td className="p-1 border border-slate-300 text-center text-slate-400">↳</td>
                          <td className="p-1 border border-slate-300 pr-4">
                            • {child.member_name} (تابع)
                          </td>
                          <td className="p-1 border border-slate-300 text-center">
                            ش {child.street_number}
                          </td>
                          <td className="p-1 border border-slate-300 font-mono">
                            {child.mobile_number || '-'}
                          </td>
                          <td className="p-1 border border-slate-300 text-slate-500">
                            مدموج مع الرئيسي
                          </td>
                          <td className="p-1 border border-slate-300 text-center font-bold">
                            {child.receipt_amount} ج.م
                          </td>
                          <td className="p-1 border border-slate-300" />
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-between items-center pt-8 text-xs font-bold text-slate-700">
                <div>توقيع المندوب / المحصل: ............................</div>
                <div>اعتماد الإدارة: ............................</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
