import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

export default function LeadDetail() {
  const { id } = useParams();
  const [lead, setLead] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeadAndMessages = async () => {
      try {
        // Fetch the lead record by ID
        const { data: leadData, error: leadError } = await supabase
          .from('properties')
          .select('*')
          .eq('id', id)
          .single();

        if (leadError) throw leadError;
        setLead(leadData);

        // Fetch all related messages
        const { data: msgData, error: msgError } = await supabase
          .from('messages')
          .select('*')
          .eq('property_id', id)
          .order('timestamp', { ascending: true });

        if (msgError) throw msgError;
        setMessages(msgData);
      } catch (err) {
        console.error('Error loading lead or messages:', err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchLeadAndMessages();
  }, [id]);

  if (loading) {
    return <div className="p-6 text-gray-600">Loading lead details...</div>;
  }

  if (!lead) {
    return <div className="p-6 text-red-600">Lead not found.</div>;
  }

  const formatDate = (ts) => new Date(ts).toLocaleString();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-4 sm:p-6">
      <Link to="/dashboard" className="text-sm text-blue-600 hover:underline mb-3 inline-block">
        ← Back to Dashboard
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm text-sm">
          <h2 className="text-base font-semibold text-slate-800 mb-3">Property Info</h2>
          <p><strong>Address:</strong> {lead.property_address || '—'}</p>
          <p><strong>City:</strong> {lead.city || '—'}</p>
          <p><strong>State:</strong> {lead.state || '—'}</p>
          <p><strong>Zip Code:</strong> {lead.zip_code || '—'}</p>
          <p><strong>Bedrooms:</strong> {lead.bedrooms || '—'}</p>
          <p><strong>Bathrooms:</strong> {lead.bathrooms || '—'}</p>
          <p><strong>Square Footage:</strong> {lead.square_footage || '—'}</p>
          <div className="mt-2 space-x-4">
            {lead.property_address && (
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(lead.property_address)}`}
                className="text-blue-600 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Google Maps
              </a>
            )}
            {lead.property_address && (
              <a
                href={`https://www.zillow.com/homes/${encodeURIComponent(lead.property_address)}`}
                className="text-blue-600 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Zillow
              </a>
            )}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm text-sm">
          <h2 className="text-base font-semibold text-slate-800 mb-3">Owner Info</h2>
          <p><strong>Name:</strong> {lead.owner_name || '—'}</p>
          <p><strong>Phone:</strong> {lead.phone || '—'}</p>
          <p><strong>Email:</strong> {lead.email || '—'}</p>
          <p><strong>Campaign:</strong> {lead.campaign || '—'}</p>
          <p><strong>Status:</strong> {lead.status || '—'}</p>
          <p><strong>Notes:</strong> {lead.notes || '—'}</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
        <h2 className="text-base font-semibold text-slate-800 mb-3">Message History</h2>
        {messages.length === 0 ? (
          <p className="text-sm text-gray-500">No messages available.</p>
        ) : (
          <div className="space-y-2 text-sm">
            {messages.map((msg) => {
              const isInbound = msg.direction?.toLowerCase() === 'inbound';
              return (
                <div
                  key={msg.id}
                  className={`max-w-xl px-3 py-1.5 rounded-md ${
                    isInbound
                      ? 'bg-slate-100 text-gray-800 self-start'
                      : 'bg-indigo-100 text-gray-900 self-end ml-auto'
                  }`}
                >
                  <p>{msg.message_body || '—'}</p>
                  <p className="text-xs text-gray-500 mt-1">{formatDate(msg.timestamp)}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
