import React, { useState, useEffect } from 'react';
import { db } from '../db/db';
import { AppSettings } from '../types';
import { 
  Settings as SettingsIcon, Download, Upload, Trash2, 
  Check, Save, Database, FileSpreadsheet 
} from 'lucide-react';

interface SettingsViewProps {
  settings: AppSettings | null;
  onSettingsUpdated: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onSettingsUpdated
}) => {
  const [tutorName, setTutorName] = useState('');
  const [instituteName, setInstituteName] = useState('');
  const [defaultMonthlyFee, setDefaultMonthlyFee] = useState(1500);
  const [defaultDueDay, setDefaultDueDay] = useState(10);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (settings) {
      setTutorName(settings.tutorName || '');
      setInstituteName(settings.instituteName || '');
      setDefaultMonthlyFee(settings.defaultMonthlyFee || 1500);
      setDefaultDueDay(settings.defaultDueDay || 10);
    }
  }, [settings]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const current = await db.settings.get('settings');
      if (current) {
        current.tutorName = tutorName.trim();
        current.instituteName = instituteName.trim();
        current.defaultMonthlyFee = Number(defaultMonthlyFee);
        current.defaultDueDay = Number(defaultDueDay);
        await db.settings.put(current);
        onSettingsUpdated();
        setSuccessMsg('Settings updated successfully!');
        setTimeout(() => setSuccessMsg(''), 3000);
      }
    } catch {
      setErrorMsg('Failed to update settings.');
    }
  };

  const handleExportJson = async () => {
    try {
      const [students, attendance, feeRecords, payments, settingsList] = await Promise.all([
        db.students.toArray(),
        db.attendance.toArray(),
        db.feeRecords.toArray(),
        db.payments.toArray(),
        db.settings.toArray()
      ]);

      const backupData = {
        schemaVersion: 2,
        exportTimestamp: Date.now(),
        appName: 'TutorTrack',
        data: {
          students,
          attendance,
          feeRecords,
          payments,
          settings: settingsList
        }
      };

      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `tutortrack_backup_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch {
      alert('Failed to export JSON backup.');
    }
  };

  const handleImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (!json.data || !json.data.students) {
          alert('Invalid backup file format.');
          return;
        }

        if (window.confirm('Are you sure you want to restore this backup? This will replace current local records.')) {
          await db.transaction('rw', db.students, db.attendance, db.feeRecords, db.payments, db.settings, async () => {
            await db.students.clear();
            await db.attendance.clear();
            await db.feeRecords.clear();
            await db.payments.clear();
            await db.settings.clear();

            if (json.data.students) await db.students.bulkAdd(json.data.students);
            if (json.data.attendance) await db.attendance.bulkAdd(json.data.attendance);
            if (json.data.feeRecords) await db.feeRecords.bulkAdd(json.data.feeRecords);
            if (json.data.payments) await db.payments.bulkAdd(json.data.payments);
            if (json.data.settings) await db.settings.bulkAdd(json.data.settings);
          });

          alert('Backup restored successfully! App will reload.');
          window.location.reload();
        }
      } catch (err) {
        console.error(err);
        alert('Failed to parse or restore backup file.');
      }
    };
    reader.readAsText(file);
  };

  const handleClearAllData = async () => {
    if (window.confirm('WARNING: This will permanently delete all students, attendance, fee records, and payment history from this device! Are you absolutely sure?')) {
      if (window.confirm('Final confirmation: Delete all TutorTrack local data?')) {
        await db.delete();
        window.location.reload();
      }
    }
  };

  const exportStudentsCSV = async () => {
    const students = await db.students.toArray();
    const headers = ['ID', 'Name', 'Guardian', 'Class', 'School', 'Phone', 'WhatsApp', 'Monthly Fee', 'Due Day', 'Active'];
    const rows = students.map(s => [s.id, `"${s.name}"`, `"${s.guardianName || ''}"`, `"${s.className}"`, `"${s.schoolName || ''}"`, s.phoneNumber, s.whatsappNumber || '', s.monthlyFee, s.dueDay, s.active]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadCsv(csv, 'students_export.csv');
  };

  const downloadCsv = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.click();
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">Settings & Preferences</h2>
        <p className="text-xs text-slate-500 mt-0.5">Configure tutor profile and data backup / restore</p>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-sm flex items-center space-x-2">
          <Check className="w-5 h-5 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Profile Settings */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h3 className="font-bold text-base text-slate-800 mb-4 flex items-center space-x-2">
          <SettingsIcon className="w-5 h-5 text-blue-600" />
          <span>Tutor & Institute Profile</span>
        </h3>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Tutor Name</label>
              <input
                type="text"
                value={tutorName}
                onChange={(e) => setTutorName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Institute Name</label>
              <input
                type="text"
                value={instituteName}
                onChange={(e) => setInstituteName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Default Monthly Fee (₹)</label>
              <input
                type="number"
                value={defaultMonthlyFee}
                onChange={(e) => setDefaultMonthlyFee(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Default Due Day (1-31)</label>
              <input
                type="number"
                min={1}
                max={31}
                value={defaultDueDay}
                onChange={(e) => setDefaultDueDay(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2.5 rounded-xl shadow-md transition-colors text-sm flex items-center space-x-1.5"
            >
              <Save className="w-4 h-4" />
              <span>Save Profile</span>
            </button>
          </div>
        </form>
      </div>

      {/* Backup & Restore */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h3 className="font-bold text-base text-slate-800 mb-2 flex items-center space-x-2">
          <Database className="w-5 h-5 text-purple-600" />
          <span>Data Backup & Restore</span>
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          All records are stored locally in IndexedDB. Regularly export your JSON backup and keep it safe.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={handleExportJson}
            className="bg-purple-600 hover:bg-purple-700 text-white font-medium p-4 rounded-xl shadow-sm transition-colors flex items-center justify-center space-x-2 text-sm"
          >
            <Download className="w-4 h-4" />
            <span>Export Complete JSON Backup</span>
          </button>

          <label className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium p-4 rounded-xl shadow-sm transition-colors flex items-center justify-center space-x-2 text-sm cursor-pointer">
            <Upload className="w-4 h-4" />
            <span>Restore JSON Backup</span>
            <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
          </label>
        </div>
      </div>

      {/* CSV Reports Export */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h3 className="font-bold text-base text-slate-800 mb-2 flex items-center space-x-2">
          <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
          <span>Spreadsheet Reports (CSV)</span>
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Download tabular student records for spreadsheet analysis.
        </p>

        <button
          onClick={exportStudentsCSV}
          className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-4 py-2.5 rounded-xl text-xs transition-colors flex items-center space-x-2"
        >
          <Download className="w-4 h-4" />
          <span>Export Students CSV</span>
        </button>
      </div>

      {/* Danger Zone */}
      <div className="bg-red-50 rounded-2xl border border-red-200 p-6 shadow-sm">
        <h3 className="font-bold text-base text-red-900 mb-2 flex items-center space-x-2">
          <Trash2 className="w-5 h-5 text-red-600" />
          <span>Danger Zone</span>
        </h3>
        <p className="text-xs text-red-700 mb-4">
          Permanently delete all students, attendance, fee records, and payment history from this device.
        </p>
        <button
          onClick={handleClearAllData}
          className="bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2.5 rounded-xl text-xs shadow-md transition-colors"
        >
          Clear All Application Data
        </button>
      </div>
    </div>
  );
};
