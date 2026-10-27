import React, { useEffect, useState } from 'react';
import { db } from '../db/db';
import { Student, FeeRecord, Payment, FeeStatus } from '../types';
import { formatCurrency, formatDate, calculateDueDate, calculateFeePaidAmount, getFeeStatus, getLocalDateString } from '../utils/formatters';
import { 
  FileText, Plus, Search, Calendar, MessageSquare, Phone, 
  CheckCircle, AlertCircle, Clock, IndianRupee, RefreshCw, X, Check 
} from 'lucide-react';

interface FeesViewProps {
  onOpenRecordPayment: (feeRecordId?: string, studentId?: string) => void;
  onOpenWhatsApp: (student: Student, fee?: FeeRecord) => void;
  onOpenSms: (student: Student, fee?: FeeRecord) => void;
}

export const FeesView: React.FC<FeesViewProps> = ({ onOpenRecordPayment, onOpenWhatsApp, onOpenSms }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [feeRecords, setFeeRecords] = useState<FeeRecord[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<string>(String(currentDate.getMonth() + 1).padStart(2, '0'));
  const [statusFilter, setStatusFilter] = useState<FeeStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const todayStr = getLocalDateString();

  useEffect(() => {
    loadFeeData();
  }, [selectedYear, selectedMonth]);

  async function loadFeeData() {
    try {
      const [sList, fList, pList] = await Promise.all([
        db.students.toArray(),
        db.feeRecords.where({ billingMonth: selectedMonth, billingYear: selectedYear }).toArray(),
        db.payments.toArray()
      ]);
      setStudents(sList);
      setFeeRecords(fList);
      setPayments(pList);
    } catch (err) {
      console.error('Failed to load fee data', err);
    }
  }

  const handleGenerateMonthlyFees = async () => {
    const now = Date.now();
    let generatedCount = 0;
    const yearNum = selectedYear;
    const monthNum = parseInt(selectedMonth);

    try {
      for (const student of students.filter(s => s.active)) {
        // Check if fee record already exists for this student and billing period
        const exists = feeRecords.some(f => f.studentId === student.id && f.billingMonth === selectedMonth && f.billingYear === selectedYear);
        if (!exists) {
          const dueDate = calculateDueDate(yearNum, monthNum, student.dueDay);
          const newFee: FeeRecord = {
            id: `fee-${student.id}-${yearNum}-${selectedMonth}`,
            studentId: student.id,
            billingMonth: selectedMonth,
            billingYear: yearNum,
            amountCharged: student.monthlyFee,
            dueDate,
            createdAt: now,
            updatedAt: now
          };
          await db.feeRecords.add(newFee);
          generatedCount++;
        }
      }

      setSuccessMessage(`Generated ${generatedCount} new fee records for ${selectedMonth}/${selectedYear}.`);
      setTimeout(() => setSuccessMessage(''), 4000);
      loadFeeData();
    } catch {
      alert('Failed to generate monthly fees.');
    }
  };

  // Build fee items list combining active students and their fee records for the month
  const feeItems = students.filter(s => s.active).map(student => {
    const fee = feeRecords.find(f => f.studentId === student.id);
    if (!fee) {
      return {
        student,
        fee: null,
        paid: 0,
        balance: student.monthlyFee,
        status: 'pending' as FeeStatus,
        dueDate: calculateDueDate(selectedYear, parseInt(selectedMonth), student.dueDay)
      };
    }

    const paid = calculateFeePaidAmount(fee.id, payments);
    const balance = Math.max(0, fee.amountCharged - paid);
    const status = getFeeStatus(fee, payments, todayStr);

    return {
      student,
      fee,
      paid,
      balance,
      status,
      dueDate: fee.dueDate
    };
  }).filter(item => {
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return item.student.name.toLowerCase().includes(q) || item.student.className.toLowerCase().includes(q);
    }
    return true;
  });

  // Summary totals for selected month
  const totalChargedMonth = feeRecords.reduce((sum, f) => sum + f.amountCharged, 0);
  const totalCollectedMonth = payments
    .filter(p => !p.isReversed && p.paymentDate.startsWith(`${selectedYear}-${selectedMonth}`))
    .reduce((sum, p) => sum + p.amount, 0);

  const monthsList = [
    { value: '01', label: 'January' },
    { value: '02', label: 'February' },
    { value: '03', label: 'March' },
    { value: '04', label: 'April' },
    { value: '05', label: 'May' },
    { value: '06', label: 'June' },
    { value: '07', label: 'July' },
    { value: '08', label: 'August' },
    { value: '09', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ];

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Header & Month/Year selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Fee Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">Track billing periods, outstanding balances, and payment statuses</p>
        </div>

        <div className="flex items-center space-x-3">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            {monthsList.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            {[2025, 2026, 2027, 2028].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          <button
            onClick={handleGenerateMonthlyFees}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-xl shadow-md transition-colors text-xs flex items-center space-x-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Generate Fees</span>
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-sm flex items-center space-x-2 animate-in fade-in">
          <Check className="w-5 h-5 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Monthly Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Total Charged ({selectedMonth}/{selectedYear})</span>
          <span className="text-2xl font-bold text-slate-900">{formatCurrency(totalChargedMonth)}</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Total Collected</span>
          <span className="text-2xl font-bold text-emerald-600">{formatCurrency(totalCollectedMonth)}</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Outstanding Balance</span>
          <span className="text-2xl font-bold text-amber-600">{formatCurrency(totalChargedMonth - totalCollectedMonth)}</span>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search student in fees..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm"
          />
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl overflow-x-auto w-full md:w-auto">
          {(['all', 'pending', 'partially_paid', 'paid', 'overdue'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize whitespace-nowrap ${
                statusFilter === st ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Fee Items List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="divide-y divide-slate-100">
          {feeItems.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm">
              No fee records found for this period. Click "Generate Fees" above to create billing records.
            </div>
          ) : (
            feeItems.map(({ student, fee, paid, balance, status, dueDate }) => {
              const statusBadgeStyles = {
                paid: 'bg-emerald-100 text-emerald-700',
                partially_paid: 'bg-blue-100 text-blue-700',
                pending: 'bg-amber-100 text-amber-700',
                overdue: 'bg-red-100 text-red-700',
              }[status];

              return (
                <div key={student.id} className="p-4 md:px-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="font-bold text-slate-900 text-base">{student.name}</h4>
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-medium">{student.className}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Due Date: {formatDate(dueDate)} • Monthly Fee: {formatCurrency(student.monthlyFee)}
                    </p>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <span className="text-sm font-bold text-slate-900 block">
                        Balance: {formatCurrency(balance)}
                      </span>
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full inline-block mt-0.5 uppercase ${statusBadgeStyles}`}>
                        {status.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      {balance > 0 && (
                        <>
                          <button
                            onClick={() => onOpenWhatsApp(student, fee || undefined)}
                            title="Send WhatsApp Reminder"
                            className="p-2 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onOpenSms(student, fee || undefined)}
                            title="Send SMS Reminder"
                            className="p-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                          >
                            <Phone className="w-4 h-4" />
                          </button>
                        </>
                      )}

                      {balance > 0 && fee && (
                        <button
                          onClick={() => onOpenRecordPayment(fee.id, student.id)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl text-xs font-semibold shadow-sm transition-colors"
                        >
                          Record Payment
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
