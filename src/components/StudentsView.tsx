import React, { useEffect, useState } from 'react';
import { db } from '../db/db';
import { Student, Attendance, FeeRecord, Payment, Batch } from '../types';
import { formatCurrency, formatDate, normalizePhoneNumber } from '../utils/formatters';
import { 
  Users, Plus, Search, Filter, Phone, MessageSquare, 
  Calendar, Edit3, Trash2, X, Check, Eye, UserX, UserCheck, ShieldAlert, Layers 
} from 'lucide-react';

interface StudentsViewProps {
  onOpenWhatsApp: (student: Student, fee?: FeeRecord) => void;
  onOpenSms: (student: Student, fee?: FeeRecord) => void;
  initialBatchFilter?: string;
  onNavigateToBatches: () => void;
}

export const StudentsView: React.FC<StudentsViewProps> = ({ 
  onOpenWhatsApp, 
  onOpenSms, 
  initialBatchFilter = 'all',
  onNavigateToBatches 
}) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('active');
  const [filterBatchId, setFilterBatchId] = useState<string>(initialBatchFilter);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'class' | 'fee'>('name');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailTab, setDetailTab] = useState<'overview' | 'attendance' | 'fees'>('overview');
  const [studentAttendance, setStudentAttendance] = useState<Attendance[]>([]);
  const [studentFees, setStudentFees] = useState<FeeRecord[]>([]);
  const [studentPayments, setStudentPayments] = useState<Payment[]>([]);

  // Form states
  const [name, setName] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [className, setClassName] = useState('Class 10');
  const [schoolName, setSchoolName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [monthlyFee, setMonthlyFee] = useState<number>(1500);
  const [dueDay, setDueDay] = useState<number>(10);
  const [enrollmentDate, setEnrollmentDate] = useState(new Date().toISOString().split('T')[0]);
  const [batchId, setBatchId] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (initialBatchFilter) {
      setFilterBatchId(initialBatchFilter);
    }
  }, [initialBatchFilter]);

  async function loadData() {
    const [sList, bList] = await Promise.all([
      db.students.toArray(),
      db.batches.toArray()
    ]);
    setStudents(sList);
    setBatches(bList);
    if (bList.length > 0 && !batchId) {
      const activeB = bList.find(b => b.active);
      setBatchId(activeB ? activeB.id : bList[0].id);
    }
  }

  const handleOpenAddModal = async (stu?: Student) => {
    setFormError('');
    const settings = await db.settings.get('settings');
    const defFee = settings?.defaultMonthlyFee ?? 1500;
    const defDueDay = settings?.defaultDueDay ?? 10;

    if (stu) {
      setSelectedStudent(stu);
      setName(stu.name);
      setGuardianName(stu.guardianName || '');
      setClassName(stu.className);
      setSchoolName(stu.schoolName || '');
      setPhoneNumber(stu.phoneNumber);
      setWhatsappNumber(stu.whatsappNumber || '');
      setMonthlyFee(stu.monthlyFee);
      setDueDay(stu.dueDay);
      setEnrollmentDate(stu.enrollmentDate);
      setBatchId(stu.batchId || (batches[0] ? batches[0].id : ''));
      setNotes(stu.notes || '');
    } else {
      setSelectedStudent(null);
      setName('');
      setGuardianName('');
      setClassName('Class 10');
      setSchoolName('');
      setPhoneNumber('');
      setWhatsappNumber('');
      setMonthlyFee(defFee);
      setDueDay(defDueDay);
      setEnrollmentDate(new Date().toISOString().split('T')[0]);
      setBatchId(batches.find(b => b.active)?.id || batches[0]?.id || '');
      setNotes('');
    }
    setIsModalOpen(true);
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Student name is required.');
      return;
    }
    if (!phoneNumber.trim()) {
      setFormError('Phone number is required.');
      return;
    }
    if (!batchId) {
      setFormError('Please select a batch for the student.');
      return;
    }

    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    const normalizedWhatsapp = whatsappNumber ? normalizePhoneNumber(whatsappNumber) : normalizedPhone;
    const now = Date.now();

    try {
      if (selectedStudent) {
        const updated: Student = {
          ...selectedStudent,
          name: name.trim(),
          guardianName: guardianName.trim() || undefined,
          className: className.trim(),
          schoolName: schoolName.trim() || undefined,
          phoneNumber: normalizedPhone,
          whatsappNumber: normalizedWhatsapp,
          monthlyFee: Number(monthlyFee),
          dueDay: Number(dueDay),
          enrollmentDate,
          batchId,
          notes: notes.trim() || undefined,
          updatedAt: now
        };
        await db.students.put(updated);
      } else {
        const newStudent: Student = {
          id: `stu-${now}-${Math.random().toString(36).substr(2, 4)}`,
          name: name.trim(),
          guardianName: guardianName.trim() || undefined,
          className: className.trim(),
          schoolName: schoolName.trim() || undefined,
          phoneNumber: normalizedPhone,
          whatsappNumber: normalizedWhatsapp,
          monthlyFee: Number(monthlyFee),
          dueDay: Number(dueDay),
          enrollmentDate,
          active: true,
          batchId,
          notes: notes.trim() || undefined,
          createdAt: now,
          updatedAt: now
        };
        await db.students.add(newStudent);
      }

      setIsModalOpen(false);
      loadData();
    } catch {
      setFormError('Failed to save student record.');
    }
  };

  const handleToggleActive = async (stu: Student) => {
    const updated = { ...stu, active: !stu.active, updatedAt: Date.now() };
    await db.students.put(updated);
    loadData();
  };

  const handleDeleteStudent = async (stu: Student) => {
    if (window.confirm(`Are you sure you want to permanently delete ${stu.name}? Note: Prefer archiving/deactivating so attendance & fee records remain available.`)) {
      await db.students.delete(stu.id);
      loadData();
      setIsDetailModalOpen(false);
    }
  };

  const handleOpenDetail = async (stu: Student) => {
    setSelectedStudent(stu);
    const [attList, feeList, payList] = await Promise.all([
      db.attendance.where('studentId').equals(stu.id).toArray(),
      db.feeRecords.where('studentId').equals(stu.id).toArray(),
      db.payments.where('studentId').equals(stu.id).toArray()
    ]);
    setStudentAttendance(attList);
    setStudentFees(feeList);
    setStudentPayments(payList);
    setDetailTab('overview');
    setIsDetailModalOpen(true);
  };

  // Filter and Sort
  const filteredStudents = students.filter(stu => {
    if (filterActive === 'active' && !stu.active) return false;
    if (filterActive === 'inactive' && stu.active) return false;
    if (filterBatchId !== 'all' && stu.batchId !== filterBatchId) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        stu.name.toLowerCase().includes(q) ||
        stu.className.toLowerCase().includes(q) ||
        stu.phoneNumber.includes(q) ||
        (stu.schoolName && stu.schoolName.toLowerCase().includes(q))
      );
    }
    return true;
  }).sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    if (sortBy === 'class') return a.className.localeCompare(b.className);
    if (sortBy === 'fee') return b.monthlyFee - a.monthlyFee;
    return 0;
  });

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Student Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">Manage active student profiles, batch assignments, and fees</p>
        </div>
        <button
          onClick={() => handleOpenAddModal()}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2.5 rounded-xl shadow-md transition-colors flex items-center justify-center space-x-2 text-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Student</span>
        </button>
      </div>

      {/* Filters & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, class, phone..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Batch filter */}
          <select
            value={filterBatchId}
            onChange={(e) => setFilterBatchId(e.target.value)}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            <option value="all">All Batches</option>
            {batches.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>

          {/* Active status filter */}
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setFilterActive('active')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterActive === 'active' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setFilterActive('inactive')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterActive === 'inactive' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Inactive
            </button>
            <button
              onClick={() => setFilterActive('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterActive === 'all' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All
            </button>
          </div>

          {/* Sort selector */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            <option value="name">Sort by Name</option>
            <option value="class">Sort by Class</option>
            <option value="fee">Sort by Monthly Fee</option>
          </select>
        </div>
      </div>

      {/* Student Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredStudents.length === 0 ? (
          <div className="col-span-full bg-white rounded-2xl p-12 text-center border border-slate-200">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-700">No students found</h3>
            <p className="text-xs text-slate-400 mt-1">Try adjusting your search or add a new student.</p>
          </div>
        ) : (
          filteredStudents.map((stu) => {
            const studentBatch = batches.find(b => b.id === stu.batchId);
            return (
              <div
                key={stu.id}
                className={`bg-white rounded-2xl border p-5 shadow-sm transition-all flex flex-col justify-between ${
                  stu.active ? 'border-slate-200 hover:border-blue-300' : 'border-slate-200 opacity-60 bg-slate-50/50'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-50 text-blue-600">
                          {stu.className}
                        </span>
                        {studentBatch && (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700">
                            {studentBatch.name.split('—')[0]}
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-base text-slate-900 mt-1.5">{stu.name}</h3>
                      {stu.guardianName && <p className="text-xs text-slate-500">Parent: {stu.guardianName}</p>}
                    </div>
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        stu.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {stu.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600 my-4 border-t border-b border-slate-100 py-3">
                    <div className="flex items-center space-x-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span>{stu.phoneNumber}</span>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-slate-500">Monthly Fee:</span>
                      <span className="font-bold text-slate-900">{formatCurrency(stu.monthlyFee)} (Due {stu.dueDay}th)</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={() => handleOpenDetail(stu)}
                    className="flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-800 font-semibold"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Profile</span>
                  </button>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => onOpenWhatsApp(stu)}
                      title="WhatsApp Reminder"
                      className="p-2 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleOpenAddModal(stu)}
                      title="Edit Student"
                      className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleToggleActive(stu)}
                      title={stu.active ? 'Deactivate' : 'Activate'}
                      className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                    >
                      {stu.active ? <UserX className="w-4 h-4 text-amber-600" /> : <UserCheck className="w-4 h-4 text-emerald-600" />}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add / Edit Student Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h3 className="font-bold text-lg text-slate-900">
                {selectedStudent ? 'Edit Student Record' : 'Add New Student'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {batches.length === 0 ? (
              <div className="p-6 bg-amber-50 border border-amber-200 rounded-2xl text-center space-y-3">
                <p className="text-xs font-medium text-amber-900">No active batches available. Please create a batch first.</p>
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    onNavigateToBatches();
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-sm"
                >
                  Create Batch Now
                </button>
              </div>
            ) : (
              <form onSubmit={handleSaveStudent} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Student Full Name *</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Aarav Gupta"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Parent / Guardian Name</label>
                    <input
                      type="text"
                      value={guardianName}
                      onChange={(e) => setGuardianName(e.target.value)}
                      placeholder="e.g. Rajesh Gupta"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Class / Grade *</label>
                    <input
                      type="text"
                      required
                      value={className}
                      onChange={(e) => setClassName(e.target.value)}
                      placeholder="e.g. Class 10"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Batch Assignment *</label>
                    <select
                      required
                      value={batchId}
                      onChange={(e) => setBatchId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm font-semibold"
                    >
                      <option value="">-- Select Batch --</option>
                      {batches.filter(b => b.active || b.id === batchId).map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Phone Number *</label>
                    <input
                      type="tel"
                      required
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="e.g. 9876543210"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">WhatsApp Number</label>
                    <input
                      type="tel"
                      value={whatsappNumber}
                      onChange={(e) => setWhatsappNumber(e.target.value)}
                      placeholder="Leave blank if same as phone"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Monthly Fee (₹) *</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={monthlyFee}
                      onChange={(e) => setMonthlyFee(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Due Day (1-31) *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={31}
                      value={dueDay}
                      onChange={(e) => setDueDay(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Enrollment Date *</label>
                    <input
                      type="date"
                      required
                      value={enrollmentDate}
                      onChange={(e) => setEnrollmentDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Notes / Remarks</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    placeholder="Optional notes..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2.5 rounded-xl shadow-md transition-colors text-sm flex items-center space-x-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Save Student</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Student Detail Modal */}
      {isDetailModalOpen && selectedStudent && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-bold text-blue-600 uppercase">
                  {selectedStudent.className} • {batches.find(b => b.id === selectedStudent.batchId)?.name || 'General'}
                </span>
                <h3 className="font-bold text-xl text-slate-900">{selectedStudent.name}</h3>
              </div>
              <button onClick={() => setIsDetailModalOpen(false)} className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex space-x-2 border-b border-slate-200 pb-3 mb-4">
              <button
                onClick={() => setDetailTab('overview')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  detailTab === 'overview' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Profile Overview
              </button>
              <button
                onClick={() => setDetailTab('attendance')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  detailTab === 'attendance' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Attendance ({studentAttendance.length})
              </button>
              <button
                onClick={() => setDetailTab('fees')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  detailTab === 'fees' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Fees ({studentFees.length})
              </button>
            </div>

            {detailTab === 'overview' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl text-sm">
                  <div>
                    <span className="text-xs text-slate-500 block">Assigned Batch</span>
                    <span className="font-bold text-blue-600">{batches.find(b => b.id === selectedStudent.batchId)?.name || 'General'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Parent / Guardian</span>
                    <span className="font-semibold text-slate-800">{selectedStudent.guardianName || 'Not specified'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Phone Number</span>
                    <span className="font-semibold text-slate-800">{selectedStudent.phoneNumber}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">WhatsApp Number</span>
                    <span className="font-semibold text-slate-800">{selectedStudent.whatsappNumber || selectedStudent.phoneNumber}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Monthly Fee</span>
                    <span className="font-bold text-blue-600">{formatCurrency(selectedStudent.monthlyFee)} (Due {selectedStudent.dueDay}th)</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Status</span>
                    <span className={`font-semibold ${selectedStudent.active ? 'text-emerald-600' : 'text-slate-500'}`}>
                      {selectedStudent.active ? 'Active' : 'Inactive / Archived'}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    onClick={() => {
                      setIsDetailModalOpen(false);
                      onOpenWhatsApp(selectedStudent);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 shadow-sm transition-colors"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>WhatsApp Reminder</span>
                  </button>

                  <button
                    onClick={() => handleDeleteStudent(selectedStudent)}
                    className="bg-red-50 hover:bg-red-100 text-red-700 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors ml-auto"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Record</span>
                  </button>
                </div>
              </div>
            )}

            {detailTab === 'attendance' && (
              <div className="space-y-3 max-h-60 overflow-y-auto divide-y divide-slate-100">
                {studentAttendance.length === 0 ? (
                  <p className="text-center py-8 text-slate-400 text-xs">No attendance records found.</p>
                ) : (
                  studentAttendance.sort((a, b) => b.date.localeCompare(a.date)).map(att => (
                    <div key={att.id} className="py-2.5 flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-800">{formatDate(att.date)}</span>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                        att.status === 'present' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {att.status.toUpperCase()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}

            {detailTab === 'fees' && (
              <div className="space-y-3 max-h-60 overflow-y-auto divide-y divide-slate-100">
                {studentFees.length === 0 ? (
                  <p className="text-center py-8 text-slate-400 text-xs">No fee records found.</p>
                ) : (
                  studentFees.map(fee => (
                    <div key={fee.id} className="py-3 flex items-center justify-between text-sm">
                      <div>
                        <span className="font-bold text-slate-900">Period: {fee.billingMonth}/{fee.billingYear}</span>
                        <p className="text-xs text-slate-500">Due: {formatDate(fee.dueDate)}</p>
                      </div>
                      <span className="font-bold text-slate-900">{formatCurrency(fee.amountCharged)}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
