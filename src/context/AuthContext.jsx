import React, { createContext, useContext, useEffect, useState } from 'react';
import supabase from '../lib/supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Function to fetch user profile and tenant data
  const fetchUserProfile = async (sessionUser) => {
    try {
      console.log('🔍 Fetching profile for user ID:', sessionUser.id);
      console.log('📧 Session user email:', sessionUser.email);
      
      // ✅ FIX: Store the auth token for API calls
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        console.log('🔑 Storing auth token for API calls');
        localStorage.setItem('auth_token', session.access_token);
        sessionStorage.setItem('auth_token', session.access_token);
      }
      
      // First, check if any rows exist for this user
      const { data: allRows, error: countError } = await supabase
        .from('users_profile')
        .select('id, tenant_id, role')
        .eq('id', sessionUser.id);
      
      console.log('📊 All matching profile rows:', allRows);
      console.log('❌ Count error:', countError);
      
      // Then try to get the single row
      const { data: profileData, error: profileError } = await supabase
        .from('users_profile')
        .select('tenant_id, role')
        .eq('id', sessionUser.id)
        .single();

      console.log('👤 Profile data:', profileData);
      console.log('❌ Profile error:', profileError);

      if (profileError || !profileData) {
        console.error('❌ Error fetching user profile:', profileError?.message);
        
        // ✅ FIX: Set user with default role instead of just session user
        const fallbackUserData = {
          ...sessionUser,
          role: 'user', // Default role
          tenant_id: null,
          tenant: null,
          onboarding_complete: false
        };
        
        console.log('🔄 Using fallback user data:', fallbackUserData);
        setUser(fallbackUserData);
        setLoading(false);
        return;
      }

      let tenantData = null;
      
      // If user has a tenant_id, fetch tenant data
      if (profileData.tenant_id) {
        console.log('🏢 Fetching tenant data for tenant_id:', profileData.tenant_id);
        const { data: tenantInfo, error: tenantError } = await supabase
          .from('tenants')
          .select('onboarding_complete, name')
          .eq('id', profileData.tenant_id)
          .single();

        if (tenantError) {
          console.error('❌ Error fetching tenant data:', tenantError.message);
        } else {
          console.log('🏢 Fetched tenant data:', tenantInfo);
          tenantData = tenantInfo;
        }
      }

      // Combine all user data
      const userData = {
        ...sessionUser,
        ...profileData,
        tenant: tenantData,
        onboarding_complete: tenantData?.onboarding_complete || false
      };

      console.log('✅ Final user data with role:', userData);
      console.log('🔑 User role:', userData.role);
      
      setUser(userData);
    } catch (error) {
      console.error('💥 Unexpected error fetching profile:', error);
      
      // ✅ FIX: Better fallback handling
      const fallbackUserData = {
        ...sessionUser,
        role: 'user', // Default role
        tenant_id: null,
        tenant: null,
        onboarding_complete: false
      };
      
      console.log('🔄 Using fallback user data after error:', fallbackUserData);
      setUser(fallbackUserData);
    } finally {
      setLoading(false);
    }
  };

  // Refresh user function that can be called externally
  const refreshUser = async () => {
    if (user?.id) {
      setLoading(true);
      await fetchUserProfile(user);
    }
  };

  useEffect(() => {
    // Initial session check
    const initializeSession = async () => {
      console.log('🚀 Initializing session...');
      
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('❌ Error retrieving session:', error.message);
        setUser(null);
        setLoading(false);
      } else if (session?.user) {
        console.log('✅ Session found, fetching profile...');
        await fetchUserProfile(session.user);
      } else {
        console.log('❌ No session found');
        setUser(null);
        setLoading(false);
      }
    };

    initializeSession();

    // Auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth state changed:', event);
      
      // ✅ FIX: Handle token storage on auth state changes
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.access_token) {
          console.log('🔑 Storing/updating auth token');
          localStorage.setItem('auth_token', session.access_token);
          sessionStorage.setItem('auth_token', session.access_token);
        }
      } else if (event === 'SIGNED_OUT') {
        console.log('🗑️ Clearing auth tokens');
        localStorage.removeItem('auth_token');
        sessionStorage.removeItem('auth_token');
      }
      
      setTimeout(() => {
        if (session?.user) {
          console.log('✅ New session, fetching profile...');
          fetchUserProfile(session.user);
        } else {
          console.log('❌ Session ended');
          setUser(null);
          setLoading(false);
        }
      }, 0);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // ✅ FIXED: Compute permissions properly without infinite re-renders
  const canAccessEnterprise = ['global_admin', 'enterprise_admin'].includes(user?.role);
  
  // ✅ ENHANCED: Better role-based computed properties (FIXED)
  const authValue = {
    user,
    loading,
    refreshUser,
    
    // Role-based computed properties
    role: user?.role || null,
    tenantId: user?.tenant_id || null,
    
    // ✅ FIX: More explicit role checks
    isGlobalAdmin: user?.role === 'global_admin',
    isEnterpriseAdmin: user?.role === 'enterprise_admin', 
    isBusinessAdmin: user?.role === 'business_admin',
    
    // ✅ FIXED: No more infinite re-renders
    canAccessEnterprise,
    
    canAccessAllTenants: user?.role === 'global_admin',
    
    // Onboarding status
    onboardingComplete: user?.onboarding_complete || false,
    tenant: user?.tenant || null
  };

  // ✅ REMOVED: Debug logging that was causing performance issues
  // Only log when user data actually changes
  useEffect(() => {
    if (user) {
      console.log('🔐 User auth state updated:', {
        userRole: user.role,
        canAccessEnterprise,
        isGlobalAdmin: user.role === 'global_admin',
        isEnterpriseAdmin: user.role === 'enterprise_admin'
      });
    }
  }, [user?.role, canAccessEnterprise]);

  return (
    <AuthContext.Provider value={authValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};