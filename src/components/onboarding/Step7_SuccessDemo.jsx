// src/components/onboarding/Step6_SuccessDemo.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Users, MessageCircle, BarChart3 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import supabase from '../../lib/supabaseClient';

export default function Step6_SuccessDemo({ tenantId, formData, setFormData }) {
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  const handleFinish = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get user profile to use correct tenant_id
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('Authentication required');
      }

      const { data: profile, error: profileError } = await supabase
        .from('users_profile')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        throw new Error('User profile not found');
      }

      const actualTenantId = profile.tenant_id;

      // Create demo data if requested
      if (formData.loadDemo) {
        const demoLeads = [
          {
            tenant_id: actualTenantId,
            name: 'Jane Smith',
            phone: '555-1234',
            email: 'jane@example.com',
            status: 'Cold',
            campaign: 'SMS Campaign A',
          },
          {
            tenant_id: actualTenantId,
            name: 'Mike Johnson',
            phone: '555-5678',
            email: 'mike@example.com',
            status: 'Hot',
            campaign: 'Referral Program',
          }
        ];

        const demoTemplates = [
          {
            tenant_id: actualTenantId,
            message: 'Hi {{name}}, just checking in to see if you are still interested!',
          },
          {
            tenant_id: actualTenantId,
            message: 'Quick follow-up - want to chat this week?',
          }
        ];

        console.log('Creating demo leads for tenant:', actualTenantId);
        const { error: leadError } = await supabase.from('leads').insert(demoLeads);
        if (leadError) {
          console.warn('Demo leads creation failed:', leadError);
          // Don't throw - continue with onboarding completion
        }

        console.log('Creating demo templates for tenant:', actualTenantId);
        const { error: templateError } = await supabase.from('smstemplates').insert(demoTemplates);
        if (templateError) {
          console.warn('Demo templates creation failed:', templateError);
          // Don't throw - continue with onboarding completion
        }
      }

      // ALWAYS mark onboarding as complete (regardless of demo choice)
      console.log('Updating tenant onboarding_complete for tenantId:', actualTenantId);
      const { data: updateResult, error: updateError } = await supabase
        .from('tenants')
        .update({ onboarding_complete: true })
        .eq('id', actualTenantId);

      if (updateError) {
        console.error('Error updating tenant:', updateError);
        throw updateError;
      }

      console.log('Tenant update successful:', updateResult);
      setCompleted(true);

      // Clear onboarding localStorage
      localStorage.removeItem('onboarding_step');
      localStorage.removeItem('onboarding_tenant_id');

      // Refresh the auth context to pick up the updated tenant data
      console.log('Refreshing user data...');
      await refreshUser();

      // Add a small delay to ensure auth context has updated
      setTimeout(() => {
        console.log('Redirecting to dashboard...');
        navigate('/dashboard');
      }, 2000);
    } catch (err) {
      console.error('Step6 error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 text-center">
      <div className="relative">
        <div className="w-24 h-24 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={40} className="text-white" />
        </div>
        <div className="absolute inset-0 w-24 h-24 mx-auto bg-gradient-to-r from-green-400 to-emerald-500 rounded-full animate-ping opacity-20" />
      </div>

      <div>
        <h2 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-4">
          🎉 Welcome to your CRM!
        </h2>
        <p className="text-xl text-gray-600 mb-8">Your workspace is configured and ready to go</p>
      </div>

      <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-8 rounded-2xl border border-green-200 max-w-md mx-auto">
        <div className="flex items-center justify-between mb-4">
          <span className="font-medium">Load demo data</span>
          <div
            onClick={() => setFormData({...formData, loadDemo: !formData.loadDemo})}
            className={`
              w-12 h-6 rounded-full transition-all duration-200 relative cursor-pointer
              ${formData.loadDemo ? 'bg-green-500' : 'bg-gray-300'}
            `}
          >
            <div className={`
              w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all duration-200
              ${formData.loadDemo ? 'left-6' : 'left-0.5'}
            `} />
          </div>
        </div>
        <p className="text-sm text-gray-600">Include sample leads and templates to explore features</p>
      </div>

      <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
        <div className="text-center">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
            <Users size={20} className="text-blue-500" />
          </div>
          <div className="text-sm font-medium">Lead Management</div>
        </div>
        <div className="text-center">
          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
            <MessageCircle size={20} className="text-purple-500" />
          </div>
          <div className="text-sm font-medium">AI Messaging</div>
        </div>
        <div className="text-center">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
            <BarChart3 size={20} className="text-green-500" />
          </div>
          <div className="text-sm font-medium">Analytics</div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-red-500 text-sm">{error}</p>
        </div>
      )}

      {!completed ? (
        <div className="flex justify-center">
          <button
            onClick={handleFinish}
            disabled={loading}
            className={`
              px-8 py-3 rounded-xl font-medium transition-all flex items-center gap-2
              ${!loading
                ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:shadow-lg transform hover:scale-105'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'}
            `}
          >
            {loading ? 'Finishing...' : 'Enter Dashboard'}
          </button>
        </div>
      ) : (
        <p className="text-green-600 font-semibold">You're all set. Redirecting...</p>
      )}
    </div>
  );
}