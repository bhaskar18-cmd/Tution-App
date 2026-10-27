import React, { useEffect, useState } from 'react';
import { NavTab, AppSettings, Student, FeeRecord, Payment } from './types';
import { db, initDefaultSettings, seedDemoData } from './db/db';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { BatchesView } from './components/BatchesView';
import { StudentsView } from './components/StudentsView';
import { AttendanceView } from './components/AttendanceView';
import { FeesView } from './components/FeesView';
import { PaymentsView } from './components/PaymentsView';
import { SettingsView } from './components/SettingsView';
import { RemindersModal } from './components/RemindersModal';
import { ReceiptModal } from './components/ReceiptModal';

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [initialStudentBatchFilter, setInitialStudentBatchFilter] = useState<string>('all');

  // Modals state
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [preselectedFeeId, setPreselectedFeeId] = useState<string | undefined>();
  const [preselectedStudentId, setPreselectedStudentId] = useState<string | undefined>();

  const [isReminderOpen, setIsReminderOpen] = useState(false);
  const [reminderStudent, setReminderStudent] = useState<Student | null>(null);
  const [reminderFee, setReminderFee] = useState<FeeRecord | null>(null);
  const [reminderType, setReminderType] = useState<'whatsapp' | 'sms'>('whatsapp');
  const [allPayments, setAllPayments] = useState<Payment[]>([]);

  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [receiptPayment, setReceiptPayment] = useState<Payment | null>(null);
  const [receiptStudent, setReceiptStudent] = useState<Student | null>(null);
  const [receiptFee, setReceiptFee] = useState<FeeRecord | null>(null);

  useEffect(() => {
    initializeApp();
  }, []);

  async function initializeApp() {
    try {
      const s = await initDefaultSettings();
      setSettings(s);
      const pList = await db.payments.toArray();
      setAllPayments(pList);
    } catch (err) {
      console.error('Failed to initialize app', err);
    }
  }

  const handleLoadDemoData = async () => {
    await seedDemoData();
    window.location.reload();
  };

  const handleOpenRecordPayment = (feeId?: string, studentId?: string) => {
    setPreselectedFeeId(feeId);
    setPreselectedStudentId(studentId);
    setIsRecordPaymentOpen(true);
  };

  const handleOpenWhatsApp = (student: Student, fee?: FeeRecord) => {
    setReminderStudent(student);
    setReminderFee(fee || null);
    setReminderType('whatsapp');
    setIsReminderOpen(true);
  };

  const handleOpenSms = (student: Student, fee?: FeeRecord) => {
    setReminderStudent(student);
    setReminderFee(fee || null);
    setReminderType('sms');
    setIsReminderOpen(true);
  };

  const handleOpenReceipt = (payment: Payment, student: Student, fee: FeeRecord) => {
    setReceiptPayment(payment);
    setReceiptStudent(student);
    setReceiptFee(fee);
    setIsReceiptOpen(true);
  };

  const handleNavigateToStudentsWithBatch = (batchId?: string) => {
    setInitialStudentBatchFilter(batchId || 'all');
    setCurrentTab('students');
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans antialiased selection:bg-blue-600 selection:text-white">
      {/* Navigation */}
      <Navbar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        settings={settings}
      />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {currentTab === 'dashboard' && (
          <Dashboard
            onNavigate={setCurrentTab}
            onOpenAddStudent={() => setCurrentTab('students')}
            onOpenRecordPayment={() => handleOpenRecordPayment()}
            onOpenExportBackup={() => setCurrentTab('settings')}
            onLoadDemoData={handleLoadDemoData}
          />
        )}

        {currentTab === 'batches' && (
          <BatchesView
            onNavigateToStudents={handleNavigateToStudentsWithBatch}
          />
        )}

        {currentTab === 'students' && (
          <StudentsView
            initialBatchFilter={initialStudentBatchFilter}
            onOpenWhatsApp={handleOpenWhatsApp}
            onOpenSms={handleOpenSms}
            onNavigateToBatches={() => setCurrentTab('batches')}
          />
        )}

        {currentTab === 'attendance' && (
          <AttendanceView
            onNavigateToBatches={() => setCurrentTab('batches')}
            onNavigateToStudents={() => setCurrentTab('students')}
          />
        )}

        {currentTab === 'fees' && (
          <FeesView
            onOpenRecordPayment={handleOpenRecordPayment}
            onOpenWhatsApp={handleOpenWhatsApp}
            onOpenSms={handleOpenSms}
          />
        )}

        {currentTab === 'payments' && (
          <PaymentsView
            isRecordModalOpen={isRecordPaymentOpen}
            onCloseRecordModal={() => setIsRecordPaymentOpen(false)}
            preselectedFeeId={preselectedFeeId}
            preselectedStudentId={preselectedStudentId}
            onOpenReceipt={handleOpenReceipt}
          />
        )}

        {currentTab === 'settings' && (
          <SettingsView
            settings={settings}
            onSettingsUpdated={initializeApp}
          />
        )}
      </main>

      {/* Reminders Modal */}
      <RemindersModal
        isOpen={isReminderOpen}
        onClose={() => setIsReminderOpen(false)}
        student={reminderStudent}
        fee={reminderFee}
        payments={allPayments}
        defaultType={reminderType}
      />

      {/* Receipt Modal */}
      <ReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        payment={receiptPayment}
        student={receiptStudent}
        fee={receiptFee}
        settings={settings}
      />
    </div>
  );
}
