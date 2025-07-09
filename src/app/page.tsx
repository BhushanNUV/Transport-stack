'use client';

import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Dashboard from '@/components/dashboard/Dashboard';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function Home() {
  const { loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <DashboardLayout currentPage="dashboard">
      <Dashboard />
    </DashboardLayout>
  );
}