import DashboardLayout from '@/components/layout/DashboardLayout';
import HealthAlerts from '@/components/dashboard/HealthAlerts';

export default function AlertsPage() {
  return (
    <DashboardLayout currentPage="alerts">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Health Alerts</h1>
          <p className="text-gray-600">Monitor and manage all health and safety alerts</p>
        </div>
        <HealthAlerts />
      </div>
    </DashboardLayout>
  );
}