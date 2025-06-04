import React, { useEffect, useState } from 'react';
import supabase from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { formatDistanceToNow } from 'date-fns';
import { TimerReset } from 'lucide-react';

export default function ColdFollowupQueueCard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(0);
  const [leads, setLeads] = useState([]);

  useEffect(() => {
    const fetchQueue = async () => {
      try {
        const { data: profile, error: profileError } = await supabase
          .from('users_profile')
          .select('tenant_id')
          .eq('id', user?.id)
          .single();

        if (profileError) throw profileError;

        const { data, error } = await supabase
          .from('leads')
          .select('*')
          .eq('status', 'cold')
          .lte('next_followup_at', new Date().toISOString())
          .eq('tenant_id', profile.tenant_id)
          .order('next_followup_at', { ascending: true })
          .limit(3);

        if (error) throw error;

        setLeads(data || []);
        setCount(data.length);
      } catch (err) {
        console.error('Error fetching cold follow-up leads:', err.message);
      } finally {
        setLoading(false);
      }
    };

    if (user?.id) fetchQueue();
  }, [user]);

  return (
  <Card className="shadow-md group">
    <CardContent className="p-4">
      <div>
        <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
          <TimerReset size={18} className="group-hover:text-blue-600 transition" />
          Cold Follow-Up Queue
        </h2>
        <hr className="my-2 border-gray-200" />

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : leads.length > 0 ? (
          <ul className="text-sm space-y-2 text-gray-700">
            {leads.map((lead) => (
              <li key={lead.id} className="flex justify-between">
                <span>{lead.full_name || 'Unnamed Lead'}</span>
                <span className="text-muted-foreground">
                  {formatDistanceToNow(new Date(lead.next_followup_at), { addSuffix: true })}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <>
            <p className="text-sm text-gray-700 mb-1">{count} leads due for follow-up</p>
            <p className="text-sm text-muted-foreground">No cold leads are due yet.</p>
          </>
        )}
      </div>
    </CardContent>
  </Card>
);

}
