import Dexie, { Table } from 'dexie';
import { Batch, Student, Attendance, FeeRecord, Payment, AppSettings } from '../types';
import { getLocalDateString, calculateDueDate } from '../utils/formatters';

export class TutorTrackDB extends Dexie {
  batches!: Table<Batch, string>;
  students!: Table<Student, string>;
  attendance!: Table<Attendance, string>;
  feeRecords!: Table<FeeRecord, string>;
  payments!: Table<Payment, string>;
  settings!: Table<AppSettings, string>;

  constructor() {
    super('TutorTrackDatabase');
    
    // Version 1
    this.version(1).stores({
      students: 'id, name, className, phoneNumber, active, enrollmentDate, createdAt',
      attendance: 'id, studentId, date, [studentId+date], status, createdAt',
      feeRecords: 'id, studentId, [billingMonth+billingYear], dueDate, createdAt',
      payments: 'id, studentId, feeRecordId, paymentDate, createdAt',
      settings: 'id'
    });

    // Version 2: Add batches table and migrate existing records
    this.version(2).stores({
      batches: 'id, name, active, createdAt',
      students: 'id, name, className, phoneNumber, active, batchId, enrollmentDate, createdAt',
      attendance: 'id, studentId, batchId, date, [studentId+date], status, createdAt',
      feeRecords: 'id, studentId, [billingMonth+billingYear], dueDate, createdAt',
      payments: 'id, studentId, feeRecordId, paymentDate, createdAt',
      settings: 'id'
    }).upgrade(async tx => {
      const now = Date.now();
      const defaultBatchId = 'batch-general';
      
      const batchExists = await tx.table('batches').get(defaultBatchId);
      if (!batchExists) {
        await tx.table('batches').add({
          id: defaultBatchId,
          name: 'General Batch',
          description: 'Default batch for existing students',
          className: 'General',
          active: true,
          createdAt: now
        });
      }

      const students = await tx.table('students').toArray();
      for (const s of students) {
        if (!s.batchId) {
          s.batchId = defaultBatchId;
          await tx.table('students').put(s);
        }
      }

      const attendance = await tx.table('attendance').toArray();
      for (const a of attendance) {
        if (!a.batchId) {
          const student = students.find((st: Student) => st.id === a.studentId);
          a.batchId = student?.batchId || defaultBatchId;
          await tx.table('attendance').put(a);
        }
      }
    });
  }
}

export const db = new TutorTrackDB();

/**
 * Initialize default settings if not present
 */
export async function initDefaultSettings(): Promise<AppSettings> {
  let settings = await db.settings.get('settings');
  if (!settings) {
    settings = {
      id: 'settings',
      tutorName: 'Aarav Sharma',
      instituteName: 'Sharma Private Tuition',
      defaultCountryCode: '+91',
      defaultMonthlyFee: 1500,
      defaultDueDay: 10,
      schemaVersion: 2
    };
    await db.settings.put(settings);
  } else {
    // Clean up obsolete pin fields if present in existing records
    const anySettings = settings as any;
    if (anySettings.pinHash !== undefined || anySettings.isLocked !== undefined) {
      delete anySettings.pinHash;
      delete anySettings.pinSalt;
      delete anySettings.isLocked;
      delete anySettings.lockTimeoutMinutes;
      delete anySettings.lastActiveTimestamp;
      await db.settings.put(settings);
    }
  }
  return settings;
}

/**
 * Seed demo data if database is empty
 */
