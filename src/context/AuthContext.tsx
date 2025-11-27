import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export type UserRole = 'admin' | 'generator' | 'transporter' | 'recycler' | 'driver';

export interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  role: UserRole;
  company_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  companyId?: string;
  companyName?: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  signUp: (email: string, password: string, fullName: string, role: UserRole) => Promise<{ error: any; message: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let profileFetched = false;

    // Initialize session
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!isMounted) return;
        
        setSession(session);
        
        if (session?.user) {
          profileFetched = true;
          await fetchUserProfile(session.user.id);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('Init auth error:', error);
        if (isMounted) setLoading(false);
      }
    };

    // Listen to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;
        
        // Skip if we already fetched profile during init
        if (event === 'INITIAL_SESSION' && profileFetched) {
          return;
        }
        
        setSession(session);
        
        if (session?.user && event !== 'TOKEN_REFRESHED') {
          // Use setTimeout to avoid blocking
          setTimeout(() => {
            if (isMounted) fetchUserProfile(session.user.id);
          }, 0);
        } else if (!session) {
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      }
    );

    initAuth();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Profile fetch error:', error);
        setLoading(false);
        return;
      }

      if (profileData) {
        setProfile(profileData as UserProfile);
        setUser({
          id: profileData.user_id,
          name: profileData.full_name || profileData.email || 'مستخدم',
          email: profileData.email || '',
          role: profileData.role as UserRole,
          companyId: profileData.company_id || undefined,
        });
      } else {
        console.warn('No profile found for user:', userId);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Profile fetch exception:', error);
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, fullName: string, role: UserRole) => {
    try {
      // إنشاء حساب Auth حقيقي باستخدام edge function
      const { data, error } = await supabase.functions.invoke('create-user-profile', {
        body: {
          email,
          password,
          fullName,
          role
        }
      });

      if (error) {
        console.error('Error in signUp:', error);
        return { 
          error: error, 
          message: null 
        };
      }
      
      // إرجاع رسالة نجاح
      return { 
        error: null, 
        message: 'تم إنشاء حسابك بنجاح. سيتم تفعيله من قبل المدير قريباً.'
      };
    } catch (error: any) {
      console.error('Error in signUp:', error);
      return { error, message: null };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) return { error };

      if (data.user) {
        // Check activation status
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('is_active')
          .eq('user_id', data.user.id)
          .single();

        if (profileError || !profileData) {
          await supabase.auth.signOut();
          return { 
            error: { 
              message: 'خطأ في تحميل بيانات المستخدم' 
            } 
          };
        }

        if (!profileData.is_active) {
          await supabase.auth.signOut();
          return { 
            error: { 
              message: 'حسابك لم يتم تفعيله بعد. يرجى انتظار موافقة المدير.' 
            } 
          };
        }

        // Background logging
        setTimeout(async () => {
          try {
            await supabase.rpc('log_auth_event', {
              user_id_param: data.user.id,
              email_param: email,
              action_param: 'login'
            });

            await supabase
              .from('profiles')
              .update({ last_login: new Date().toISOString() })
              .eq('user_id', data.user.id);
          } catch (logError) {
            console.error('Logging failed:', logError);
          }
        }, 0);
      }

      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  const signOut = async () => {
    try {
      // Log logout in background (non-blocking)
      if (session?.user) {
        setTimeout(async () => {
          try {
            await supabase.rpc('log_auth_event', {
              user_id_param: session.user.id,
              email_param: session.user.email || '',
              action_param: 'logout'
            });
          } catch (logError) {
            console.error('Log error:', logError);
          }
        }, 0);
      }
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      // Clear local state regardless of Supabase response
      setUser(null);
      setProfile(null);
      setSession(null);
      
      return { error: null };
    } catch (error: any) {
      console.error('Sign out error:', error);
      // Clear local state even on error
      setUser(null);
      setProfile(null);
      setSession(null);
      return { error: null };
    }
  };

  const isAuthenticated = !!session?.user || !!user;

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      session, 
      signUp, 
      signIn, 
      signOut, 
      isAuthenticated, 
      loading 
    }}>
      {children}
    </AuthContext.Provider>
  );
};
