import React, { useState, useEffect, useMemo } from 'react';
import {
  Truck, CheckCircle2, RotateCcw, Search, Plus, Users,
  Phone, Compass, ArrowUp, ArrowDown, ArrowUpToLine,
  Trash2, GitMerge, AlertCircle, Sparkles,
  Check, X, MoveVertical
} from 'lucide-react';
import { DeliveryStop, DeliveryAutoMergeGroup, Member } from '../types';
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

  const [isAutoMergeOpen, setIsAutoMergeOpen] = useState(false);
  const [autoMergePreview, setAutoMergePreview] = useState<DeliveryAutoMergeGroup[]>([]);
  const [autoMergeLoading, setAutoMergeLoading] = useState(false);

  const [mergeTargetStop, setMergeTargetStop] = useState<DeliveryStop | null>(null);
  const [selectedStopIdsToMerge, setSelectedStopIdsToMerge] = useState<number[]>([]);

  const [confirmGroupDeliverStop, setConfirmGroupDeliverStop] = useState<DeliveryStop | null>(null);
  const [directPositionStop, setDirectPositionStop] = useState<DeliveryStop | null>(null);
  const [customPositionValue, setCustomPositionValue] = useState<string>('');

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

  const showToast = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3500);
  };

  // Filtered views by status
  const pendingStops = useMemo(() => stops.filter((s) => s.status === 'PENDING'), [stops]);
  const deliveredStops = useMemo(() => stops.filter((s) => s.status === 'DELIVERED'), [stops]);

  // Count metrics
  const totalPendingMembers = useMemo(() => {
    return pendingStops.reduce((acc, s) => acc + (s.group_members_count || 1), 0);
  }, [pendingStops]);

  const totalDeliveredMembers = useMemo(() => {
    return deliveredStops.reduce((acc, s) => acc + (s.group_members_count || 1), 0);
  }, [deliveredStops]);

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
      showToast('تم التسليم بنجاح');
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
      alert('يرجى إدخال رقم صحيح');
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
  const handleDeleteStop = async (stop: DeliveryStop) => {
    if (!window.confirm(`هل أنت متأكد من حذف العضو "${stop.member_name}" من خط السير لهذا الشهر؟ (لن تُمس أي بيانات مالية أو ممارسات)`)) {
      return;
    }
    try {
      setActionLoading(true);
      await deliveryApi.delete(stop.id);
      showToast('تمت إزالة العضو من خط السير');
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
      });
      setIsAddMemberOpen(false);
      setSelectedMemberToAdd(null);
      setAddPosition('');
      showToast('تمت إضافة العضو إلى خط السير');
      loadStops();
    } catch (err: any) {
      const msg = err?.response?.data?.member || err?.response?.data?.error || 'فشلت إضافة العضو';
      alert(Array.isArray(msg) ? msg[0] : msg);
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

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Toast Notification */}
      {successMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-emerald-700 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-emerald-500 animate-slide-down">
          <CheckCircle2 className="w-5 h-5 text-emerald-200" />
          <span className="font-bold text-sm">{successMessage}</span>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="flex items-center gap-2 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs font-bold px-4 py-3 rounded-2xl">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 rounded-3xl p-5 sm:p-7 text-white shadow-xl border border-emerald-700/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300">
                <Truck className="w-6 h-6" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                خط السير والتسليم الميداني
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-emerald-200/80 font-medium">
              ترتيب وتوجيه تسليم الإيصالات للشهر المحدد وتجميع أعضاء الغفير الواحد
            </p>
          </div>

          {/* Quick Actions & Settings Bar */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Auto-fill Button */}
            <button
              onClick={() => setIsBulkAddOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-950/40 transition-all cursor-pointer active:scale-95"
            >
              <Sparkles className="w-4 h-4" />
              <span>تعبئة تلقائية</span>
            </button>

            {/* Add Member Button */}
            <button
              onClick={() => {
                loadAllMembers();
                setIsAddMemberOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-200 text-xs font-bold border border-slate-700 shadow-md transition-all cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة عضو</span>
            </button>

            {/* Auto Merge by Guard Button */}
            <button
              onClick={handleOpenAutoMergeModal}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-800/80 hover:bg-teal-700 text-teal-100 text-xs font-bold border border-teal-600/50 shadow-md transition-all cursor-pointer active:scale-95"
            >
              <GitMerge className="w-4 h-4" />
              <span>دمج تلقائي بالغفير</span>
            </button>

            {/* Receipt Sync Checkbox Pill */}
            <label className="flex items-center gap-2 bg-black/40 hover:bg-black/60 px-3 py-2 rounded-xl border border-emerald-500/30 text-xs font-bold cursor-pointer select-none transition-colors">
              <input
                type="checkbox"
                checked={syncReceipt}
                onChange={(e) => handleToggleSyncReceipt(e.target.checked)}
                className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
              />
              <span className="text-emerald-100 text-[11px] sm:text-xs">
                مزامنة تسليم الإيصالات تلقائياً
              </span>
            </label>
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
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>خط السير (قيد التسليم)</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-black ${
                activeSubTab === 'pending' ? 'bg-emerald-800 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
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
                ? 'bg-teal-700 text-white shadow-md shadow-teal-700/30'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>تم التسليم</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-black ${
                activeSubTab === 'delivered' ? 'bg-teal-900 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              {deliveredStops.length}
            </span>
          </button>
        </div>

        {/* Dynamic Aggregated Summary */}
        <div className="flex items-center gap-3 text-xs font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-3.5 py-2 rounded-xl">
          {activeSubTab === 'pending' ? (
            <span>
              {pendingStops.length === totalPendingMembers
                ? `${pendingStops.length} تسليم متبقٍ`
                : `${pendingStops.length} تسليم لعدد ${totalPendingMembers} عضو`}
            </span>
          ) : (
            <span>
              {deliveredStops.length === totalDeliveredMembers
                ? `${deliveredStops.length} تسليم مكتمل`
                : `${deliveredStops.length} تسليم لعدد ${totalDeliveredMembers} عضو`}
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
              className="w-full pr-10 pl-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-800 dark:text-white outline-none focus:border-emerald-500 transition-colors"
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
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-800 dark:text-white font-semibold outline-none cursor-pointer focus:border-emerald-500"
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
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-800 dark:text-white font-semibold outline-none cursor-pointer focus:border-emerald-500"
            >
              <option value="ALL">الكل (سكني وتجاري)</option>
              <option value="RESIDENTIAL">سكني فقط</option>
              <option value="COMMERCIAL">تجاري فقط</option>
            </select>
          </div>
        </div>

        {/* Warning Banner when Filter is Active */}
        {isFiltered && (
          <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-200 text-xs font-bold px-3 py-2 rounded-xl">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              الترتيب اليدوي والسحب والإفلات معطّل أثناء وجود بحث أو تصفية، لتفادي التداخل في تسلسل خط السير.
            </span>
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
            <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Truck className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base sm:text-lg font-black text-slate-800 dark:text-white">
                لا توجد تسليمات في خط السير حالياً
              </h3>
              <p className="text-xs sm:text-sm text-slate-500">
                يمكنك ملء خط السير تلقائياً من إيصالات الشهر بنقرة واحدة، أو إضافة أعضاء يدوياً
              </p>
            </div>
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={() => setIsBulkAddOpen(true)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md cursor-pointer"
              >
                ⚡ تعبئة تلقائية من الإيصالات
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
                  className={`bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 transition-all shadow-sm border ${
                    isFirst
                      ? 'border-emerald-500 shadow-emerald-500/10 shadow-lg ring-2 ring-emerald-500/20'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  } ${dragOverStopId === stop.id ? 'border-dashed border-2 border-emerald-500 bg-emerald-50/20' : ''}`}
                >
                  {/* Top Badge Banner (if first in queue) */}
                  {isFirst && (
                    <div className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-black px-3 py-1 rounded-full shadow-md mb-3">
                      <span className="w-2 h-2 rounded-full bg-white animate-ping" />
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
                              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          #{stop.position}
                        </div>
                        {!isFiltered && (
                          <div
                            title="سحب لتغيير الترتيب"
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
                            className="font-black text-sm sm:text-base text-slate-900 dark:text-white hover:text-emerald-600 cursor-pointer truncate"
                          >
                            {stop.member_name}
                          </span>

                          {/* Member Type Badge */}
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              stop.member_type === 'COMMERCIAL'
                                ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                                : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            }`}
                          >
                            {stop.member_type_display}
                          </span>

                          {/* Street Badge */}
                          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg">
                            شارع {stop.street_number}
                          </span>

                          {/* Merged Group Badge */}
                          {isGroup && (
                            <span className="text-[11px] font-black bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-300 dark:border-teal-800 px-2.5 py-0.5 rounded-full">
                              مجموعة: {stop.group_members_count} أعضاء
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

                        {/* Receipt Info Pill */}
                        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                          {stop.receipt_id ? (
                            <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-lg font-bold border border-slate-200 dark:border-slate-700 flex items-center gap-1.5">
                              <span>إيصال #{stop.receipt_number || 'بدون رقم'}</span>
                              <span className="text-emerald-600 dark:text-emerald-400">
                                {isGroup
                                  ? `إجمالي المجموعة: ${stop.group_total_amount} ج.م`
                                  : `${stop.receipt_amount} ج.م`}
                              </span>
                              {stop.receipt_status && (
                                <span
                                  className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                                    stop.receipt_status === 'RECEIVED'
                                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                      : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                                  }`}
                                >
                                  {stop.receipt_status === 'RECEIVED' ? 'بالمكتب' : 'لم يستلم'}
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">بدون إيصال لهذا الشهر</span>
                          )}
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
                            onClick={() => {
                              setDirectPositionStop(stop);
                              setCustomPositionValue(String(stop.position));
                            }}
                            title="تحديد رقم الموضع يدوياً"
                            className="px-1.5 py-1 text-[10px] font-black hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg cursor-pointer"
                          >
                            موضع
                          </button>
                        </div>
                      )}

                      {/* Deliver Button */}
                      <button
                        onClick={() => handleDeliver(stop)}
                        disabled={actionLoading}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-black shadow-md shadow-emerald-700/30 transition-all cursor-pointer"
                      >
                        <Check className="w-4 h-4 stroke-[3]" />
                        <span>تسليم</span>
                      </button>

                      {/* Delete Stop from Route */}
                      <button
                        onClick={() => handleDeleteStop(stop)}
                        title="إزالة من خط السير"
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Merged Members Sub-List (Nested inside the Primary Card) */}
                  {isGroup && (
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-800/40 rounded-xl p-3 space-y-2">
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
                                className="px-2 py-1 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-300 text-[10px] font-bold rounded-lg cursor-pointer"
                              >
                                فصل
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
                  className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-black text-sm sm:text-base text-slate-900 dark:text-white">
                        {stop.member_name}
                      </span>
                      <span className="text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-lg">
                        شارع {stop.street_number}
                      </span>
                      {isGroup && (
                        <span className="text-[11px] font-bold bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 px-2 py-0.5 rounded-full">
                          مجموعة: {stop.group_members_count} أعضاء
                        </span>
                      )}
                      {stop.receipt_synced && (
                        <span className="text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
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
                        الأعضاء: {stop.merged.map((m) => m.member_name).join('، ')}
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
                <label className="font-bold text-slate-700 dark:text-slate-300">مصدر الإضافة:</label>
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
                    أصحاب الإيصالات غير المسلّمة لهذا الشهر
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
                    جميع الأعضاء النشطين
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
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md cursor-pointer"
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
              <div className="flex-1 overflow-y-auto space-y-1.5 max-h-56 pr-1">
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

              {/* Optional Custom Position */}
              <div className="space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  الموضع في خط السير (اختياري، الافتراضي: آخر القائمة):
                </label>
                <input
                  type="number"
                  min="1"
                  placeholder="مثال: 1 لجعله في بداية خط السير"
                  value={addPosition}
                  onChange={(e) => setAddPosition(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-semibold"
                />
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
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black shadow-md cursor-pointer"
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
                className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-black shadow-md cursor-pointer"
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
                            شارع {other.street_number} • إيصال: {other.receipt_amount} ج.م
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
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black shadow-md cursor-pointer"
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
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md cursor-pointer"
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
                className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold cursor-pointer"
              >
                تطبيق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
