import React, { useState, useEffect } from 'react';
import {
  Users, Search, Filter, Phone, MapPin, Plus, UserCheck,
  Shield, ChevronLeft, Eye, X, MessageSquare
} from 'lucide-react';
import { Member } from '../types';
import { membersApi } from '../api/client';

interface MembersViewProps {
  onOpenAddMember: () => void;
  onSelectMember: (memberId: number) => void;
  selectedStreet?: number | null;
}

export const MembersView: React.FC<MembersViewProps> = ({
  onOpenAddMember,
  onSelectMember,
  selectedStreet,
}) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState('');
  const [streetFilter, setStreetFilter] = useState<number | string>(selectedStreet || '');
  const [loading, setLoading] = useState(true);

  const fetchMembers = () => {
    setLoading(true);
    membersApi
      .list({
        street: streetFilter || undefined,
        search: search || undefined,
      })
      .then(setMembers)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (selectedStreet) setStreetFilter(selectedStreet);
  }, [selectedStreet]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMembers();
    }, 150);
    return () => clearTimeout(timer);
  }, [search, streetFilter]);

  return (
    <div className="space-y-4 animate-slide-up">
      {/* Header & Controls */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Users className="w-6 h-6 text-emerald-700" />
              <span>دليل وسجل الأعضاء</span>
            </h1>
            <span className="px-3 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black border border-emerald-200">
              {members.length} عضو مسجل
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            البحث الفوري بالاسم أو رقم الموبايل أو الرقم القومي لجميع شوارع الثورة الخضراء
          </p>
        </div>

        <button
          onClick={onOpenAddMember}
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs sm:text-sm shadow-md shadow-emerald-900/20 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>+ إضافة عضو جديد</span>
        </button>
      </div>

      {/* Quick Search & Street Filter Bar */}
      <div className="space-y-3">
        {/* Search Bar */}
        <div className="relative">
          <Search className="w-5 h-5 text-emerald-700 absolute right-4 top-3.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث بالاسم بالكامل، رقم الهاتف، أو الرقم القومي..."
            className="w-full pr-12 pl-10 py-3.5 bg-white rounded-2xl border border-slate-300 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-500/15 outline-none text-sm font-semibold text-slate-900 shadow-sm transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute left-3.5 top-3.5 p-1 rounded-lg bg-slate-100 text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Street Quick Filter Pills (Scrollable on Mobile) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setStreetFilter('')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              streetFilter === ''
                ? 'bg-emerald-800 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            جميع الشوارع (1 - 17)
          </button>
          {Array.from({ length: 17 }, (_, i) => i + 1).map((s) => (
            <button
              key={s}
              onClick={() => setStreetFilter(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                streetFilter === s
                  ? 'bg-emerald-700 text-white shadow-sm scale-105'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              شارع {s}
            </button>
          ))}
        </div>
      </div>

      {/* Members Cards Grid */}
      {loading ? (
        <div className="text-center py-16 text-slate-400 text-sm bg-white rounded-3xl border border-slate-200">
          جاري البحث وتحميل الأعضاء...
        </div>
      ) : members.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-300 p-8">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
            <Users className="w-7 h-7" />
          </div>
          <h3 className="font-bold text-slate-800 text-base">لم يتم العثور على أي أعضاء</h3>
          <p className="text-xs text-slate-400 mt-1">تأكد من كتابة الاسم أو رقم الموبايل بشكل دقيق</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {members.map((m) => (
            <div
              key={m.id}
              onClick={() => onSelectMember(m.id)}
              className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-emerald-500/50 transition-all duration-300 cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <h3 className="font-black text-slate-900 text-base group-hover:text-emerald-800 transition-colors">
                      {m.full_name}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                      <span className="font-bold text-emerald-800 flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
                        <MapPin className="w-3 h-3 text-emerald-600" />
                        شارع {m.street_number}
                      </span>
                      {m.national_id && <span className="font-mono text-[11px] text-slate-400">• {m.national_id}</span>}
                    </div>
                  </div>

                  <div className="w-9 h-9 rounded-2xl bg-emerald-700 text-white font-black text-xs flex items-center justify-center shadow-md">
                    {m.street_number}
                  </div>
                </div>

                {/* Direct Mobile Quick Actions */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  <a
                    href={`tel:${m.mobile_number}`}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-emerald-50 text-slate-800 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 text-xs font-black transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="font-mono">{m.mobile_number}</span>
                  </a>

                  {m.has_guard && (
                    <span className="text-[11px] text-slate-600 font-semibold flex items-center gap-1 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200">
                      <Shield className="w-3 h-3 text-emerald-600" />
                      {m.guard_name ? m.guard_name : 'غفير'}
                    </span>
                  )}
                </div>
              </div>

              {/* Action Trigger Link */}
              <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-emerald-700 group-hover:text-emerald-900">
                <span>فتح ملف العضو ومستحقات الشهر</span>
                <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
