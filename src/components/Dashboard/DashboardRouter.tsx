import React from 'react';
import { useAuth } from '@/context/AuthContext';
import AdminDashboard from './AdminDashboard';
import GeneratorDashboard from './GeneratorDashboard';
import TransporterDashboard from './TransporterDashboard';
import RecyclerDashboard from './RecyclerDashboard';
import DriverDashboard from './DriverDashboard';

const DashboardRouter: React.FC = () => {
  const { user } = useAuth();

  if (!user) return null;

  switch (user.role) {
    case 'admin':
      return <AdminDashboard />;
    case 'generator':
      return <GeneratorDashboard />;
    case 'transporter':
      return <TransporterDashboard />;
    case 'recycler':
      return <RecyclerDashboard />;
    case 'driver':
      return <DriverDashboard />;
    default:
      return (
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold">Unknown Role</h2>
          <p className="text-muted-foreground">Please contact administrator</p>
        </div>
      );
  }
};

export default DashboardRouter;