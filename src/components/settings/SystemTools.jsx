import React, { useState, useEffect, useRef } from 'react';
import Button from '../ui/button';
import { Label } from '../ui/label';
import { Combobox } from '@headlessui/react';
import supabase from '../../lib/supabaseClient';
import { 
  Download, 
  Upload, 
  FileText, 
  Database, 
  Search,
  TrendingUp,
  Settings,
  CheckCircle,
  AlertCircle,
  MessageSquare,
  Users
} from 'lucide-react';

export default function SystemTools() {
  const [leads, setLeads] = useState([]);
  const [selectedLead, setSelectedLead] = useState(null);
  const [query, setQuery] = useState('');

  const [exportingMessages, setExportingMessages] = useState(false);
  const [exportingHot, setExportingHot] = useState(false);
  const [exportingSettings, setExportingSettings] = useState(false);
  const [importingSettings, setImportingSettings] = useState(false);

  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchLeads = async () => {
      const { data, error } = await supabase.from('leads').select('*');
      if (error) {
        console.error('Failed to load leads', error);
        setError('Failed to load leads for export options');
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

  const showSuccess = (message) => {
    setSuccess(message);
    setTimeout(() => setSuccess(''), 3000);
  };

  const showError = (message) => {
    setError(message);
    setTimeout(() => setError(''), 5000);
  };

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
    URL.revokeObjectURL(url);
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
    URL.revokeObjectURL(url);
  };

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
        showError('No messages found for export.');
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
      showSuccess(`Exported ${rows.length} messages successfully!`);
    } catch (err) {
      console.error('Failed to export messages', err);
      showError('Export failed. Please try again.');
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
        showError('No hot leads found to export.');
        return;
      }

      downloadCSV('rei-crm-hot-leads.csv', rows);
      showSuccess(`Exported ${rows.length} hot leads successfully!`);
    } catch (err) {
      console.error('Failed to export hot leads', err);
      showError('Export failed. Please try again.');
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
        showError('No settings found to export.');
        return;
      }

      downloadJSON('rei-crm-settings.json', data);
      showSuccess(`Exported ${data.length} settings successfully!`);
    } catch (err) {
      console.error('Failed to export settings', err);
      showError('Export failed. Please try again.');
    } finally {
      setExportingSettings(false);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportingSettings(true);
    try {
      const text = await file.text();
      const json = JSON.parse(text);

      if (!Array.isArray(json)) {
        showError('Invalid file format. Please upload a valid JSON file.');
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

      showSuccess(`Imported ${upserts.length} settings successfully!`);
    } catch (err) {
      console.error('Failed to import settings', err);
      showError('Import failed. Please check your file format.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
      setImportingSettings(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Success/Error Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center space-x-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <span className="text-red-800">{error}</span>
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center space-x-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          <span className="text-green-800 font-medium">{success}</span>
        </div>
      )}

      {/* Message Export */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Message Export</h3>
            <p className="text-gray-600 text-sm">Export conversation logs for analysis or compliance</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label className="flex items-center space-x-2 mb-2">
              <Search className="w-4 h-4 text-gray-500" />
              <span>Filter by Lead (Optional)</span>
            </Label>
            <Combobox value={selectedLead} onChange={setSelectedLead}>
              <div className="relative">
                <Combobox.Input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  onChange={(e) => setQuery(e.target.value)}
                  displayValue={(lead) => lead?.name || ''}
                  placeholder="Search by name, address, or phone (leave empty for all messages)"
                />
                {filteredLeads.length > 0 && query && (
                  <Combobox.Options className="absolute z-10 bg-white border border-gray-300 rounded-lg mt-1 w-full max-h-60 overflow-auto shadow-lg">
                    {filteredLeads.map((lead) => (
                      <Combobox.Option
                        key={lead.id}
                        value={lead}
                        className={({ active }) =>
                          `px-4 py-3 cursor-pointer ${
                            active ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
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
            {selectedLead && (
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-blue-800">
                    <strong>Selected:</strong> {selectedLead.name}
                  </span>
                  <button
                    onClick={() => {
                      setSelectedLead(null);
                      setQuery('');
                    }}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button onClick={exportMessages} disabled={exportingMessages}>
              {exportingMessages ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Exporting...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Download className="w-4 h-4" />
                  <span>Export Messages</span>
                </div>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Hot Leads Export */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Hot Lead Export</h3>
            <p className="text-gray-600 text-sm">Download your escalated leads for sales team follow-up</p>
          </div>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
          <div className="flex items-start space-x-2">
            <TrendingUp className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-orange-800">
              <strong>Hot leads</strong> are prospects that scored high on engagement and 
              have been flagged for immediate sales team attention.
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={exportHotLeads} disabled={exportingHot}>
            {exportingHot ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Exporting...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Download className="w-4 h-4" />
                <span>Export Hot Leads</span>
              </div>
            )}
          </Button>
        </div>
      </div>

      {/* Settings Backup & Restore */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
            <Settings className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Settings Backup & Restore</h3>
            <p className="text-gray-600 text-sm">Save your current configuration or restore from a backup</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Backup Settings */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-3">
              <Database className="w-5 h-5 text-gray-600" />
              <span className="font-medium text-gray-900">Backup Current Settings</span>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Download a JSON file with all your current platform settings for safekeeping.
            </p>
            <Button onClick={exportSettings} disabled={exportingSettings} className="w-full">
              {exportingSettings ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Creating Backup...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Download className="w-4 h-4" />
                  <span>Download Backup</span>
                </div>
              )}
            </Button>
          </div>

          {/* Restore Settings */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-3">
              <Upload className="w-5 h-5 text-gray-600" />
              <span className="font-medium text-gray-900">Restore from Backup</span>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Upload a previously downloaded settings file to restore your configuration.
            </p>
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
              className="w-full"
            >
              {importingSettings ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Restoring...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Upload className="w-4 h-4" />
                  <span>Upload Backup</span>
                </div>
              )}
            </Button>
          </div>
        </div>

        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-yellow-800">
              <strong>Warning:</strong> Restoring settings will overwrite your current configuration. 
              Make sure to backup your current settings first if needed.
            </div>
          </div>
        </div>
      </div>

      {/* System Statistics */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
            <Database className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Export Statistics</h3>
            <p className="text-gray-600 text-sm">Overview of available data for export</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">{leads.length}</div>
            <div className="text-sm text-gray-600 flex items-center justify-center space-x-1">
              <Users className="w-4 h-4" />
              <span>Total Leads</span>
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-600">Ready</div>
            <div className="text-sm text-gray-600 flex items-center justify-center space-x-1">
              <MessageSquare className="w-4 h-4" />
              <span>Message Export</span>
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">Available</div>
            <div className="text-sm text-gray-600 flex items-center justify-center space-x-1">
              <Settings className="w-4 h-4" />
              <span>Settings Backup</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}