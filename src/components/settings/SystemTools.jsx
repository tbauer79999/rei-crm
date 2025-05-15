import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Button from '../ui/button';
import { Label } from '../ui/label';
import { Combobox } from '@headlessui/react';

export default function SystemTools() {
  const [uploading, setUploading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [leads, setLeads] = useState([]);
  const [selectedLead, setSelectedLead] = useState(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    axios.get('/api/properties').then(res => {
      const formatted = res.data.map(p => ({
        id: p.id,
        name: p.fields['Owner Name'] || 'Unnamed Lead',
        address: p.fields['Property Address'] || '',
        phone: p.fields['Phone'] || ''
      }));
      setLeads(formatted);
    }).catch(err => {
      console.error('Failed to load leads', err);
    });
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

  const exportSettings = async () => {
    setExporting(true);
    try {
      const res = await axios.get('/api/settings');
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'rei-crm-settings-backup.json';
      link.click();
    } catch (err) {
      console.error('Failed to export settings', err);
    } finally {
      setExporting(false);
    }
  };

  const importSettings = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      await axios.put('/api/settings', json);
      alert('Settings imported successfully.');
    } catch (err) {
      console.error('Failed to import settings', err);
      alert('Import failed. Check console for details.');
    } finally {
      setUploading(false);
    }
  };

  const downloadCSV = (filename, rows) => {
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
      const [messagesRes, propertiesRes] = await Promise.all([
        axios.get('/api/messages'),
        axios.get('/api/properties')
      ]);

      const leadMap = {};
      propertiesRes.data.forEach(p => {
        leadMap[p.id] = p.fields['Owner Name'] || p.fields['Property Address'] || 'Unknown';
      });

      const messages = messagesRes.data.filter(msg =>
        !selectedLead || msg.fields['Property ID'] === selectedLead.id
      );

      const rows = messages.map(msg => ({
        Timestamp: msg.fields.Timestamp,
        Direction: msg.fields.Direction,
        Body: msg.fields['Message Body'] || '',
        LeadID: msg.fields['Property ID'] || '',
        LeadName: leadMap[msg.fields['Property ID']] || ''
      }));

      downloadCSV('rei-crm-message-log.csv', rows);
    } catch (err) {
      console.error('Failed to export messages', err);
    }
  };

  const exportHotLeads = async () => {
    try {
      const res = await axios.get('/api/properties');
      const rows = res.data.filter(p => p.fields['AI Status'] === 'HOT').map(p => ({
        Name: p.fields['Owner Name'],
        Phone: p.fields.Phone,
        Address: p.fields['Property Address'],
        Campaign: p.fields.Campaign,
        Score: p.fields['Motivation Score'],
        LastMessage: p.fields['Last Message Summary'] || '',
      }));
      downloadCSV('rei-crm-hot-leads.csv', rows);
    } catch (err) {
      console.error('Failed to export hot leads', err);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Label>Settings Snapshot</Label>
        <div className="flex items-center gap-4 mt-2">
          <Button onClick={exportSettings} disabled={exporting}>
            {exporting ? 'Exporting...' : 'Export Settings'}
          </Button>
        </div>
        <Label className="mt-4 block">Import Settings (JSON)</Label>
        <input type="file" accept=".json" onChange={importSettings} disabled={uploading} />
      </div>

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