// src/components/onboarding/Step7_SuccessDemo.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Users, MessageCircle, BarChart3 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import supabase from '../../lib/supabaseClient';

export default function Step7_SuccessDemo({ tenantId, formData, setFormData }) {
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  const handleFinish = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('Authentication required');

      const { data: profile, error: profileError } = await supabase
        .from('users_profile')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) throw new Error('User profile not found');

      const actualTenantId = profile.tenant_id;

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

        await supabase.from('leads').insert(demoLeads);
        await supabase.from('smstemplates').insert(demoTemplates);
      }

      await supabase
        .from('tenants')
        .update({ onboarding_complete: true })
        .eq('id', actualTenantId);

      localStorage.removeItem('onboarding_step');
      localStorage.removeItem('onboarding_tenant_id');
      
      // Set flag to show product tour after onboarding
      localStorage.setItem('show_product_tour', 'true');

      await refreshUser();
      setCompleted(true);

      setTimeout(() => {
        navigate('/dashboard');
      }, 2500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (completed) {
      const timer = setTimeout(() => navigate('/dashboard'), 2500);
      return () => clearTimeout(timer);
    }
  }, [completed, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-xl w-full space-y-10 text-center">
        <div className="relative">
          <div className="w-24 h-24 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} className="text-white" />
          </div>
          <div className="absolute inset-0 w-24 h-24 mx-auto bg-gradient-to-r from-green-400 to-emerald-500 rounded-full animate-ping opacity-20" />
        </div>

        <div>
          <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-600">
            🎉 Welcome to SurFox!
          </h2>
          <p className="mt-2 text-lg text-gray-600">
            Your AI-powered control room is now ready to launch.
          </p>
        </div>

        <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-2xl border border-green-200">
          <div className="flex items-center justify-between">
            <span className="text-gray-800 font-medium">Load demo data</span>
            <div
              onClick={() => setFormData({ ...formData, loadDemo: !formData.loadDemo })}
              className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors duration-200 ${
                formData.loadDemo ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all duration-200 ${
                  formData.loadDemo ? 'left-6' : 'left-0.5'
                }`}
              />
            </div>
          </div>
          <p className="text-sm text-gray-600 mt-1">Load sample leads and templates to explore features.</p>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Users size={20} className="text-blue-500" />
            </div>
            <div className="text-sm font-medium text-gray-700">Lead Management</div>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <MessageCircle size={20} className="text-purple-500" />
            </div>
            <div className="text-sm font-medium text-gray-700">AI Messaging</div>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <BarChart3 size={20} className="text-green-500" />
            </div>
            <div className="text-sm font-medium text-gray-700">Analytics</div>
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
              className={`px-8 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
                !loading
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:shadow-lg transform hover:scale-105'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {loading ? 'Finishing...' : 'Enter Dashboard'}
            </button>
          </div>
        ) : (
          <p className="text-green-600 font-semibold">You're all set. Redirecting to SurFox...</p>
        )}
      </div>
    </div>
  );
}