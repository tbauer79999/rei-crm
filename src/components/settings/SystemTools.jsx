import React, { useState, useEffect } from 'react';
import Button from '../ui/button';
import { Label } from '../ui/label';
import { Combobox } from '@headlessui/react';
import supabase from '../../lib/supabaseClient';


export default function SystemTools() {
  const [leads, setLeads] = useState([]);
  const [selectedLead, setSelectedLead] = useState(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const fetchLeads = async () => {
      const { data, error } = await supabase.from('leads').select('*');
      if (error) {
        console.error('Failed to load leads', error);
        return;
      }

      const formatted = data.map(p => ({
        id: p.id,
        name: p.owner_name || 'Unnamed Lead',
        address: p.property_address || '',
        phone: p.phone || ''
      }));
      setLeads(formatted);
    };

    fetchLeads();
  }, []);

  const filteredLeads = query === ''
    ? leads
    : leads.filter(lead => {
        const search = query.toLowerCase();
        return (
          lead.name.toLowerCase().includes(search) ||
          lead.address.toLowerCase().includes(search) ||
          lead.phone.toLowerCase().includes(search)
        );
      });

  const downloadCSV = (filename, rows) => {
    if (!rows || rows.length === 0) {
      alert('No data available to export.');
      return;
    }

    const headers = Object.keys(rows[0]);
    const csvContent = [headers.join(','), ...rows.map(row => headers.map(h => JSON.stringify(row[h] || '')).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
  };

  const exportMessages = async () => {
    try {
      const { data: messages, error: msgError } = await supabase.from('messages').select('*');
      const { data: leads, error: propError } = await supabase.from('leads').select('*');

      if (msgError || propError) throw msgError || propError;

      const leadMap = {};
      leads.forEach(p => {
        leadMap[p.id] = p.owner_name || p.property_address || 'Unknown';
      });

      const filtered = selectedLead
        ? messages.filter(msg => msg.property_id === selectedLead.id)
        : messages;

      if (!filtered || filtered.length === 0) {
        alert('No messages found for this lead.');
        return;
      }

      const rows = filtered.map(msg => ({
        Timestamp: msg.timestamp,
        Direction: msg.direction,
        Body: msg.message_body || '',
        LeadID: msg.property_id || '',
        LeadName: leadMap[msg.property_id] || ''
      }));

      downloadCSV('rei-crm-message-log.csv', rows);
    } catch (err) {
      console.error('Failed to export messages', err);
    }
  };

  const exportHotLeads = async () => {
    try {
      const { data, error } = await supabase.from('leads').select('*');
      if (error) throw error;

      const rows = data
        .filter(p => p.ai_status === 'HOT')
        .map(p => ({
          Name: p.owner_name,
          Phone: p.phone,
          Address: p.property_address,
          Campaign: p.campaign,
          Score: p.motivation_score,
          LastMessage: p.last_message_summary || '',
        }));

      if (!rows.length) {
        alert('No hot leads found.');
        return;
      }

      downloadCSV('rei-crm-hot-leads.csv', rows);
    } catch (err) {
      console.error('Failed to export hot leads', err);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Label>Message Logs (CSV)</Label>
        <div className="mt-2 mb-2">
          <Combobox value={selectedLead} onChange={setSelectedLead}>
            <div className="relative">
              <Combobox.Input
                className="w-full border border-gray-300 rounded px-3 py-2"
                onChange={(e) => setQuery(e.target.value)}
                displayValue={(lead) => lead?.name || ''}
                placeholder="Search by name, address, or phone"
              />
              {filteredLeads.length > 0 && (
                <Combobox.Options className="absolute z-10 bg-white border border-gray-300 rounded mt-1 w-full max-h-60 overflow-auto shadow-md">
                  {filteredLeads.map(lead => (
                    <Combobox.Option
                      key={lead.id}
                      value={lead}
                      className={({ active }) => `px-4 py-2 cursor-pointer ${active ? 'bg-blue-100' : ''}`}
                    >
                      <div>
                        <div className="font-medium">{lead.name}</div>
                        <div className="text-sm text-gray-500">{lead.address} | {lead.phone}</div>
                      </div>
                    </Combobox.Option>
                  ))}
                </Combobox.Options>
              )}
            </div>
          </Combobox>
        </div>
        <Button onClick={exportMessages}>Export Messages</Button>
      </div>

      <div>
        <Label>Hot Lead Escalation Log</Label>
        <div className="mt-2">
          <Button onClick={exportHotLeads}>Export Hot Leads</Button>
        </div>
      </div>
    </div>
  );
}
