import React, { useEffect, useState } from 'react';
import { db } from '../db/db';
import { Student, FeeRecord, Payment } from '../types';
import { formatCurrency, formatDate, getLocalDateString } from '../utils/formatters';
import { 
  CreditCard, Plus, Search, Download, Printer, RotateCcw, Check, X, ShieldAlert, IndianRupee 
} from 'lucide-react';

interface PaymentsViewProps {
  isRecordModalOpen: boolean;
  onCloseRecordModal: () => void;
  preselectedFeeId?: string;
  preselectedStudentId?: string;
  onOpenReceipt: (payment: Payment, student: Student, fee: FeeRecord) => void;
}

export const PaymentsView: React.FC<PaymentsViewProps> = ({
  isRecordModalOpen,
  onCloseRecordModal,
  preselectedFeeId,
  preselectedStudentId,
  onOpenReceipt
}) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [feeRecords, setFeeRecords] = useState<FeeRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMonth, setFilterMonth] = useState<string>('all');

  // Modal state for recording payment
  const [isOpen, setIsOpen] = useState(isRecordModalOpen);
  const [studentId, setStudentId] = useState(preselectedStudentId || '');
  const [feeRecordId, setFeeRecordId] = useState(preselectedFeeId || '');
  const [amount, setAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState(getLocalDateString());
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'UPI' | 'Bank Transfer' | 'Other'>('UPI');
  const [transactionReference, setTransactionReference] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    setIsOpen(isRecordModalOpen);
    if (preselectedStudentId) setStudentId(preselectedStudentId);
    if (preselectedFeeId) setFeeRecordId(preselectedFeeId);
  }, [isRecordModalOpen, preselectedFeeId, preselectedStudentId]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [pList, sList, fList] = await Promise.all([
        db.payments.toArray(),
        db.students.toArray(),
        db.feeRecords.toArray()
      ]);
      setPayments(pList);
      setStudents(sList);
      setFeeRecords(fList);
    } catch (err) {
      console.error('Failed to load payment data', err);
    }
  }

  // When student changes, load their unpaid or available fee records
  const studentFees = feeRecords.filter(f => f.studentId === studentId);

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId) {
      setFormError('Please select a student.');
      return;
    }
    if (!feeRecordId) {
      setFormError('Please select a billing fee record.');
      return;
    }
    if (amount <= 0) {
      setFormError('Payment amount must be greater than zero.');
      return;
    }

    // Verify remaining balance for selected fee record
    const fee = feeRecords.find(f => f.id === feeRecordId);
    if (!fee) {
      setFormError('Selected fee record not found.');
      return;
    }

    const alreadyPaid = payments
      .filter(p => p.feeRecordId === feeRecordId && !p.isReversed)
      .reduce((sum, p) => sum + p.amount, 0);
    const maxAllowed = fee.amountCharged - alreadyPaid;

    if (amount > maxAllowed) {
      setFormError(`Payment amount (${formatCurrency(amount)}) exceeds remaining fee balance (${formatCurrency(maxAllowed)}).`);
      return;
    }

    const now = Date.now();
    try {
      const newPayment: Payment = {
        id: `pay-${now}-${Math.random().toString(36).substr(2, 4)}`,
        studentId,
        feeRecordId,
        amount: Number(amount),
        paymentDate,
        paymentMethod,
        transactionReference: transactionReference.trim() || undefined,
        notes: notes.trim() || undefined,
        createdAt: now,
        updatedAt: now
      };

      await db.payments.add(newPayment);
      setIsOpen(false);
      onCloseRecordModal();
      loadData();
    } catch {
      setFormError('Failed to record payment.');
    }
  };

  const handleReversePayment = async (payment: Payment) => {
    const reason = window.prompt('Enter reason for payment correction/reversal:');
    if (reason === null) return;

    try {
      const updated: Payment = {
        ...payment,
        isReversed: true,
        reversalReason: reason.trim() || 'Corrected by teacher',
        updatedAt: Date.now()
      };
      await db.payments.put(updated);
      loadData();
    } catch {
      alert('Failed to reverse payment.');
    }
  };

  const exportPaymentsCSV = () => {
    const headers = ['Payment ID', 'Student Name', 'Amount', 'Date', 'Method', 'Reference', 'Status'];
    const rows = payments.map(p => {
      const stu = students.find(s => s.id === p.studentId) || { name: 'Unknown' };
      return [p.id, `"${stu.name}"`, p.amount, p.paymentDate, p.paymentMethod, `"${p.transactionReference || ''}"`, p.isReversed ? 'Reversed' : 'Valid'];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `payment_history_${getLocalDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredPayments = payments.filter(p => {
    if (filterMonth !== 'all' && !p.paymentDate.startsWith(filterMonth)) return false;
    if (searchQuery.trim()) {
      const stu = students.find(s => s.id === p.studentId);
      const q = searchQuery.toLowerCase();
      return (
        (stu && stu.name.toLowerCase().includes(q)) ||
        (p.transactionReference && p.transactionReference.toLowerCase().includes(q)) ||
        p.paymentMethod.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Payment Management & History</h2>
          <p className="text-xs text-slate-500 mt-0.5">Record tuition collections, view audit trails, and generate receipts</p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={exportPaymentsCSV}
            className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => {
              setStudentId('');
              setFeeRecordId('');
              setAmount(0);
              setTransactionReference('');
              setNotes('');
              setFormError('');
              setIsOpen(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2.5 rounded-xl shadow-md transition-colors flex items-center space-x-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Record Payment</span>
          </button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by student or reference..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm"
          />
        </div>

        <div className="flex items-center space-x-3 w-full md:w-auto">
          <input
            type="month"
            value={filterMonth === 'all' ? '' : filterMonth}
            onChange={(e) => setFilterMonth(e.target.value || 'all')}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
          {filterMonth !== 'all' && (
            <button
              onClick={() => setFilterMonth('all')}
              className="text-xs text-blue-600 font-semibold hover:underline"
            >
              Clear Month
            </button>
          )}
        </div>
      </div>

      {/* Payments List Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="divide-y divide-slate-100">
          {filteredPayments.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm">
              No payment records found.
            </div>
          ) : (
            filteredPayments.sort((a, b) => b.paymentDate.localeCompare(a.paymentDate)).map(payment => {
              const student = students.find(s => s.id === payment.studentId);
              const fee = feeRecords.find(f => f.id === payment.feeRecordId);

              return (
                <div key={payment.id} className={`p-4 md:px-6 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
                  payment.isReversed ? 'bg-red-50/50 opacity-75' : 'hover:bg-slate-50'
                }`}>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="font-bold text-slate-900 text-base">{student?.name || 'Unknown Student'}</h4>
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-medium">
                        {payment.paymentMethod}
                      </span>
                      {payment.isReversed && (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-md font-bold">
                          REVERSED
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Date: {formatDate(payment.paymentDate)} • Period: {fee ? `${fee.billingMonth}/${fee.billingYear}` : 'N/A'}
                      {payment.transactionReference ? ` • Ref: ${payment.transactionReference}` : ''}
                    </p>
                    {payment.reversalReason && (
                      <p className="text-xs text-red-600 mt-0.5 font-medium">Reason: {payment.reversalReason}</p>
                    )}
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <span className={`text-base font-bold block ${payment.isReversed ? 'line-through text-slate-400' : 'text-emerald-600'}`}>
                        {formatCurrency(payment.amount)}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      {!payment.isReversed && fee && student && (
                        <button
                          onClick={() => onOpenReceipt(payment, student, fee)}
                          title="Print Receipt"
                          className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      )}
                      {!payment.isReversed && (
                        <button
                          onClick={() => handleReversePayment(payment)}
                          title="Correct / Reverse Payment"
                          className="p-2 rounded-xl bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors"
                        >
                          <RotateCcw className="w-4 h-4" />
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

      {/* Record Payment Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h3 className="font-bold text-lg text-slate-900">Record Payment</h3>
              <button
                onClick={() => {
                  setIsOpen(false);
                  onCloseRecordModal();
                }}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSavePayment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Select Student *</label>
                <select
                  required
                  value={studentId}
                  onChange={(e) => {
                    setStudentId(e.target.value);
                    setFeeRecordId('');
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="">-- Select Student --</option>
                  {students.filter(s => s.active).map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.className})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Billing Period / Fee Record *</label>
                <select
                  required
                  value={feeRecordId}
                  onChange={(e) => setFeeRecordId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="">-- Select Fee Period --</option>
                  {studentFees.map(f => {
                    const paid = payments
                      .filter(p => p.feeRecordId === f.id && !p.isReversed)
                      .reduce((sum, p) => sum + p.amount, 0);
                    const bal = f.amountCharged - paid;
                    return (
                      <option key={f.id} value={f.id}>
                        Period {f.billingMonth}/{f.billingYear} — Charged: {formatCurrency(f.amountCharged)} (Balance: {formatCurrency(bal)})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Amount Received (₹) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Payment Date *</label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Payment Method *</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="UPI">UPI</option>
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Transaction Reference</label>
                  <input
                    type="text"
                    value={transactionReference}
                    onChange={(e) => setTransactionReference(e.target.value)}
                    placeholder="e.g. UPI Ref #123456"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Notes</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional remarks..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onCloseRecordModal();
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2.5 rounded-xl shadow-md transition-colors text-sm flex items-center space-x-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Payment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
