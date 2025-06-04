// src/components/onboarding/Step3_OfficeHours.jsx
import { useState } from 'react';
import { Clock, Calendar, Shield } from 'lucide-react';
import supabase from '../../lib/supabaseClient';

const hourOptions = Array.from({ length: 24 }, (_, i) => i.toString());
const dayOptions = [
  { value: 'M–F', label: 'Monday - Friday' },
  { value: 'M–Sat', label: 'Monday - Saturday' },
  { value: 'Everyday', label: 'Every Day' }
];

export default function Step3_OfficeHours({ tenantId, formData, setFormData, onNext }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('=== Step3 Auth Debug ===');
      
      // Check session first
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log('Session:', session);
      console.log('Session error:', sessionError);
      
      // Get current user and their profile to ensure we use the correct tenant_id
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      console.log('User:', user);
      console.log('User error:', userError);
      
      if (userError || !user) {
        throw new Error('Authentication required - no user found');
      }

      // Get the user's tenant_id from their profile (this is what RLS checks against)
      console.log('Fetching profile for user:', user.id);
      const { data: profile, error: profileError } = await supabase
        .from('users_profile')
        .select('tenant_id, role')
        .eq('id', user.id)
        .single();

      console.log('Profile data:', profile);
      console.log('Profile error:', profileError);

      if (profileError || !profile) {
        throw new Error(`User profile not found: ${profileError?.message || 'No profile data'}`);
      }

      const updates = [
        { key: 'officeOpenHour', value: formData.openHour },
        { key: 'officeCloseHour', value: formData.closeHour },
        { key: 'officeDays', value: formData.days },
        { key: 'EscalateImmediately', value: 'true' },
        { key: 'QueuedResponseEnabled', value: 'true' }
      ];

      console.log('Inserting platform settings for tenant:', profile.tenant_id);
      console.log('User role:', profile.role);
      
      const { data: insertData, error } = await supabase.from('platform_settings')
        .upsert(updates.map(u => ({ ...u, tenant_id: profile.tenant_id })), { onConflict: ['tenant_id', 'key'] });

      console.log('Insert result:', insertData);
      
      if (error) {
        console.error('Platform settings error:', error);
        throw error;
      }

      console.log('Platform settings saved successfully');
      onNext();
    } catch (err) {
      console.error('Step3 error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-gradient-to-r from-pink-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <Clock size={32} className="text-white" />
        </div>
        <h2 className="text-3xl font-bold bg-gradient-to-r from-pink-600 to-red-600 bg-clip-text text-transparent">
          Set your availability
        </h2>
        <p className="text-gray-600 mt-2">When should your AI respond to leads?</p>
      </div>

      <div className="max-w-md mx-auto space-y-6">
        <div className="bg-gradient-to-r from-pink-50 to-red-50 p-6 rounded-xl border border-pink-200">
          <Calendar size={24} className="text-pink-500 mb-3" />
          <h3 className="font-semibold mb-4">Business Hours</h3>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">Opening Hour</label>
                <select
                  value={formData.openHour}
                  onChange={(e) => setFormData({...formData, openHour: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                >
                  {hourOptions.map(hour => (
                    <option key={hour} value={hour}>{hour}:00</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">Closing Hour</label>
                <select
                  value={formData.closeHour}
                  onChange={(e) => setFormData({...formData, closeHour: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                >
                  {hourOptions.map(hour => (
                    <option key={hour} value={hour}>{hour}:00</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Active Days</label>
              <select
                value={formData.days}
                onChange={(e) => setFormData({...formData, days: e.target.value})}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              >
                {dayOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <div className="flex items-start gap-2">
            <Shield size={20} className="text-yellow-600 mt-0.5" />
            <div>
              <div className="font-medium text-yellow-800">Smart Escalation</div>
              <div className="text-sm text-yellow-700">High-priority leads will always be escalated immediately, regardless of hours.</div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-red-500 text-sm">{error}</p>
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={loading}
          className={`
            px-8 py-3 rounded-xl font-medium transition-all flex items-center gap-2
            ${!loading
              ? 'bg-gradient-to-r from-pink-500 to-red-600 text-white hover:shadow-lg transform hover:scale-105'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'}
          `}
        >
          {loading ? 'Saving...' : 'Continue to Step 4'}
        </button>
      </div>
    </div>
  );
}