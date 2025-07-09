import DashboardLayout from '@/components/layout/DashboardLayout';
import HealthReportsManagement from '@/components/health/HealthReportsManagement';

export default function HealthPage() {
  return (
    <DashboardLayout currentPage="health">
      <HealthReportsManagement />
    </DashboardLayout>
  );
}