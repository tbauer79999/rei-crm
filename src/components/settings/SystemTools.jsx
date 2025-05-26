import React, { useState, useEffect, useRef } from 'react';
import Button from '../ui/button';
import { Label } from '../ui/label';
import { Combobox } from '@headlessui/react';
import supabase from '../../lib/supabaseClient';

export default function SystemTools() {
  /* ───────────────────────── STATE ───────────────────────── */
  const [leads, setLeads] = useState([]);
  const [selectedLead, setSelectedLead] = useState(null);
  const [query, setQuery] = useState('');

  const [exportingMessages, setExportingMessages] = useState(false);
  const [exportingHot, setExportingHot] = useState(false);
  const [exportingSettings, setExportingSettings] = useState(false);
  const [importingSettings, setImportingSettings] = useState(false);

  const fileInputRef = useRef(null);

  /* ───────────────────────── LOAD LEADS ───────────────────────── */
  useEffect(() => {
    const fetchLeads = async () => {
      const { data, error } = await supabase.from('leads').select('*');
      if (error) {
        console.error('Failed to load leads', error);
        return;
      }

      const formatted = data.map((p) => ({
        id: p.id,
        name: p.owner_name || 'Unnamed Lead',
        address: p.property_address || '',
        phone: p.phone || '',
      }));
      setLeads(formatted);
    };

    fetchLeads();
  }, []);

  const filteredLeads =
    query === ''
      ? leads
      : leads.filter((lead) => {
          const search = query.toLowerCase();
          return (
            lead.name.toLowerCase().includes(search) ||
            lead.address.toLowerCase().includes(search) ||
            lead.phone.toLowerCase().includes(search)
          );
        });

  /* ───────────────────────── HELPERS ───────────────────────── */
  const downloadCSV = (filename, rows) => {
    const headers = Object.keys(rows[0]);
    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        headers.map((h) => JSON.stringify(row[h] || '')).join(',')
      ),
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
  };

  const downloadJSON = (filename, data) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
  };

  /* ───────────────────────── EXPORTS ───────────────────────── */
  const exportMessages = async () => {
    setExportingMessages(true);
    try {
      const { data: messages, error: msgError } = await supabase
        .from('messages')
        .select('*');
      const { data: leadsData, error: leadError } = await supabase
        .from('leads')
        .select('*');

      if (msgError || leadError) throw msgError || leadError;

      const leadMap = {};
      leadsData.forEach((p) => {
        leadMap[p.id] = p.owner_name || p.property_address || 'Unknown';
      });

      const filtered = selectedLead
        ? messages.filter((msg) => msg.property_id === selectedLead.id)
        : messages;

      if (!filtered.length) {
        alert('No messages found for export.');
        return;
      }

      const rows = filtered.map((msg) => ({
        Timestamp: msg.timestamp,
        Direction: msg.direction,
        Body: msg.message_body || '',
        LeadID: msg.property_id || '',
        LeadName: leadMap[msg.property_id] || '',
      }));

      downloadCSV('rei-crm-message-log.csv', rows);
    } catch (err) {
      console.error('Failed to export messages', err);
      alert('Export failed. Check console for details.');
    } finally {
      setExportingMessages(false);
    }
  };

  const exportHotLeads = async () => {
    setExportingHot(true);
    try {
      const { data, error } = await supabase.from('leads').select('*');
      if (error) throw error;

      const rows = data
        .filter((p) => p.ai_status === 'HOT')
        .map((p) => ({
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
      alert('Export failed. Check console for details.');
    } finally {
      setExportingHot(false);
    }
  };

  const exportSettings = async () => {
    setExportingSettings(true);
    try {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('*');
      if (error) throw error;

      if (!data.length) {
        alert('No settings found to export.');
        return;
      }

      downloadJSON('rei-crm-settings.json', data);
    } catch (err) {
      console.error('Failed to export settings', err);
      alert('Export failed. Check console for details.');
    } finally {
      setExportingSettings(false);
    }
  };

  /* ───────────────────────── IMPORT SETTINGS ───────────────────────── */
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportingSettings(true);
    try {
      const text = await file.text();
      const json = JSON.parse(text);

      if (!Array.isArray(json)) {
        alert('Invalid file format.');
        return;
      }

      const upserts = json.map((row) => ({
        key: row.key,
        value: row.value,
      }));

      const { error } = await supabase
        .from('platform_settings')
        .upsert(upserts, { onConflict: 'key' });

      if (error) throw error;

      alert('Settings imported successfully.');
    } catch (err) {
      console.error('Failed to import settings', err);
      alert('Import failed. Check console for details.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
      setImportingSettings(false);
    }
  };

  /* ───────────────────────── RENDER ───────────────────────── */
  return (
    <div className="space-y-8">
      {/* ───────── Message Logs ───────── */}
      <section>
        <Label className="font-semibold">Message Logs (CSV)</Label>
        <div className="mt-2 mb-3">
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
                  {filteredLeads.map((lead) => (
                    <Combobox.Option
                      key={lead.id}
                      value={lead}
                      className={({ active }) =>
                        `px-4 py-2 cursor-pointer ${
                          active ? 'bg-blue-100' : ''
                        }`
                      }
                    >
                      <div>
                        <div className="font-medium">{lead.name}</div>
                        <div className="text-sm text-gray-500">
                          {lead.address} | {lead.phone}
                        </div>
                      </div>
                    </Combobox.Option>
                  ))}
                </Combobox.Options>
              )}
            </div>
          </Combobox>
        </div>
        <Button onClick={exportMessages} disabled={exportingMessages}>
          {exportingMessages ? 'Exporting...' : 'Export Messages'}
        </Button>
      </section>

      {/* ───────── Hot Lead Log ───────── */}
      <section>
        <Label className="font-semibold">Hot Lead Escalation Log</Label>
        <div className="mt-3">
          <Button onClick={exportHotLeads} disabled={exportingHot}>
            {exportingHot ? 'Exporting...' : 'Export Hot Leads'}
          </Button>
        </div>
      </section>

      {/* ───────── Settings Snapshot ───────── */}
      <section>
        <Label className="font-semibold">Settings Snapshot</Label>
        <div className="flex items-center gap-4 mt-3 flex-wrap">
          <Button onClick={exportSettings} disabled={exportingSettings}>
            {exportingSettings ? 'Exporting...' : 'Download Settings'}
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
            disabled={importingSettings}
          >
            {importingSettings ? 'Importing...' : 'Restore Settings'}
          </Button>
        </div>
      </section>
    </div>
  );
}
