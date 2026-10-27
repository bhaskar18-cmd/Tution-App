import React from 'react';
import { Payment, Student, FeeRecord, AppSettings } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { Printer, X, CheckCircle2 } from 'lucide-react';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: Payment | null;
  student: Student | null;
  fee: FeeRecord | null;
  settings: AppSettings | null;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  payment,
  student,
  fee,
  settings
}) => {
  if (!isOpen || !payment || !student) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 print:shadow-none print:w-full">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 print:hidden">
          <h3 className="font-bold text-lg text-slate-900">Payment Receipt</h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="p-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors flex items-center space-x-1 text-xs font-semibold"
            >
              <Printer className="w-4 h-4" />
              <span>Print</span>
            </button>
            <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Content */}
        <div className="py-6 space-y-6 text-slate-800">
          <div className="text-center space-y-1">
            <h2 className="text-xl font-bold">{settings?.instituteName || 'Sharma Private Tuition'}</h2>
            <p className="text-xs text-slate-500">Tutor: {settings?.tutorName || 'Private Tutor'}</p>
            <div className="inline-flex items-center space-x-1 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold mt-2">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Fee Payment Receipt</span>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl text-xs space-y-2 border border-slate-200">
            <div className="flex justify-between">
              <span className="text-slate-500">Receipt ID:</span>
              <span className="font-mono font-semibold">{payment.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Date:</span>
              <span className="font-semibold">{formatDate(payment.paymentDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Student Name:</span>
              <span className="font-semibold">{student.name} ({student.className})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Billing Period:</span>
              <span className="font-semibold">{fee ? `${fee.billingMonth}/${fee.billingYear}` : 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Payment Method:</span>
              <span className="font-semibold">{payment.paymentMethod}</span>
            </div>
            {payment.transactionReference && (
              <div className="flex justify-between">
                <span className="text-slate-500">Transaction Ref:</span>
                <span className="font-mono font-semibold">{payment.transactionReference}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <span className="font-bold text-slate-700">Amount Received:</span>
            <span className="text-2xl font-extrabold text-blue-600">{formatCurrency(payment.amount)}</span>
          </div>

          <div className="text-center text-[11px] text-slate-400 pt-4 border-t border-slate-100">
            This is a computer-generated receipt issued by TutorTrack for records.
          </div>
        </div>

        {/* Footer print action */}
        <div className="pt-2 flex justify-end print:hidden">
          <button
            onClick={handlePrint}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-xl shadow-md transition-colors text-sm flex items-center justify-center space-x-2"
          >
            <Printer className="w-4 h-4" />
            <span>Print Receipt</span>
          </button>
        </div>
      </div>
    </div>
  );
};
