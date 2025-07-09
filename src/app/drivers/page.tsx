import DashboardLayout from '@/components/layout/DashboardLayout';
import DriversManagement from '@/components/drivers/DriversManagement';

export default function DriversPage() {
  return (
    <DashboardLayout currentPage="drivers">
      <DriversManagement />
    </DashboardLayout>
  );
}