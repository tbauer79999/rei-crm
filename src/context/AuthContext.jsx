import React, { createContext, useContext, useEffect, useState } from 'react';
import supabase from '../lib/supabaseClient';
// ONLY ADD THESE TWO IMPORTS - everything else stays the same
import { ROLE_PERMISSIONS, hasPermission as checkPermission, getRolePermissions } from '../lib/permissions';
import { PLAN_FEATURES, hasFeature as checkFeature, getFeatureValue, checkLimit, PLAN_METADATA } from '../lib/plans';

const AuthContext = createContext();

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
          
          // Debug JWT payload
          if (session.access_token) {
            try {
              const payload = JSON.parse(atob(session.access_token.split('.')[1]));
              console.log('JWT payload:', payload);
              console.log('tenant_id in JWT:', payload.tenant_id);
              console.log('role in JWT:', payload.role);
            } catch (e) {
              console.warn('Could not decode JWT:', e);
            }
          }
          
          // Store the full session
          setSession(session);
          
          // Store token in localStorage for backend API calls
          if (session.access_token) {
            localStorage.setItem('auth_token', session.access_token);
          }
          
          // Get user info dynamically from database
          await loadUserInfo(session.user);
          
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

    // Function to load user info from database
    const loadUserInfo = async (authUser) => {
      try {
        console.log('📊 Loading user profile for:', authUser.email);
        
        // Try to get role and tenant_id from BOTH app_metadata AND user_metadata
        let role = authUser.user_metadata?.role || authUser.app_metadata?.role;
        let tenant_id = authUser.user_metadata?.tenant_id || authUser.app_metadata?.tenant_id;

        console.log('🔍 Raw authUser.user_metadata:', authUser.user_metadata);
        console.log('🔍 Raw authUser.app_metadata:', authUser.app_metadata);
        
        console.log('🔍 Auth app_metadata - role:', authUser.app_metadata?.role, 'tenant_id:', authUser.app_metadata?.tenant_id);
        console.log('🔍 Auth user_metadata - role:', authUser.user_metadata?.role, 'tenant_id:', authUser.user_metadata?.tenant_id);
        console.log('🔍 Final metadata values - role:', role, 'tenant_id:', tenant_id);
        
        // If we have both from metadata, use them but still verify with database
        if (role && tenant_id) {
          const enrichedUser = {
            ...authUser,
            email: authUser.email,
            role: role,
            tenant_id: tenant_id
          };
          
          console.log('✅ Setting user with metadata:', { email: enrichedUser.email, role: enrichedUser.role, tenant_id: enrichedUser.tenant_id });
          setUser(enrichedUser);
          
          // Optionally verify in background (don't wait for this)
          verifyUserProfile(authUser.id, role, tenant_id);
          return;
        }
        
        // If metadata is missing, get from database
        console.log('🔍 Fetching from users_profile table...');
        const { data: profile, error: profileError } = await supabase
          .from('users_profile')
          .select('role, tenant_id')
          .eq('id', authUser.id)
          .single();

        if (profileError) {
          console.error('❌ Profile fetch error:', profileError);
          
          // Fallback: If profile doesn't exist, assume it's a new business admin
          console.log('⚡ Using fallback: business_admin role');
          const fallbackUser = {
            ...authUser,
            email: authUser.email,
            role: 'business_admin',
            tenant_id: authUser.id // Use user ID as tenant ID for new business admins
          };
          
          console.log('✅ Setting fallback user:', { email: fallbackUser.email, role: fallbackUser.role, tenant_id: fallbackUser.tenant_id });
          setUser(fallbackUser);
          return;
        }

        if (profile) {
          console.log('✅ Profile loaded:', profile);
          const enrichedUser = {
            ...authUser,
            email: authUser.email,
            role: profile.role || 'business_admin',
            tenant_id: profile.tenant_id || authUser.id
          };
          
          console.log('✅ Setting user with profile data:', { email: enrichedUser.email, role: enrichedUser.role, tenant_id: enrichedUser.tenant_id });
          setUser(enrichedUser);
          
          // Update auth metadata if it's missing - UPDATE BOTH user_metadata AND app_metadata
          if (!role || !tenant_id) {
            updateAuthMetadata(authUser.id, profile.role, profile.tenant_id);
          }
        }
        
      } catch (error) {
        console.error('❌ Error loading user info:', error);
        
        // Ultimate fallback
        const ultimateFallbackUser = {
          ...authUser,
          email: authUser.email,
          role: 'business_admin',
          tenant_id: authUser.id
        };
        
        console.log('✅ Setting ultimate fallback user:', { email: ultimateFallbackUser.email, role: ultimateFallbackUser.role, tenant_id: ultimateFallbackUser.tenant_id });
        setUser(ultimateFallbackUser);
      }
    };

    // Background verification of user profile
    const verifyUserProfile = async (userId, currentRole, currentTenantId) => {
      try {
        const { data: profile } = await supabase
          .from('users_profile')
          .select('role, tenant_id')
          .eq('id', userId)
          .single();
          
        // If database differs from metadata, update user state
        if (profile && (profile.role !== currentRole || profile.tenant_id !== currentTenantId)) {
          console.log('🔄 Profile changed, updating user...');
          setUser(prev => ({
            ...prev,
            role: profile.role,
            tenant_id: profile.tenant_id
          }));
        }
      } catch (error) {
        console.log('⚠️ Background verification failed:', error);
      }
    };

    // Update auth metadata to sync with database - ENHANCED VERSION
    const updateAuthMetadata = async (userId, role, tenantId) => {
      try {
        console.log('🔄 Updating auth metadata for user:', userId, 'role:', role, 'tenant_id:', tenantId);
        
        // Update user metadata (this gets included in JWT more reliably)
        await supabase.auth.updateUser({
          data: { 
            role: role, 
            tenant_id: tenantId 
          }
        });
        console.log('✅ User metadata updated');

        // Also update via SQL to ensure both app_metadata and user_metadata are set
        const { error: sqlError } = await supabase.rpc('update_user_metadata', {
          user_id: userId,
          new_role: role,
          new_tenant_id: tenantId
        });

        if (sqlError) {
          console.warn('⚠️ SQL metadata update failed:', sqlError.message);
          // Not critical, continue with normal flow
        } else {
          console.log('✅ SQL metadata update successful');
        }

        // 🔄 Force session refresh to apply new metadata to JWT
        const { data: refreshedSession, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshedSession?.session) {
          console.log('🔁 Session refreshed to reflect new metadata');
          setSession(refreshedSession.session);
          localStorage.setItem('auth_token', refreshedSession.session.access_token);
          
          // Debug the refreshed JWT
          if (refreshedSession.session.access_token) {
            try {
              const payload = JSON.parse(atob(refreshedSession.session.access_token.split('.')[1]));
              console.log('🔍 Refreshed JWT payload:', payload);
              console.log('🔍 Refreshed tenant_id in JWT:', payload.tenant_id);
            } catch (e) {
              console.warn('Could not decode refreshed JWT:', e);
            }
          }
          
          await loadUserInfo(refreshedSession.session.user); // rehydrate user state
        } else {
          console.warn('⚠️ Session refresh failed after metadata update:', refreshError?.message);
        }

      } catch (error) {
        console.log('⚠️ Failed to update auth metadata:', error);
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
        localStorage.removeItem('auth_token');
      } else if (event === 'TOKEN_REFRESHED') {
        console.log('🔄 Token refreshed');
        setSession(newSession);
        if (newSession?.access_token) {
          localStorage.setItem('auth_token', newSession.access_token);
          
          // Debug refreshed token
          try {
            const payload = JSON.parse(atob(newSession.access_token.split('.')[1]));
            console.log('🔍 Token refresh - JWT payload:', payload);
            console.log('🔍 Token refresh - tenant_id in JWT:', payload.tenant_id);
          } catch (e) {
            console.warn('Could not decode refreshed JWT:', e);
          }
        }
      } else if (newSession?.user) {
        setSession(newSession);
        
        // Store token in localStorage for backend API calls
        if (newSession.access_token) {
          localStorage.setItem('auth_token', newSession.access_token);
        }
        
        // Load user info dynamically
        await loadUserInfo(newSession.user);
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

  const refreshUser = async () => {
    try {
      console.log('🔄 Refreshing user data...');
      const { data, error } = await supabase.auth.getUser();
      
      if (data?.user && !error) {
        // Re-fetch user profile from database
        const { data: profile, error: profileError } = await supabase
          .from('users_profile')
          .select('role, tenant_id')
          .eq('id', data.user.id)
          .single();

        if (profile && !profileError) {
          const refreshedUser = {
            ...data.user,
            email: data.user.email,
            role: profile.role || 'business_admin',
            tenant_id: profile.tenant_id || data.user.id
          };
          
          console.log('✅ User refreshed:', { email: refreshedUser.email, role: refreshedUser.role, tenant_id: refreshedUser.tenant_id });
          setUser(refreshedUser);
        } else {
          console.log('⚠️ Profile refresh failed, using fallback');
          const fallbackRefreshUser = {
            ...data.user,
            email: data.user.email,
            role: 'business_admin',
            tenant_id: data.user.id
          };
          
          console.log('✅ Fallback user set:', { email: fallbackRefreshUser.email, role: fallbackRefreshUser.role, tenant_id: fallbackRefreshUser.tenant_id });
          setUser(fallbackRefreshUser);
        }
      }
    } catch (error) {
      console.error('❌ Error refreshing user:', error);
    }
  };

  // Add debugging log for user state changes
  useEffect(() => {
    if (user) {
      console.log('👤 User state updated:', { 
        email: user.email, 
        role: user.role, 
        tenant_id: user.tenant_id,
        hasAllRequiredFields: !!(user.email && user.role && user.tenant_id)
      });
    } else {
      console.log('👤 User state is null/undefined');
    }
  }, [user]);

  // NEW: Add these helper functions (they work even if plan/permission data isn't loaded yet)
  const hasPermission = (permission) => {
    if (!user?.role) return false;
    try {
      return checkPermission(user.role, permission);
    } catch (error) {
      console.warn('Permission check failed:', error);
      return false;
    }
  };

  const hasFeature = (feature) => {
    try {
      // Default to 'starter' plan if we don't have plan data yet
      return checkFeature('starter', feature);
    } catch (error) {
      console.warn('Feature check failed:', error);
      return false;
    }
  };

  const getCurrentPlan = () => {
    // For now, return 'starter' - we can enhance this later
    return 'starter';
  };

  // ONLY EXTEND the existing value object - don't change anything else
  const value = { 
    user, 
    loading,
    session,
    getSession,
    role: user?.role,
    tenantId: user?.tenant_id,
    canAccessEnterprise,
    canAccessAdmin,
    refreshUser,
    
    // NEW: Add these minimal helpers
    hasPermission,
    hasFeature,
    currentPlan: getCurrentPlan(),
    permissions: user?.role ? getRolePermissions(user.role) : []
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