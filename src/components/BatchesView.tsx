import React, { useEffect, useState } from 'react';
import { db } from '../db/db';
import { Batch, Student, Attendance, FeeRecord, Payment } from '../types';
import { formatCurrency } from '../utils/formatters';
import { 
  Layers, Plus, Edit3, UserCheck, Users, IndianRupee, Clock, Check, X, ShieldAlert, Eye 
} from 'lucide-react';

interface BatchesViewProps {
  onNavigateToStudents: (batchId?: string) => void;
}

export const BatchesView: React.FC<BatchesViewProps> = ({ onNavigateToStudents }) => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [feeRecords, setFeeRecords] = useState<FeeRecord[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [activeBatchDetail, setActiveBatchDetail] = useState<Batch | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [className, setClassName] = useState('');
  const [startTime, setStartTime] = useState('09:00 AM');
  const [endTime, setEndTime] = useState('11:00 AM');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [bList, sList, fList, pList, aList] = await Promise.all([
      db.batches.toArray(),
      db.students.toArray(),
      db.feeRecords.toArray(),
      db.payments.toArray(),
      db.attendance.toArray()
    ]);
    setBatches(bList);
    setStudents(sList);
    setFeeRecords(fList);
    setPayments(pList);
    setAttendance(aList);
  }

  const handleOpenModal = (batch?: Batch) => {
    setFormError('');
    if (batch) {
      setSelectedBatch(batch);
      setName(batch.name);
      setDescription(batch.description || '');
      setClassName(batch.className || '');
      setStartTime(batch.startTime || '09:00 AM');
      setEndTime(batch.endTime || '11:00 AM');
    } else {
      setSelectedBatch(null);
      setName('');
      setDescription('');
      setClassName('');
      setStartTime('09:00 AM');
      setEndTime('11:00 AM');
    }
    setIsModalOpen(true);
  };

  const handleSaveBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Batch name is required.');
      return;
    }

    const now = Date.now();
    try {
      if (selectedBatch) {
        const updated: Batch = {
          ...selectedBatch,
          name: name.trim(),
          description: description.trim() || undefined,
          className: className.trim() || undefined,
          startTime: startTime.trim() || undefined,
          endTime: endTime.trim() || undefined,
        };
        await db.batches.put(updated);
      } else {
        const newBatch: Batch = {
          id: `batch-${now}-${Math.random().toString(36).substr(2, 4)}`,
          name: name.trim(),
          description: description.trim() || undefined,
          className: className.trim() || undefined,
          startTime: startTime.trim() || undefined,
          endTime: endTime.trim() || undefined,
          active: true,
          createdAt: now
        };
        await db.batches.add(newBatch);
      }
      setIsModalOpen(false);
      loadData();
    } catch {
      setFormError('Failed to save batch.');
    }
  };

  const handleToggleActive = async (batch: Batch) => {
    const updated = { ...batch, active: !batch.active };
    await db.batches.put(updated);
    loadData();
  };

  const handleOpenDetail = (batch: Batch) => {
    setActiveBatchDetail(batch);
    setIsDetailModalOpen(true);
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Batch Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">Create and manage tuition batches, timetables, and batch-wise summaries</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2.5 rounded-xl shadow-md transition-colors flex items-center justify-center space-x-2 text-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Batch</span>
        </button>
      </div>

      {/* Batches Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {batches.length === 0 ? (
          <div className="col-span-full bg-white rounded-2xl p-12 text-center border border-slate-200">
            <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-700">No batches created yet</h3>
            <p className="text-xs text-slate-400 mt-1">Create your first batch to organize students and classes.</p>
          </div>
        ) : (
          batches.map(batch => {
            const batchStudents = students.filter(s => s.batchId === batch.id && s.active);
            const totalAssigned = batchStudents.length;

            // Fee calculations for this batch
            let batchCharged = 0;
            let batchCollected = 0;
            feeRecords.forEach(f => {
              const student = students.find(s => s.id === f.studentId);
              if (student && student.batchId === batch.id) {
                batchCharged += f.amountCharged;
              }
            });
            payments.forEach(p => {
              if (p.isReversed) return;
              const student = students.find(s => s.id === p.studentId);
              if (student && student.batchId === batch.id) {
                batchCollected += p.amount;
              }
            });
            const batchOutstanding = batchCharged - batchCollected;

            return (
              <div 
                key={batch.id} 
                className={`bg-white rounded-2xl border p-5 shadow-sm transition-all flex flex-col justify-between ${
                  batch.active ? 'border-slate-200 hover:border-blue-300' : 'border-slate-200 opacity-60 bg-slate-50'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      {batch.className && (
                        <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-50 text-blue-600">
                          {batch.className}
                        </span>
                      )}
                      <h3 className="font-bold text-lg text-slate-900 mt-1.5">{batch.name}</h3>
                      {batch.description && <p className="text-xs text-slate-500 mt-0.5">{batch.description}</p>}
                    </div>
                    <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                      batch.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {batch.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  {(batch.startTime || batch.endTime) && (
                    <div className="flex items-center space-x-1.5 text-xs text-slate-600 mb-3 bg-slate-50 p-2.5 rounded-xl">
                      <Clock className="w-3.5 h-3.5 text-blue-600" />
                      <span>{batch.startTime || ''} - {batch.endTime || ''}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 my-4 text-xs">
                    <div className="bg-slate-50 p-2.5 rounded-xl">
                      <span className="text-slate-500 block">Active Students</span>
                      <span className="font-bold text-slate-900 text-base">{totalAssigned}</span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-xl">
                      <span className="text-slate-500 block">Outstanding</span>
                      <span className="font-bold text-amber-600 text-sm">{formatCurrency(batchOutstanding)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <button
                    onClick={() => handleOpenDetail(batch)}
                    className="flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-800 font-semibold"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Summary</span>
                  </button>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => onNavigateToStudents(batch.id)}
                      title="View Students in Batch"
                      className="p-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                    >
                      <Users className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleOpenModal(batch)}
                      title="Edit Batch"
                      className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleToggleActive(batch)}
                      title={batch.active ? 'Deactivate' : 'Activate'}
                      className={`p-2 rounded-xl text-xs font-semibold ${
                        batch.active ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      }`}
                    >
                      {batch.active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create / Edit Batch Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h3 className="font-bold text-lg text-slate-900">
                {selectedBatch ? 'Edit Batch' : 'Create New Batch'}
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

            <form onSubmit={handleSaveBatch} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Batch Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Batch A — Morning Batch"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Class / Grade</label>
                <input
                  type="text"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  placeholder="e.g. Class 10"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Start Time</label>
                  <input
                    type="text"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    placeholder="e.g. 08:00 AM"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">End Time</label>
                  <input
                    type="text"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    placeholder="e.g. 10:00 AM"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="Optional notes or timetable details..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
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
                  <span>Save Batch</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Batch Detail Summary Modal */}
      {isDetailModalOpen && activeBatchDetail && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-bold text-blue-600 uppercase">{activeBatchDetail.className || 'Batch Summary'}</span>
                <h3 className="font-bold text-xl text-slate-900">{activeBatchDetail.name}</h3>
              </div>
              <button onClick={() => setIsDetailModalOpen(false)} className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-2xl text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Timetable:</span>
                  <span className="font-semibold">{activeBatchDetail.startTime || ''} - {activeBatchDetail.endTime || ''}</span>
                </div>
                {activeBatchDetail.description && (
                  <div>
                    <span className="text-slate-500 block text-xs">Description:</span>
                    <span className="font-medium text-slate-800">{activeBatchDetail.description}</span>
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-bold text-sm text-slate-800 mb-2">Assigned Students in Batch</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto divide-y divide-slate-100 bg-slate-50 p-3 rounded-xl">
                  {students.filter(s => s.batchId === activeBatchDetail.id).length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4">No students assigned to this batch yet.</p>
                  ) : (
                    students.filter(s => s.batchId === activeBatchDetail.id).map(s => (
                      <div key={s.id} className="pt-2 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-slate-900">{s.name}</span>
                          <span className="text-slate-500 ml-2">({s.className})</span>
                        </div>
                        <span className={`font-semibold ${s.active ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {s.active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    onNavigateToStudents(activeBatchDetail.id);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2.5 rounded-xl text-xs shadow-md transition-colors"
                >
                  View Students in Batch
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
