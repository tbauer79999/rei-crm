import React, { createContext, useContext, useEffect, useState } from 'react';
import supabase from '../lib/supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const getSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        // Store auth token for API calls
        if (session?.access_token) {
          localStorage.setItem('auth_token', session.access_token);
          sessionStorage.setItem('auth_token', session.access_token);
        }
        
        if (session?.user) {
          // Create user object with all properties the API middleware expects
          setUser({
            ...session.user,
            role: 'business_admin',
            tenant_id: session.user.id,
            invited_signup: false,
            isInvitedUser: false,
            // Add session for API calls
            session: session,
            access_token: session.access_token
          });
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Session error:', error);
        setUser(null);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      
      // Store auth token
      if (session?.access_token) {
        localStorage.setItem('auth_token', session.access_token);
        sessionStorage.setItem('auth_token', session.access_token);
      }
      
      if (session?.user) {
        setUser({
          ...session.user,
          role: 'business_admin',
          tenant_id: session.user.id,
          invited_signup: false,
          isInvitedUser: false,
          session: session,
          access_token: session.access_token
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading,
      role: user?.role,
      tenantId: user?.tenant_id,
      isInvitedUser: user?.invited_signup || false
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};