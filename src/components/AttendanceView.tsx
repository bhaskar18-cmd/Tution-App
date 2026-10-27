import React, { useEffect, useState, useRef } from 'react';
import { db } from '../db/db';
import { Student, Attendance, Batch } from '../types';
import { getLocalDateString, formatDate, parseTimeToMinutes, getCurrentTimeMinutes } from '../utils/formatters';
import { 
  CalendarCheck, Calendar, Check, X, Download, UserCheck, UserX, Clock, Save, ShieldAlert, Layers, RefreshCw, AlertTriangle 
} from 'lucide-react';

interface AttendanceViewProps {
  onNavigateToBatches: () => void;
  onNavigateToStudents: () => void;
}

export const AttendanceView: React.FC<AttendanceViewProps> = ({ onNavigateToBatches, onNavigateToStudents }) => {
  const [selectedDate, setSelectedDate] = useState<string>(getLocalDateString());
  const [batches, setBatches] = useState<Batch[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, 'present' | 'absent' | undefined>>({});
  const [notesMap, setNotesMap] = useState<Record<string, string>>({});
  const [existingRecords, setExistingRecords] = useState<Attendance[]>([]);
  const [allAttendance, setAllAttendance] = useState<Attendance[]>([]);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'daily' | 'history'>('daily');
  const [historyStudentId, setHistoryStudentId] = useState<string>('all');

  // Batch Selection & Time-based Auto State
  const [selectedBatchId, setSelectedBatchId] = useState<string>('auto');
  const [manualOverride, setManualOverride] = useState<boolean>(false);
  const [autoActiveBatchId, setAutoActiveBatchId] = useState<string | null>(null);
  const [overlapWarning, setOverlapWarning] = useState<boolean>(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

  const todayStr = getLocalDateString();
  const isToday = selectedDate === todayStr;

  // Timer ref for checking time boundary updates
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    loadInitialData();
  }, [selectedDate]);

  // Periodic time check timer when viewing today
  useEffect(() => {
    if (isToday && activeTab === 'daily') {
      timerRef.current = window.setInterval(() => {
        evaluateAutoBatch();
      }, 60000); // every minute
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isToday, activeTab, batches, manualOverride]);

  async function loadInitialData() {
    setLoading(true);
    setErrorMessage('');
    try {
      const [bList, aList, allA] = await Promise.all([
        db.batches.toArray(),
        db.attendance.where('date').equals(selectedDate).toArray(),
        db.attendance.toArray()
      ]);

      setBatches(bList);
      setExistingRecords(aList);
      setAllAttendance(allA);

      // Evaluate time-based active batch if today
      if (selectedDate === todayStr) {
        determineAutoBatch(bList);
      } else {
        setAutoActiveBatchId(null);
        if (!manualOverride && bList.length > 0) {
          setSelectedBatchId(bList[0].id);
        }
      }
    } catch (err: any) {
      console.error('Error loading data', err);
      setErrorMessage(`Failed to load attendance: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  // Determine active batch based on current time: startTime <= currentTime < endTime
  const determineAutoBatch = (bList: Batch[]) => {
    const currentMins = getCurrentTimeMinutes();
    const activeMatches: Batch[] = [];

    bList.filter(b => b.active).forEach(batch => {
      const startMins = parseTimeToMinutes(batch.startTime);
      const endMins = parseTimeToMinutes(batch.endTime);
      if (startMins !== null && endMins !== null) {
        if (currentMins >= startMins && currentMins < endMins) {
          activeMatches.push(batch);
        }
      }
    });

    if (activeMatches.length === 1) {
      setAutoActiveBatchId(activeMatches[0].id);
      setOverlapWarning(false);
      if (!manualOverride) {
        setSelectedBatchId(activeMatches[0].id);
      }
    } else if (activeMatches.length > 1) {
      // Overlapping schedules
      setAutoActiveBatchId(null);
      setOverlapWarning(true);
      if (!manualOverride) {
        setSelectedBatchId('select_prompt');
      }
    } else {
      // No batch currently scheduled
      setAutoActiveBatchId(null);
      setOverlapWarning(false);
      if (!manualOverride) {
        setSelectedBatchId('none');
      }
    }
  };

  const evaluateAutoBatch = () => {
    if (!manualOverride && isToday) {
      determineAutoBatch(batches);
    }
  };

  // Whenever selectedBatchId or selectedDate changes, load eligible students and attendance
  useEffect(() => {
    if (batches.length >= 0) {
      loadStudentsAndAttendance();
    }
  }, [selectedBatchId, selectedDate, batches]);

  async function loadStudentsAndAttendance() {
    try {
      const sList = await db.students.toArray();
      
      let eligibleStudents = sList.filter(stu => {
        if (!stu.active) return false;
        if (selectedBatchId === 'all') return true;
        if (selectedBatchId === 'none' || selectedBatchId === 'select_prompt') return false;
        return stu.batchId === selectedBatchId;
      });

      setStudents(eligibleStudents);

      const map: Record<string, 'present' | 'absent' | undefined> = {};
      const nMap: Record<string, string> = {};

      eligibleStudents.forEach(stu => {
        const found = existingRecords.find(a => a.studentId === stu.id && a.date === selectedDate);
        if (found) {
          map[stu.id] = found.status;
          if (found.notes) nMap[stu.id] = found.notes;
        } else {
          map[stu.id] = undefined;
        }
      });

      setAttendanceMap(map);
      setNotesMap(nMap);
      setHasUnsavedChanges(false);
    } catch (err: any) {
      console.error('Failed to load students list', err);
    }
  }

  const handleStatusChange = (studentId: string, status: 'present' | 'absent' | undefined) => {
    setAttendanceMap(prev => ({ ...prev, [studentId]: status }));
    setHasUnsavedChanges(true);
  };

  const handleNoteChange = (studentId: string, notes: string) => {
    setNotesMap(prev => ({ ...prev, [studentId]: notes }));
    setHasUnsavedChanges(true);
  };

  const handleSaveAttendance = async () => {
    const now = Date.now();
    const targetBatchId = selectedBatchId === 'all' || selectedBatchId === 'none' || selectedBatchId === 'select_prompt' 
      ? (batches[0]?.id || 'batch-general') 
      : selectedBatchId;

    try {
      for (const student of students) {
        const status = attendanceMap[student.id];
        const notes = notesMap[student.id] || '';
        const existing = existingRecords.find(a => a.studentId === student.id && a.date === selectedDate);

        if (status) {
          if (existing) {
            await db.attendance.put({
              ...existing,
              status,
              batchId: student.batchId || targetBatchId,
              notes: notes.trim() || undefined,
              updatedAt: now
            });
          } else {
            const newRecord: Attendance = {
              id: `att-${student.id}-${selectedDate}`,
              studentId: student.id,
              batchId: student.batchId || targetBatchId,
              date: selectedDate,
              status,
              notes: notes.trim() || undefined,
              createdAt: now,
              updatedAt: now
            };
            await db.attendance.add(newRecord);
          }
        } else {
          if (existing) {
            await db.attendance.delete(existing.id);
          }
        }
      }

      setSuccessMessage('Attendance saved successfully!');
      setHasUnsavedChanges(false);
      setTimeout(() => setSuccessMessage(''), 3000);

      // Refresh existing records
      const refreshed = await db.attendance.where('date').equals(selectedDate).toArray();
      setExistingRecords(refreshed);
    } catch (err: any) {
      setErrorMessage(`Failed to save attendance: ${err.message}`);
    }
  };

  const handleMarkAll = (status: 'present' | 'absent') => {
    const newMap: Record<string, 'present' | 'absent'> = {};
    students.forEach(s => {
      newMap[s.id] = status;
    });
    setAttendanceMap(newMap);
    setHasUnsavedChanges(true);
  };

  const handleManualBatchSelect = (batchId: string) => {
    if (hasUnsavedChanges) {
      if (!window.confirm('You have unsaved attendance changes. Switch batch without saving?')) {
        return;
      }
    }
    setManualOverride(true);
    setSelectedBatchId(batchId);
  };

  const handleResetToAuto = () => {
    if (hasUnsavedChanges) {
      if (!window.confirm('You have unsaved changes. Reset to auto schedule?')) {
        return;
      }
    }
    setManualOverride(false);
    determineAutoBatch(batches);
  };

  const exportAttendanceCSV = () => {
    const headers = ['Attendance ID', 'Student Name', 'Batch', 'Date', 'Status', 'Notes'];
    const rows = allAttendance.map(a => {
      const stuName = students.find(s => s.id === a.studentId)?.name || 'Student';
      const batch = batches.find(b => b.id === a.batchId)?.name || 'General';
      return [a.id, `"${stuName}"`, `"${batch}"`, a.date, a.status, `"${a.notes || ''}"`];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `att_report_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // History stats calculation
  const historyFiltered = historyStudentId === 'all' 
    ? allAttendance 
    : allAttendance.filter(a => a.studentId === historyStudentId);

  const presentCount = historyFiltered.filter(a => a.status === 'present').length;
  const absentCount = historyFiltered.filter(a => a.status === 'absent').length;
  const totalRecordedSessions = presentCount + absentCount;
  const attendancePercentage = totalRecordedSessions > 0 
    ? ((presentCount / totalRecordedSessions) * 100).toFixed(1) 
    : '0.0';

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Attendance Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">Time-based schedule filtering and daily attendance register</p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('daily')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'daily' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Daily Register
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'history' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Attendance History
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-sm flex items-center space-x-2 animate-in fade-in">
          <Check className="w-5 h-5 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-2xl text-sm flex items-center space-x-2">
          <ShieldAlert className="w-5 h-5 flex-shrink-0" />
          <span>{errorMessage}</span>
          <button onClick={loadInitialData} className="ml-auto underline text-xs font-bold">Retry</button>
        </div>
      )}

      {activeTab === 'daily' ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Controls Bar */}
          <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white font-medium text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase">Batch Schedule Filter</label>
                  {manualOverride && isToday && (
                    <button
                      onClick={handleResetToAuto}
                      className="text-[10px] text-blue-600 hover:underline font-bold"
                    >
                      Use Current Time (Auto)
                    </button>
                  )}
                </div>
                <select
                  value={selectedBatchId}
                  onChange={(e) => handleManualBatchSelect(e.target.value)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white font-semibold text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="all">All Batches</option>
                  <option value="none" disabled={selectedBatchId !== 'none'}>No batch currently scheduled</option>
                  <option value="select_prompt" disabled={selectedBatchId !== 'select_prompt'}>Multiple batches scheduled — Please select</option>
                  {batches.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.startTime || ''} - {b.endTime || ''})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-4 md:pt-0">
              <button
                onClick={() => handleMarkAll('present')}
                className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-xs transition-colors"
              >
                Mark All Present
              </button>
              <button
                onClick={handleSaveAttendance}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-semibold text-xs shadow-md transition-colors flex items-center space-x-1.5"
              >
                <Save className="w-4 h-4" />
                <span>Save Attendance</span>
              </button>
            </div>
          </div>

          {/* Status banner for schedule states */}
          {selectedBatchId === 'none' && (
            <div className="p-4 bg-amber-50 border-b border-amber-200 text-amber-900 text-xs flex items-center space-x-2">
              <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>No batch is currently scheduled at this time. Please select a batch manually above.</span>
            </div>
          )}

          {overlapWarning && (
            <div className="p-4 bg-red-50 border-b border-red-200 text-red-900 text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span>Multiple batches are scheduled at this time. Please select a batch.</span>
            </div>
          )}

          {/* Attendance List */}
          {loading ? (
            <div className="p-12 text-center text-slate-500 text-sm">Loading attendance...</div>
          ) : students.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <CalendarCheck className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="font-bold text-slate-700 text-base">
                {selectedBatchId === 'none' || selectedBatchId === 'select_prompt' 
                  ? 'Please select a batch from the dropdown above.' 
                  : 'No students assigned to this batch'}
              </h3>
              <p className="text-xs text-slate-400">Assign students to this batch or choose another batch.</p>
              <div className="flex justify-center space-x-3 pt-2">
                <button
                  onClick={onNavigateToStudents}
                  className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-sm"
                >
                  Assign Students
                </button>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {students.map((student) => {
                const currentStatus = attendanceMap[student.id];
                const currentNote = notesMap[student.id] || '';
                const studentBatch = batches.find(b => b.id === student.batchId);

                return (
                  <div key={student.id} className="p-4 md:px-6 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-50 transition-colors">
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="font-bold text-slate-900 text-base">{student.name}</h4>
                        <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md font-medium">
                          {student.className}
                        </span>
                        {studentBatch && (
                          <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-md font-semibold">
                            {studentBatch.name.split('—')[0]}
                          </span>
                        )}
                      </div>
                      <span className={`text-[11px] font-semibold mt-0.5 inline-block ${
                        currentStatus ? 'text-slate-600' : 'text-amber-600'
                      }`}>
                        Status: {currentStatus ? currentStatus.toUpperCase() : 'Unmarked'}
                      </span>
                    </div>

                    <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
                      <input
                        type="text"
                        placeholder="Optional note..."
                        value={currentNote}
                        onChange={(e) => handleNoteChange(student.id, e.target.value)}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs w-full md:w-48 focus:outline-none focus:ring-1 focus:ring-blue-600"
                      />

                      <div className="flex space-x-2">
                        <button
                          type="button"
                          onClick={() => handleStatusChange(student.id, currentStatus === 'present' ? undefined : 'present')}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 ${
                            currentStatus === 'present'
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
                          }`}
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Present</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleStatusChange(student.id, currentStatus === 'absent' ? undefined : 'absent')}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 ${
                            currentStatus === 'absent'
                              ? 'bg-red-600 text-white shadow-sm'
                              : 'bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-700'
                          }`}
                        >
                          <UserX className="w-3.5 h-3.5" />
                          <span>Absent</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!loading && students.length > 0 && (
            <div className="p-5 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={handleSaveAttendance}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-semibold text-sm shadow-md transition-colors flex items-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>Save Attendance Register</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        /* History & Reports */
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <label className="text-xs font-semibold text-slate-600 uppercase">Filter Student:</label>
              <select
                value={historyStudentId}
                onChange={(e) => setHistoryStudentId(e.target.value)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white font-medium text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="all">All Students (Overall)</option>
                {students.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.className})</option>
                ))}
              </select>
            </div>

            <button
              onClick={exportAttendanceCSV}
              className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-colors shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span>Export Attendance CSV</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Present Sessions</span>
              <span className="text-2xl font-bold text-emerald-600">{presentCount}</span>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Absent Sessions</span>
              <span className="text-2xl font-bold text-red-600">{absentCount}</span>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Attendance Percentage</span>
              <span className="text-2xl font-bold text-blue-600">{attendancePercentage}%</span>
              <p className="text-[11px] text-slate-400 mt-1">Based on {totalRecordedSessions} recorded sessions</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-sm text-slate-800">
              Attendance Log Records
            </div>
            <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
              {historyFiltered.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">No attendance history records found.</div>
              ) : (
                historyFiltered.sort((a, b) => b.date.localeCompare(a.date)).map(att => {
                  const stu = students.find(s => s.id === att.studentId);
                  const batch = batches.find(b => b.id === att.batchId);
                  return (
                    <div key={att.id} className="p-4 flex items-center justify-between text-sm">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-900">{stu?.name || 'Unknown Student'}</span>
                          {batch && <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-md font-semibold">{batch.name.split('—')[0]}</span>}
                        </div>
                        <p className="text-xs text-slate-500">Date: {formatDate(att.date)} {att.notes ? `• Note: ${att.notes}` : ''}</p>
                      </div>
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                        att.status === 'present' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {att.status.toUpperCase()}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
