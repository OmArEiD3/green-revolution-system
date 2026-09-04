import React, { useState, useEffect } from 'react';
import { Navbar, BottomNav } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { MembersView } from './components/MembersView';
import { StreetsView } from './components/StreetsView';
import { CollectionsView } from './components/CollectionsView';
import { ReceiptsView } from './components/ReceiptsView';
import { FinancialsView } from './components/FinancialsView';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';
import { LoginView } from './components/LoginView';
import { AddMemberModal, AddPracticeModal, RecordPaymentModal, AddExpenseModal } from './components/QuickActionModals';
import { MemberDetailModal } from './components/MemberDetailModal';
import { User } from './types';
import { authApi } from './api/client';

export const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');

  // Active Year and Month state (Defaults to Current Month: September 2026)
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(9);

  // Selected Street filter for street drilldown
  const [selectedStreet, setSelectedStreet] = useState<number | null>(null);

  // Modals state
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isAddPracticeOpen, setIsAddPracticeOpen] = useState(false);
  const [addPracticeMemberId, setAddPracticeMemberId] = useState<number | undefined>(undefined);
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [paymentModalData, setPaymentModalData] = useState<{ practiceId?: number; memberId?: number }>({});
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [selectedMemberDetailId, setSelectedMemberDetailId] = useState<number | null>(null);

  // Refresh trigger for views after actions
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    authApi
      .me()
      .then((res) => {
        if (res.authenticated && res.user) {
          setUser(res.user);
        }
      })
      .catch(console.error)
      .finally(() => setAuthChecked(true));
  }, []);

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch (e) {
      console.error(e);
    }
    setUser(null);
  };

  const handleSelectStreet = (streetNum: number) => {
    setSelectedStreet(streetNum);
    setActiveTab('members');
  };

  const handleRecordPaymentForMember = (practiceId: number, memberId: number) => {
    setPaymentModalData({ practiceId, memberId });
    setIsRecordPaymentOpen(true);
  };

  const handleOpenAddPractice = (memberId?: number) => {
    setAddPracticeMemberId(memberId);
    setIsAddPracticeOpen(true);
  };

  const handleSuccessAction = () => {
    setRefreshKey((k) => k + 1);
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-2xl animate-bounce">
            🌱
          </div>
          <span className="text-sm font-bold text-slate-300">جاري تحميل نظام الثورة الخضراء...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginView onLoginSuccess={(loggedInUser) => setUser(loggedInUser)} />;
  }

  return (
    <div className="min-h-screen bg-slate-100/70 flex flex-col text-slate-900 selection:bg-emerald-200">
      {/* Top Navbar */}
      <Navbar
        user={user}
        activeTab={activeTab}
        setActiveTab={(t) => {
          if (t !== 'members') setSelectedStreet(null);
          setActiveTab(t);
        }}
        onLogout={handleLogout}
        year={year}
        month={month}
        setYear={setYear}
        setMonth={setMonth}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3.5 sm:p-6 lg:p-8 mb-20 md:mb-6">
        {activeTab === 'dashboard' && (
          <DashboardView
            key={`dash-${refreshKey}-${year}-${month}`}
            year={year}
            month={month}
            onNavigateTab={setActiveTab}
            onOpenAddMember={() => setIsAddMemberOpen(true)}
            onOpenAddPractice={() => handleOpenAddPractice()}
            onOpenRecordPayment={() => {
              setPaymentModalData({});
              setIsRecordPaymentOpen(true);
            }}
            onOpenAddExpense={() => setIsAddExpenseOpen(true)}
          />
        )}

        {activeTab === 'members' && (
          <MembersView
            key={`members-${refreshKey}-${selectedStreet}`}
            selectedStreet={selectedStreet}
            onOpenAddMember={() => setIsAddMemberOpen(true)}
            onSelectMember={(mId) => setSelectedMemberDetailId(mId)}
          />
        )}

        {activeTab === 'streets' && (
          <StreetsView
            key={`streets-${refreshKey}-${year}-${month}`}
            year={year}
            month={month}
            onSelectStreet={handleSelectStreet}
          />
        )}

        {activeTab === 'collections' && (
          <CollectionsView
            key={`collections-${refreshKey}-${year}-${month}`}
            year={year}
            month={month}
            onRecordPayment={handleRecordPaymentForMember}
            onOpenAddPractice={() => handleOpenAddPractice()}
            onSelectMember={(mId) => setSelectedMemberDetailId(mId)}
          />
        )}

        {activeTab === 'receipts' && (
          <ReceiptsView
            key={`receipts-${refreshKey}-${year}-${month}`}
            year={year}
            month={month}
            onSelectMember={(mId) => setSelectedMemberDetailId(mId)}
          />
        )}

        {activeTab === 'financials' && (
          <FinancialsView
            key={`financials-${refreshKey}-${year}-${month}`}
            year={year}
            month={month}
            onOpenAddExpense={() => setIsAddExpenseOpen(true)}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsView
            key={`reports-${refreshKey}-${year}-${month}`}
            year={year}
            month={month}
            onSelectStreet={handleSelectStreet}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView key={`settings-${refreshKey}`} />
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Global Action Modals */}
      <AddMemberModal
        isOpen={isAddMemberOpen}
        onClose={() => setIsAddMemberOpen(false)}
        onSuccess={handleSuccessAction}
      />

      <AddPracticeModal
        isOpen={isAddPracticeOpen}
        onClose={() => {
          setIsAddPracticeOpen(false);
          setAddPracticeMemberId(undefined);
        }}
        onSuccess={handleSuccessAction}
        initialMemberId={addPracticeMemberId}
        year={year}
        month={month}
      />

      <RecordPaymentModal
        isOpen={isRecordPaymentOpen}
        onClose={() => {
          setIsRecordPaymentOpen(false);
          setPaymentModalData({});
        }}
        onSuccess={handleSuccessAction}
        initialPracticeId={paymentModalData.practiceId}
        initialMemberId={paymentModalData.memberId}
        year={year}
        month={month}
      />

      <AddExpenseModal
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
        onSuccess={handleSuccessAction}
      />

      <MemberDetailModal
        isOpen={Boolean(selectedMemberDetailId)}
        memberId={selectedMemberDetailId}
        onClose={() => setSelectedMemberDetailId(null)}
        onRecordPayment={handleRecordPaymentForMember}
        onOpenAddPracticeForMember={(mId) => handleOpenAddPractice(mId)}
        year={year}
        month={month}
      />
    </div>
  );
};

export default App;