export async function seedDemoData(): Promise<void> {
  const studentCount = await db.students.count();
  if (studentCount > 0) return; // already has data

  const now = Date.now();
  const today = getLocalDateString();
  const currentYear = new Date().getFullYear();
  const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');

  const demoBatches: Batch[] = [
    {
      id: 'batch-morning',
      name: 'Batch A — Morning Batch',
      description: 'Morning session for senior students',
      className: 'Class 10 & 11',
      startTime: '09:00 AM',
      endTime: '11:00 AM',
      active: true,
      createdAt: now - 86400000 * 40
    },
    {
      id: 'batch-evening',
      name: 'Batch B — Evening Batch',
      description: 'Evening coaching session',
      className: 'Class 9',
      startTime: '05:00 PM',
      endTime: '07:00 PM',
      active: true,
      createdAt: now - 86400000 * 35
    }
  ];

  await db.batches.bulkAdd(demoBatches);

  const demoStudents: Student[] = [
    {
      id: 'stu-1',
      name: 'Aarav Gupta',
      guardianName: 'Rajesh Gupta',
      className: 'Class 10',
      schoolName: 'Delhi Public School',
      phoneNumber: '+919876543210',
      whatsappNumber: '+919876543210',
      monthlyFee: 1500,
      dueDay: 10,
      enrollmentDate: '2025-04-01',
      active: true,
      batchId: 'batch-morning',
      notes: 'Excels in Mathematics and Science.',
      createdAt: now - 86400000 * 30,
      updatedAt: now - 86400000 * 30
    },
    {
      id: 'stu-2',
      name: 'Ananya Iyer',
      guardianName: 'Meenakshi Iyer',
      className: 'Class 9',
      schoolName: 'St. Xavier High School',
      phoneNumber: '+919811223344',
      whatsappNumber: '+919811223344',
      monthlyFee: 1200,
      dueDay: 5,
      enrollmentDate: '2025-05-15',
      active: true,
      batchId: 'batch-evening',
      notes: 'Focus on English grammar and literature.',
      createdAt: now - 86400000 * 20,
      updatedAt: now - 86400000 * 20
    },
    {
      id: 'stu-3',
      name: 'Rohan Verma',
      guardianName: 'Sanjay Verma',
      className: 'Class 11',
      schoolName: 'Modern School',
      phoneNumber: '+919988776655',
      monthlyFee: 2000,
      dueDay: 15,
      enrollmentDate: '2025-06-01',
      active: true,
      batchId: 'batch-morning',
      notes: 'Physics & Chemistry coaching.',
      createdAt: now - 86400000 * 10,
      updatedAt: now - 86400000 * 10
    }
  ];

  await db.students.bulkAdd(demoStudents);

  const demoAttendance: Attendance[] = [
    {
      id: 'att-1',
      studentId: 'stu-1',
      batchId: 'batch-morning',
      date: today,
      status: 'present',
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'att-2',
      studentId: 'stu-2',
      batchId: 'batch-evening',
      date: today,
      status: 'present',
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'att-3',
      studentId: 'stu-3',
      batchId: 'batch-morning',
      date: today,
      status: 'absent',
      notes: 'Informal leave due to fever',
      createdAt: now,
      updatedAt: now
    }
  ];

  await db.attendance.bulkAdd(demoAttendance);

  const dueDate = calculateDueDate(currentYear, parseInt(currentMonth), 10);
  const demoFee: FeeRecord = {
    id: `fee-stu-1-${currentYear}-${currentMonth}`,
    studentId: 'stu-1',
    billingMonth: currentMonth,
    billingYear: currentYear,
    amountCharged: 1500,
    dueDate,
    createdAt: now,
    updatedAt: now
  };

  const demoFee2: FeeRecord = {
    id: `fee-stu-2-${currentYear}-${currentMonth}`,
    studentId: 'stu-2',
    billingMonth: currentMonth,
    billingYear: currentYear,
    amountCharged: 1200,
    dueDate: calculateDueDate(currentYear, parseInt(currentMonth), 5),
    createdAt: now,
    updatedAt: now
  };

  await db.feeRecords.bulkAdd([demoFee, demoFee2]);

  const demoPayment: Payment = {
    id: 'pay-1',
    studentId: 'stu-1',
    feeRecordId: demoFee.id,
    amount: 1500,
    paymentDate: today,
    paymentMethod: 'UPI',
    transactionReference: 'UPI/1234567890',
    notes: 'Paid via Google Pay',
    createdAt: now,
    updatedAt: now
  };

  await db.payments.add(demoPayment);
}
