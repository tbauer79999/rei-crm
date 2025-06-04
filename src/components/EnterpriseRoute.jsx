import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const EnterpriseRoute = ({ children }) => {
  const { user, loading, canAccessEnterprise, isGlobalAdmin, isEnterpriseAdmin } = useAuth();

  // DEBUG: Add temporary logging to see what's happening
  console.log('🔍 EnterpriseRoute Debug:');
  console.log('user:', user);
  console.log('user.role:', user?.role);
  console.log('canAccessEnterprise:', canAccessEnterprise);
  console.log('isGlobalAdmin:', isGlobalAdmin);
  console.log('isEnterpriseAdmin:', isEnterpriseAdmin);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user) {
    console.log('❌ No user - redirecting to login');
    return <Navigate to="/login" replace />;
  }

  // Use the computed property from AuthContext
 // if (!canAccessEnterprise) {
//console.log('❌ No enterprise access - redirecting to business analytics');
 //   console.log('User role:', user.role);
 //   console.log('Expected roles: global_admin or enterprise_admin');
 //   return <Navigate to="/business-analytics" replace />;
//  }

  console.log('✅ temp Enterprise access granted - rendering analytics');
  return children;
};

export default EnterpriseRoute;