import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import ProfileHeader from './components/ProfileHeader';
import ProfileStats from './components/ProfileStats';
import ProfileDocuments from './components/ProfileDocuments';
import ProfileAttendance from './components/ProfileAttendance';
import { Loader2 } from 'lucide-react';

export default function ProfileContent() {
  const { employee, loading } = useAuth();
  const { theme } = useTheme();

  if (loading || !employee) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ProfileHeader employee={employee} />
      <ProfileStats employee={employee} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ProfileDocuments employee={employee} />
        <ProfileAttendance employeeId={employee.id!} />
      </div>
    </div>
  );
}
