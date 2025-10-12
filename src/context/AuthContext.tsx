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
    let loadingTimeout: NodeJS.Timeout;

    // Safety timeout - stop loading after 5 seconds max
    loadingTimeout = setTimeout(() => {
      if (isMounted && loading) {
        console.warn('Loading timeout - forcing stop');
        setLoading(false);
      }
    }, 5000);

    // Check for existing session
    const initSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session error:', error);
          if (isMounted) {
            setSession(null);
            setUser(null);
            setProfile(null);
            setLoading(false);
          }
          return;
        }

        if (isMounted) {
          setSession(session);
          
          if (session?.user) {
            // Fetch profile immediately
            await fetchUserProfile(session.user.id);
          } else {
            setUser(null);
            setProfile(null);
            setLoading(false);
          }
        }
      } catch (error) {
        console.error('Error initializing session:', error);
        if (isMounted) {
          setSession(null);
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth event:', event);
        
        // Skip initial SIGNED_IN event if we already have session
        if (event === 'SIGNED_IN' && user) {
          return;
        }
        
        if (!isMounted) return;
        
        setSession(session);
        
        if (session?.user && event !== 'TOKEN_REFRESHED') {
          await fetchUserProfile(session.user.id);
        } else if (!session) {
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      }
    );

    initSession();

    return () => {
      isMounted = false;
      clearTimeout(loadingTimeout);
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
        console.error('Error fetching profile:', error);
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
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
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
    setLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setLoading(false);
        return { error };
      }

      if (data.user) {
        // التحقق من تفعيل الحساب
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('is_active')
          .eq('user_id', data.user.id)
          .single();

        if (profileError || !profileData) {
          console.error('Error fetching profile:', profileError);
          await supabase.auth.signOut();
          setLoading(false);
          return { 
            error: { 
              message: 'خطأ في تحميل بيانات المستخدم' 
            } 
          };
        }

        if (!profileData.is_active) {
          await supabase.auth.signOut();
          setLoading(false);
          return { 
            error: { 
              message: 'حسابك لم يتم تفعيله بعد. يرجى انتظار موافقة المدير.' 
            } 
          };
        }

        // Log login event in background
        setTimeout(async () => {
          try {
            await supabase.rpc('log_auth_event', {
              user_id_param: data.user.id,
              email_param: email,
              action_param: 'login'
            });

            // Update last login for profiles in background
            await supabase
              .from('profiles')
              .update({ last_login: new Date().toISOString() })
              .eq('user_id', data.user.id);
          } catch (logError) {
            console.error('Failed to log login event:', logError);
          }
        }, 0);
      }

      // Profile will be loaded by the auth state change listener
      return { error: null };
    } catch (error: any) {
      setLoading(false);
      return { error };
    }
  };

  const signOut = async () => {
    // Log logout before signing out
    if (session?.user) {
      await supabase.rpc('log_auth_event', {
        user_id_param: session.user.id,
        email_param: session.user.email,
        action_param: 'logout'
      });
    }
    
    const { error } = await supabase.auth.signOut();
    return { error };
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
