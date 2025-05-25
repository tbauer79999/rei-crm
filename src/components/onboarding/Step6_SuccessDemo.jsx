import { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // ✅ NEW
import supabase from '../../lib/supabaseClient';
import Button from '../ui/button';
import Checkbox from '../ui/checkbox';

export default function Step6_SuccessDemo({ tenantId }) {
  const [loadDemo, setLoadDemo] = useState(true);
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate(); // ✅ NEW

  const handleFinish = async () => {
    setLoading(true);
    setError(null);

    try {
      if (loadDemo) {
        const demoLeads = [
  {
    tenant_id: tenantId,
    name: 'Jane Smith',
    phone: '555-1234',
    email: 'jane@example.com',
    status: 'Cold',
    campaign: 'SMS Campaign A',
  },
  {
    tenant_id: tenantId,
    name: 'Mike Johnson',
    phone: '555-5678',
    email: 'mike@example.com',
    status: 'Hot',
    campaign: 'Referral Program',
  }
];


        const demoTemplates = [
          {
            tenant_id: tenantId,
            message: 'Hi {{name}}, just checking in to see if you’re still interested!',
          },
          {
            tenant_id: tenantId,
            message: 'Quick follow-up — want to chat this week?',
          }
        ];

        const { error: leadError } = await supabase.from('leads').insert(demoLeads);
        if (leadError) throw leadError;

        const { error: templateError } = await supabase.from('smstemplates').insert(demoTemplates);
        if (templateError) throw templateError;
      }

      setCompleted(true);
await supabase
  .from('tenants')
  .update({ onboarding_complete: true })
  .eq('id', tenantId);

      // ✅ Redirect after short delay
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-xl mx-auto space-y-6 text-center">
      <h1 className="text-2xl font-semibold">🎉 Setup Complete!</h1>
      <p className="text-sm text-gray-500">
        Your tenant workspace is now configured. You can begin uploading leads, messaging with AI, and customizing your experience further.
      </p>

      <div className="flex items-center justify-center gap-2">
        <Checkbox checked={loadDemo} onCheckedChange={() => setLoadDemo(!loadDemo)} />
        <span className="text-sm">Load demo leads and templates</span>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      {!completed ? (
        <Button onClick={handleFinish} disabled={loading}>
          {loading ? 'Finishing...' : 'Enter Dashboard'}
        </Button>
      ) : (
        <p className="text-green-600 font-semibold">You're all set. Redirecting...</p>
      )}
    </div>
  );
}
