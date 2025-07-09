import DashboardLayout from '@/components/layout/DashboardLayout';
import AttendanceManagement from '@/components/attendance/AttendanceManagement';

export default function AttendancePage() {
  return (
    <DashboardLayout currentPage="attendance">
      <AttendanceManagement />
    </DashboardLayout>
  );
}