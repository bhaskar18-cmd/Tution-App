import React from 'react';
import { NavTab, AppSettings } from '../types';
import { LayoutDashboard, Layers, Users, CalendarCheck, FileText, CreditCard, Settings as SettingsIcon } from 'lucide-react';
import { formatDate, getLocalDateString } from '../utils/formatters';

interface NavbarProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  settings: AppSettings | null;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onTabChange, settings }) => {
  const todayStr = getLocalDateString();

  const navItems: { id: NavTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'batches', label: 'Batches', icon: <Layers className="w-5 h-5" /> },
    { id: 'students', label: 'Students', icon: <Users className="w-5 h-5" /> },
    { id: 'attendance', label: 'Attendance', icon: <CalendarCheck className="w-5 h-5" /> },
    { id: 'fees', label: 'Fees', icon: <FileText className="w-5 h-5" /> },
    { id: 'payments', label: 'Payments', icon: <CreditCard className="w-5 h-5" /> },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon className="w-5 h-5" /> },
  ];

  return (
    <>
      {/* Top Header */}
      <header className="bg-slate-900 text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-xl shadow-inner">
              TT
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">{settings?.instituteName || 'TutorTrack'}</h1>
              <p className="text-xs text-slate-300">Tutor: {settings?.tutorName || 'Private Tutor'}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="text-right">
              <span className="text-xs text-slate-400 block">Today</span>
              <span className="text-sm font-medium">{formatDate(todayStr)}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Desktop Sidebar / Navigation Header */}
      <div className="hidden md:flex bg-slate-800 border-b border-slate-700 text-slate-200 px-4 py-2 sticky top-[65px] z-20">
        <div className="max-w-7xl mx-auto w-full flex space-x-1 overflow-x-auto">
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'hover:bg-slate-700 text-slate-300 hover:text-white'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav aria-label="Mobile Bottom Navigation" className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 text-slate-300 z-40 px-1 py-1 shadow-lg">
        <div className="flex justify-around items-center">
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex flex-col items-center py-1.5 px-1.5 rounded-xl transition-colors ${
                  isActive ? 'text-blue-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className={`p-1 rounded-lg ${isActive ? 'bg-blue-600/20 text-blue-400' : ''}`}>
                  {item.icon}
                </div>
                <span className="text-[9px] mt-0.5">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
