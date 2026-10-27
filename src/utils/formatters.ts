import { FeeRecord, Payment } from '../types';

/**
 * Format currency in Indian Rupees (₹)
 */
export function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

/**
 * Format date from YYYY-MM-DD to DD MMM YYYY (e.g. 26 Oct 2026)
 */
export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const [year, month, day] = parts;
  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  if (isNaN(date.getTime())) return dateStr;
  
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

/**
 * Get current date in YYYY-MM-DD format (Asia/Kolkata local time or browser local time)
 */
export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Normalize phone number for India (+91) or international
 */
export function normalizePhoneNumber(phone: string, countryCode = '+91'): string {
  if (!phone) return '';
  let cleaned = phone.trim();
  const hasPlus = cleaned.startsWith('+');
  cleaned = cleaned.replace(/\D/g, '');
  
  if (hasPlus) {
    return '+' + cleaned;
  }
  
  if (cleaned.length === 10) {
    const ccDigits = countryCode.replace(/\D/g, '');
    return `+${ccDigits}${cleaned}`;
  }
  
  if (cleaned.length > 10 && !cleaned.startsWith('91') && countryCode === '+91') {
    return '+91' + cleaned;
  }
  
  return '+' + cleaned;
}

/**
 * Get clean digits only for wa.me URL
 */
export function getWhatsAppDigits(phone: string, countryCode = '+91'): string {
  const normalized = normalizePhoneNumber(phone, countryCode);
  return normalized.replace(/\D/g, '');
}

/**
 * Generate WhatsApp click-to-chat URL
 */
export function generateWhatsAppUrl(phone: string, message: string, countryCode = '+91'): string {
  const digits = getWhatsAppDigits(phone, countryCode);
  const encodedMsg = encodeURIComponent(message);
  return `https://wa.me/${digits}?text=${encodedMsg}`;
}

/**
 * Generate SMS link
 */
export function generateSmsUrl(phone: string, message: string, countryCode = '+91'): string {
  const normalized = normalizePhoneNumber(phone, countryCode);
  const encodedMsg = encodeURIComponent(message);
  return `sms:${normalized}?body=${encodedMsg}`;
}

/**
 * Calculate due date for a given billing year, month, and dueDay
 */
export function calculateDueDate(year: number, month: number, dueDay: number): string {
  const lastDayOfMonth = new Date(year, month, 0).getDate();
  const actualDay = Math.min(dueDay, lastDayOfMonth);
  const monthStr = String(month).padStart(2, '0');
  const dayStr = String(actualDay).padStart(2, '0');
  return `${year}-${monthStr}-${dayStr}`;
}

/**
 * Calculate total paid for a fee record from payments list
 */
export function calculateFeePaidAmount(feeRecordId: string, payments: Payment[]): number {
  return payments
    .filter(p => p.feeRecordId === feeRecordId && !p.isReversed)
    .reduce((sum, p) => sum + p.amount, 0);
}

/**
 * Determine fee status
 */
export function getFeeStatus(feeRecord: FeeRecord, payments: Payment[], currentDateStr = getLocalDateString()): 'paid' | 'partially_paid' | 'pending' | 'overdue' {
  const paid = calculateFeePaidAmount(feeRecord.id, payments);
  const balance = feeRecord.amountCharged - paid;

  if (balance <= 0) {
    return 'paid';
  }
  if (paid > 0) {
    return 'partially_paid';
  }
  
  if (feeRecord.dueDate < currentDateStr) {
    return 'overdue';
  }
  
  return 'pending';
}

/**
 * Parse time string into total minutes from midnight (0-1439)
 */
export function parseTimeToMinutes(timeStr?: string): number | null {
  if (!timeStr) return null;
  const cleaned = timeStr.trim().toUpperCase();
  const match = cleaned.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/);
  if (!match) return null;
  
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[3];

  if (ampm === 'PM' && hours < 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

/**
 * Get current time in minutes from midnight from a Date object
 */
export function getCurrentTimeMinutes(d: Date = new Date()): number {
  return d.getHours() * 60 + d.getMinutes();
}
