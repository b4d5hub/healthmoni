import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface User {
  id: string;
  email: string;
  name: string;
  sex: 'male' | 'female';
  dateOfBirth: string;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  session: any | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  signup: (email: string, password: string, name: string, sex: 'male' | 'female', dateOfBirth: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (data: Partial<Pick<User, 'name' | 'sex' | 'dateOfBirth'>>) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = async (userId: string, email: string): Promise<User> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching profile:', error);
    }

    return {
      id: userId,
      email: email,
      name: data?.name || email.split('@')[0],
      sex: (data?.sex as 'male' | 'female') || 'male',
      dateOfBirth: data?.date_of_birth || '1990-01-01',
      avatar: data?.avatar_url || undefined,
    };
  };

  useEffect(() => {
    // onAuthStateChange is the single source of truth — it fires on:
    //   - initial load (INITIAL_SESSION event) regardless of whether user is logged in or not
    //   - sign in / sign out events
    // So we only need this one listener. getSession() is NOT needed.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session?.user) {
        const profile = await fetchProfile(session.user.id, session.user.email!);
        setUser(profile);
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const loginWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
    if (error) throw error;
  }, []);

  const signup = useCallback(async (email: string, password: string, name: string, sex: 'male' | 'female', dateOfBirth: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
        },
      },
    });

    if (error) throw error;

    if (data.user) {
      // Create profile entry
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: data.user.id,
          name,
          sex,
          date_of_birth: dateOfBirth,
        });
      
      if (profileError) console.error('Profile creation error:', profileError);
    }
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('lifepulse_device'); // Clean up device on logout
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  }, []);

  const updateProfile = useCallback(async (data: Partial<Pick<User, 'name' | 'sex' | 'dateOfBirth'>>) => {
    if (!user) return;
    
    // Correct Supabase syntax
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        name: data.name ?? user.name,
        sex: data.sex ?? user.sex,
        date_of_birth: data.dateOfBirth ?? user.dateOfBirth,
      });

    if (error) throw error;
    
    // Refresh user state
    const profile = await fetchProfile(user.id, user.email);
    setUser(profile);
  }, [user]);

  const changePassword = useCallback(async (_currentPassword: string, newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, isLoading, login, loginWithGoogle, signup, logout, resetPassword, updateProfile, changePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
