import React, { useState, useEffect } from 'react';
import { Student, FeeRecord, Payment } from '../types';
import { formatCurrency, formatDate, generateWhatsAppUrl, generateSmsUrl, calculateFeePaidAmount, getLocalDateString } from '../utils/formatters';
import { MessageSquare, Phone, Copy, Check, X, ExternalLink, ShieldAlert } from 'lucide-react';

interface RemindersModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  fee?: FeeRecord | null;
  payments: Payment[];
  defaultType: 'whatsapp' | 'sms';
}

export const RemindersModal: React.FC<RemindersModalProps> = ({
  isOpen,
  onClose,
  student,
  fee,
  payments,
  defaultType
}) => {
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [channel, setChannel] = useState<'whatsapp' | 'sms'>(defaultType);

  useEffect(() => {
    if (student) {
      const parentName = student.guardianName || 'Parent';
      const billingPeriod = fee ? `${fee.billingMonth}/${fee.billingYear}` : 'current month';
      const balance = fee 
        ? fee.amountCharged - calculateFeePaidAmount(fee.id, payments) 
        : student.monthlyFee;
      const dueDate = fee ? formatDate(fee.dueDate) : `10th`;

      const defaultText = `Hello ${parentName}, this is a reminder that the tuition fee for ${student.name} for ${billingPeriod} is ₹${balance}. The due date was ${dueDate}. Kindly arrange payment at your convenience. Thank you.`;
      setMessage(defaultText);
      setChannel(defaultType);
      setCopied(false);
    }
  }, [student, fee, payments, defaultType, isOpen]);

  if (!isOpen || !student) return null;

  const phoneToUse = student.whatsappNumber || student.phoneNumber;

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleOpenLink = () => {
    if (!phoneToUse) {
      alert('Missing phone number for this student.');
      return;
    }

    if (channel === 'whatsapp') {
      const url = generateWhatsAppUrl(phoneToUse, message);
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      const url = generateSmsUrl(phoneToUse, message);
      window.location.href = url;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
        <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            {channel === 'whatsapp' ? (
              <MessageSquare className="w-5 h-5 text-emerald-600" />
            ) : (
              <Phone className="w-5 h-5 text-blue-600" />
            )}
            <h3 className="font-bold text-lg text-slate-900">
              {channel === 'whatsapp' ? 'WhatsApp Fee Reminder' : 'SMS Fee Reminder'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Channel Switcher */}
        <div className="flex bg-slate-100 p-1 rounded-xl mb-4">
          <button
            onClick={() => setChannel('whatsapp')}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
              channel === 'whatsapp' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            WhatsApp Reminder
          </button>
          <button
            onClick={() => setChannel('sms')}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
              channel === 'sms' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            SMS Reminder
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-slate-50 p-3 rounded-xl text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Student:</span>
              <span className="font-semibold text-slate-800">{student.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Recipient Phone:</span>
              <span className="font-semibold text-slate-800">{phoneToUse}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
              Message Preview & Edit
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 font-sans"
            />
          </div>

          <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-[11px] text-amber-900 flex items-start space-x-2">
            <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
            <span>
              Manual reminder only. Opening {channel.toUpperCase()} does not automatically send or confirm message delivery.
            </span>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleCopyMessage}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 flex items-center space-x-1.5 transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied to Clipboard!' : 'Copy Message'}</span>
            </button>

            <button
              type="button"
              onClick={handleOpenLink}
              className={`px-5 py-2.5 rounded-xl text-white text-xs font-semibold shadow-md flex items-center space-x-1.5 transition-colors ${
                channel === 'whatsapp' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              <ExternalLink className="w-4 h-4" />
              <span>Open {channel === 'whatsapp' ? 'WhatsApp' : 'SMS App'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
