// src/components/OnboardingGuard.jsx
import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import supabase from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

export default function OnboardingGuard({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [checking, setChecking] = useState(true);
  const [shouldRedirect, setShouldRedirect] = useState(false);

  useEffect(() => {
    const checkTenantStatus = async () => {
      if (!user) return setChecking(false);

      const { data: profile, error } = await supabase
        .from('users_profile')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (error || !profile) {
        console.warn('No tenant found for user');
        return setChecking(false);
      }

      if (profile.tenant_id) {
        const { data: tenant } = await supabase
          .from('tenants')
          .select('onboarding_complete')
          .eq('id', profile.tenant_id)
          .single();

        if (!tenant?.onboarding_complete && location.pathname !== '/onboarding') {
          setShouldRedirect(true);
        }
      } else {
        // No tenant_id yet, needs onboarding
        if (location.pathname !== '/onboarding') {
          setShouldRedirect(true);
        }
      }

      setChecking(false);
    };

    if (!loading) {
      checkTenantStatus();
    }
  }, [user, loading, location.pathname]);

  if (loading || checking) return <div className="p-8">Loading session...</div>;
  if (shouldRedirect) return <Navigate to="/onboarding" replace />;

  return children;
}
