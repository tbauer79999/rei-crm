import React, { createContext, useContext, useEffect, useState } from 'react';
import supabase from '../lib/supabaseClient';

const AuthContext = createContext();

// Hardcoded roles as immediate fallback
const USER_ROLES = {
  'thomasbauer1008@gmail.com': {
    role: 'business_admin',
    tenant_id: '74fa6d05-226e-4a5e-adcf-fb47cad8a288'
  },
  'info@elevateddreamhomes.com': {
    role: 'user',
    tenant_id: '74fa6d05-226e-4a5e-adcf-fb47cad8a288'
  },
  'thomasbauer799@gmail.com': {
    role: 'global_admin',
    tenant_id: '46f58bba-b709-4460-8df1-ee61f0d42c57'
  }
};

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        console.log('🔐 Initializing auth...');
        
        // First, try to refresh the session in case it's expired
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError) {
          console.log('⚠️ Refresh failed, getting current session:', refreshError.message);
        } else if (refreshData?.session) {
          console.log('✅ Session refreshed successfully');
        }
        
        // Now get the current session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Session error:', error);
          setUser(null);
          setSession(null);
          setLoading(false);
          return;
        }
        
        if (session?.user && mounted) {
          console.log('✅ Session found for:', session.user.email);
          console.log('🔑 Session expires at:', new Date(session.expires_at * 1000).toLocaleString());
          
          // Store the full session
          setSession(session);
          
          // Store token in localStorage for backend API calls
          if (session.access_token) {
            localStorage.setItem('auth_token', session.access_token);
          }
          
          // Get user info from hardcoded list
          const userInfo = USER_ROLES[session.user.email] || {
            role: 'user',
            tenant_id: session.user.id
          };
          
          setUser({
            ...session.user,
            email: session.user.email,
            role: userInfo.role,
            tenant_id: userInfo.tenant_id
          });
          
        } else {
          console.log('❌ No session found');
          setUser(null);
          setSession(null);
        }
        
        if (mounted) {
          setLoading(false);
        }
      } catch (error) {
        console.error('❌ Error initializing auth:', error);
        if (mounted) {
          setUser(null);
          setSession(null);
          setLoading(false);
        }
      }
    };

    // Initialize immediately
    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted) return;
      
      console.log('🔄 Auth event:', event);
      
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setSession(null);
      } else if (event === 'TOKEN_REFRESHED') {
        console.log('🔄 Token refreshed');
        setSession(newSession);
      } else if (newSession?.user) {
        setSession(newSession);
        
        // Store token in localStorage for backend API calls
        if (newSession.access_token) {
          localStorage.setItem('auth_token', newSession.access_token);
        }
        
        const userInfo = USER_ROLES[newSession.user.email] || {
          role: 'user',
          tenant_id: newSession.user.id
        };
        
        setUser({
          ...newSession.user,
          email: newSession.user.email,
          role: userInfo.role,
          tenant_id: userInfo.tenant_id
        });
      }
    });

    // Set up periodic token refresh (every 30 minutes)
    const refreshInterval = setInterval(async () => {
      if (mounted) {
        console.log('⏰ Periodic token refresh...');
        const { data, error } = await supabase.auth.refreshSession();
        if (error) {
          console.error('❌ Periodic refresh failed:', error);
        } else if (data?.session) {
          console.log('✅ Token refreshed via interval');
          setSession(data.session);
        }
      }
    }, 30 * 60 * 1000); // 30 minutes

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearInterval(refreshInterval);
    };
  }, []);

  // Helper to get current valid session
  const getSession = async () => {
    // If session is about to expire (within 5 minutes), refresh it
    if (session?.expires_at) {
      const expiresAt = new Date(session.expires_at * 1000);
      const now = new Date();
      const minutesUntilExpiry = (expiresAt - now) / 1000 / 60;
      
      if (minutesUntilExpiry < 5) {
        console.log('🔄 Session expiring soon, refreshing...');
        const { data, error } = await supabase.auth.refreshSession();
        if (!error && data?.session) {
          setSession(data.session);
          return data.session;
        }
      }
    }
    
    return session;
  };

  // Helper to check enterprise access
  const canAccessEnterprise = user?.role === 'global_admin' || user?.role === 'enterprise_admin';
  const canAccessAdmin = ['global_admin', 'enterprise_admin', 'business_admin'].includes(user?.role);

  const value = { 
    user, 
    loading,
    session,
    getSession,
    role: user?.role,
    tenantId: user?.tenant_id,
    canAccessEnterprise,
    canAccessAdmin
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export { AuthProvider, useAuth };