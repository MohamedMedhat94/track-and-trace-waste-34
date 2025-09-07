import React from 'react';
import { useAuth } from '@/context/AuthContext';
import Header from '@/components/Layout/Header';
import DashboardRouter from '@/components/Dashboard/DashboardRouter';
import WelcomePage from './WelcomePage';

const Index = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <WelcomePage />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <DashboardRouter />
      </main>
    </div>
  );
};

export default Index;
