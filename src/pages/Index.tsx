import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Layout/Header';
import DashboardRouter from '@/components/Dashboard/DashboardRouter';
import WelcomePage from './WelcomePage';
import { TERMS_VERSION } from '@/constants/termsContent';

const Index = () => {
  const { isAuthenticated, loading, user } = useAuth();
  const navigate = useNavigate();
  const [checkingTerms, setCheckingTerms] = useState(true);

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      checkTermsAcceptance();
    } else {
      setCheckingTerms(false);
    }
  }, [isAuthenticated, user]);

  const checkTermsAcceptance = async () => {
    try {
      const { data } = await supabase
        .from('terms_acceptance')
        .select('id')
        .eq('user_id', user?.id)
        .eq('terms_version', TERMS_VERSION)
        .maybeSingle();

      if (!data && user?.role !== 'admin') {
        // User hasn't accepted terms, redirect
        navigate('/terms-and-conditions');
      }
    } catch (error) {
      console.error('Error checking terms:', error);
    } finally {
      setCheckingTerms(false);
    }
  };

  if (loading || checkingTerms) {
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
