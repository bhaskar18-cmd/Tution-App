import React, { useEffect, useState } from 'react';
import { db } from '../db/db';
import { Student, Attendance, FeeRecord, Payment, NavTab } from '../types';
import { getLocalDateString, formatCurrency, getFeeStatus } from '../utils/formatters';
import { 
  Users, UserCheck, UserX, Clock, IndianRupee, AlertCircle, 
  Plus, CalendarCheck, CreditCard, FileText, Download, Sparkles, Search, ArrowRight 
} from 'lucide-react';

interface DashboardProps {
  onNavigate: (tab: NavTab) => void;
  onOpenAddStudent: () => void;
  onOpenRecordPayment: () => void;
  onOpenExportBackup: () => void;
  onLoadDemoData: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onNavigate,
  onOpenAddStudent,
  onOpenRecordPayment,
  onOpenExportBackup,
  onLoadDemoData
}) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [feeRecords, setFeeRecords] = useState<FeeRecord[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const todayStr = getLocalDateString();
  const currentYear = new Date().getFullYear();
  const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    try {
      const [sList, aList, fList, pList] = await Promise.all([
        db.students.toArray(),
        db.attendance.where('date').equals(todayStr).toArray(),
        db.feeRecords.toArray(),
        db.payments.toArray()
      ]);
      setStudents(sList);
      setAttendance(aList);
      setFeeRecords(fList);
      setPayments(pList);
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setLoading(false);
    }
  }

  // Calculations
  const activeStudents = students.filter(s => s.active);
  const totalActiveCount = activeStudents.length;

  const presentTodayCount = attendance.filter(a => a.status === 'present').length;
  const absentTodayCount = attendance.filter(a => a.status === 'absent').length;
  
  // Students marked today
  const markedStudentIds = new Set(attendance.map(a => a.studentId));
  const unmarkedCount = activeStudents.filter(s => !markedStudentIds.has(s.id)).length;

  // Monthly fees collected
  const currentMonthPayments = payments.filter(p => {
    if (p.isReversed) return false;
    return p.paymentDate.startsWith(`${currentYear}-${currentMonth}`);
  });
  const totalMonthlyCollected = currentMonthPayments.reduce((sum, p) => sum + p.amount, 0);

  // Fee balances & overdue
  let totalOutstanding = 0;
  let overdueStudentsCount = 0;
  const overdueList: { student: Student; fee: FeeRecord; balance: number }[] = [];

  feeRecords.forEach(fee => {
    const student = students.find(s => s.id === fee.studentId);
    if (!student || !student.active) return;
    
    const paid = payments
      .filter(p => p.feeRecordId === fee.id && !p.isReversed)
      .reduce((s, p) => s + p.amount, 0);
    const balance = fee.amountCharged - paid;

    if (balance > 0) {
      totalOutstanding += balance;
      const status = getFeeStatus(fee, payments, todayStr);
      if (status === 'overdue') {
        overdueStudentsCount++;
        overdueList.push({ student, fee, balance });
      }
    }
  });

  const searchResults = searchQuery.trim()
    ? students.filter(s => 
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.className.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.phoneNumber.includes(searchQuery)
      )
    : [];

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Welcome & Demo Data Banner if empty */}
      {students.length === 0 && (
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold flex items-center space-x-2">
              <Sparkles className="w-6 h-6 text-amber-300" />
              <span>Welcome to TutorTrack!</span>
            </h2>
            <p className="text-blue-100 text-sm mt-1">
              Get started by adding your first student or load demo data to explore all features instantly.
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onLoadDemoData}
              className="bg-white text-blue-700 hover:bg-blue-50 font-semibold px-4 py-2.5 rounded-xl shadow-md transition-colors text-sm"
            >
              Load Demo Data
            </button>
            <button
              onClick={onOpenAddStudent}
              className="bg-blue-800 hover:bg-blue-900 text-white font-semibold px-4 py-2.5 rounded-xl shadow-md transition-colors text-sm"
            >
              Add Student
            </button>
          </div>
        </div>
      )}

      {/* Quick Search Bar */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
        <div className="relative">
          <Search className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Quick search student by name, class, or phone..."
            className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm"
          />
        </div>

        {searchQuery.trim() && (
          <div className="mt-3 divide-y divide-slate-100 max-h-60 overflow-y-auto">
            {searchResults.length === 0 ? (
              <p className="py-2 text-center text-xs text-slate-500">No students found matching "{searchQuery}"</p>
            ) : (
              searchResults.map(stu => (
                <div key={stu.id} className="py-2.5 flex items-center justify-between hover:bg-slate-50 px-2 rounded-lg">
                  <div>
                    <span className="font-semibold text-sm text-slate-800">{stu.name}</span>
                    <span className="text-xs text-slate-500 ml-2">({stu.className})</span>
                    <span className="text-xs text-slate-400 block">{stu.phoneNumber}</span>
                  </div>
                  <button
                    onClick={() => onNavigate('students')}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center space-x-1"
                  >
                    <span>View</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Quick Actions Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <button
          onClick={onOpenAddStudent}
          className="bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-2xl p-3.5 flex flex-col items-center text-center transition-all shadow-sm group"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            <Plus className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold text-slate-700">Add Student</span>
        </button>

        <button
          onClick={() => onNavigate('attendance')}
          className="bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-2xl p-3.5 flex flex-col items-center text-center transition-all shadow-sm group"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            <CalendarCheck className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold text-slate-700">Mark Attendance</span>
        </button>

        <button
          onClick={onOpenRecordPayment}
          className="bg-white hover:bg-amber-50 border border-slate-200 hover:border-amber-300 rounded-2xl p-3.5 flex flex-col items-center text-center transition-all shadow-sm group"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            <CreditCard className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold text-slate-700">Record Payment</span>
        </button>

        <button
          onClick={() => onNavigate('fees')}
          className="bg-white hover:bg-purple-50 border border-slate-200 hover:border-purple-300 rounded-2xl p-3.5 flex flex-col items-center text-center transition-all shadow-sm group"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            <FileText className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold text-slate-700">Pending Fees</span>
        </button>

        <button
          onClick={onOpenExportBackup}
          className="col-span-2 sm:col-span-1 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-2xl p-3.5 flex flex-col items-center text-center transition-all shadow-sm group"
        >
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            <Download className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold text-slate-700">Export Backup</span>
        </button>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Active Students */}
        <div 
          onClick={() => onNavigate('students')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:border-blue-400 transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Students</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{totalActiveCount}</div>
          <p className="text-xs text-slate-400 mt-1">{students.length} total registered</p>
        </div>

        {/* Present Today */}
        <div 
          onClick={() => onNavigate('attendance')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:border-emerald-400 transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Present Today</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-600">{presentTodayCount}</div>
          <p className="text-xs text-slate-400 mt-1">{absentTodayCount} absent today</p>
        </div>

        {/* Unmarked Attendance */}
        <div 
          onClick={() => onNavigate('attendance')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:border-amber-400 transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Unmarked Today</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-600">
            {unmarkedCount > 0 ? unmarkedCount : 'Not marked'}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {unmarkedCount > 0 ? 'Pending attendance' : 'All marked'}
          </p>
        </div>

        {/* Monthly Collections */}
        <div 
          onClick={() => onNavigate('fees')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:border-purple-400 transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Collected (This Month)</span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <IndianRupee className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-purple-700">{formatCurrency(totalMonthlyCollected)}</div>
          <p className="text-xs text-slate-400 mt-1">Outstanding: {formatCurrency(totalOutstanding)}</p>
        </div>
      </div>

      {/* Financial & Overdue Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Financial Summary Box */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800 text-base">Financial Overview</h3>
            <button
              onClick={() => onNavigate('fees')}
              className="text-xs text-blue-600 hover:underline font-semibold"
            >
              View Fees
            </button>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
              <span className="text-sm text-slate-600">Total Outstanding Balance</span>
              <span className="text-base font-bold text-slate-900">{formatCurrency(totalOutstanding)}</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-red-50 rounded-xl border border-red-100">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <span className="text-sm font-medium text-red-900">Overdue Fees</span>
              </div>
              <span className="text-base font-bold text-red-600">{overdueStudentsCount} students</span>
            </div>
          </div>
        </div>

        {/* Overdue Alert List */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800 text-base">Urgent Overdue Payments</h3>
            <span className="text-xs bg-red-100 text-red-700 px-2.5 py-1 rounded-full font-semibold">
              {overdueList.length} Overdue
            </span>
          </div>

          <div className="space-y-3 max-h-48 overflow-y-auto">
            {overdueList.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs">
                No overdue fee records. Excellent payment status!
              </div>
            ) : (
              overdueList.map(({ student, fee, balance }) => (
                <div key={fee.id} className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors">
                  <div>
                    <h4 className="font-semibold text-sm text-slate-800">{student.name}</h4>
                    <p className="text-xs text-slate-500">Due: {fee.dueDate} ({student.className})</p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-red-600">{formatCurrency(balance)}</span>
                    <button
                      onClick={onOpenRecordPayment}
                      className="block text-[11px] text-blue-600 hover:underline font-medium mt-0.5"
                    >
                      Record Payment
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
