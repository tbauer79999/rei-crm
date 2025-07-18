import React, { useState, useEffect, useRef } from 'react';
import Button from '../ui/button';
import { Label } from '../ui/label';
import { Combobox } from '@headlessui/react';
import { useAuth } from '../../context/AuthContext';
import { PERMISSIONS } from '../../lib/permissions';
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
  const { user, hasPermission, loading: authLoading } = useAuth();
  const [leads, setLeads] = useState([]);
  const [selectedLead, setSelectedLead] = useState(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const [exportingMessages, setExportingMessages] = useState(false);
  const [exportingHot, setExportingHot] = useState(false);
  const [exportingSettings, setExportingSettings] = useState(false);
  const [importingSettings, setImportingSettings] = useState(false);

  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const fileInputRef = useRef(null);

  // Permission checks
  const canViewSystemTools = hasPermission(PERMISSIONS.VIEW_EXPORT_MESSAGE_LOGS) || 
                            hasPermission(PERMISSIONS.EXPORT_ESCALATION_LOG_HOT_LEADS) ||
                            hasPermission(PERMISSIONS.EXPORT_PLATFORM_CONFIG_JSON);
  const canExportMessages = hasPermission(PERMISSIONS.VIEW_EXPORT_MESSAGE_LOGS);
  const canExportHotLeads = hasPermission(PERMISSIONS.EXPORT_ESCALATION_LOG_HOT_LEADS);
  const canExportSettings = hasPermission(PERMISSIONS.EXPORT_PLATFORM_CONFIG_JSON);
  const canImportSettings = hasPermission(PERMISSIONS.IMPORT_PLATFORM_CONFIG);

  // Enhanced API call helper
  const makeAuthenticatedRequest = async (url, options = {}) => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        throw new Error(`Authentication error: ${sessionError.message}`);
      }

      if (!session?.access_token) {
        throw new Error('No valid session found. Please log in again.');
      }

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        ...options.headers
      };

      const response = await fetch(url, {
        ...options,
        headers
      });

      if (!response.ok) {
        let errorMessage = `Request failed: ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          // If we can't parse error response, use the default message
        }
        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  };

  useEffect(() => {
    const fetchLeads = async () => {
      if (!canViewSystemTools || authLoading) {
        setLoading(false);
        return;
      }

      try {
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
      } catch (err) {
        console.error('Error fetching leads:', err);
        setError('Failed to load leads');
      } finally {
        setLoading(false);
      }
    };

    fetchLeads();
  }, [canViewSystemTools, authLoading]);

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
    if (!canExportMessages) {
      showError("You don't have permission to export message logs.");
      return;
    }

    setExportingMessages(true);
    try {
      // Use Supabase for direct database queries for exports
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
    if (!canExportHotLeads) {
      showError("You don't have permission to export hot leads.");
      return;
    }

    setExportingHot(true);
    try {
      // Use Supabase for direct database queries for exports
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
    if (!canExportSettings) {
      showError("You don't have permission to export platform settings.");
      return;
    }

    setExportingSettings(true);
    try {
      // Use API endpoint for settings export to ensure proper permissions
      const data = await makeAuthenticatedRequest('/api/settings/export');

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
    if (!canImportSettings) {
      showError("You don't have permission to import platform settings.");
      return;
    }

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

      // Use API endpoint for settings import to ensure proper validation and permissions
      await makeAuthenticatedRequest('/api/settings/import', {
        method: 'POST',
        body: JSON.stringify({ settings: json })
      });

      showSuccess(`Imported ${json.length} settings successfully!`);
    } catch (err) {
      console.error('Failed to import settings', err);
      showError('Import failed. Please check your file format.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
      setImportingSettings(false);
    }
  };

  // Permission check - show access denied if user can't view system tools
  if (!canViewSystemTools && !authLoading) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Restricted</h3>
        <p className="text-gray-600">You don't have permission to access system tools.</p>
      </div>
    );
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

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

      {/* Permission Check Alert */}
      {canViewSystemTools && (!canExportMessages || !canExportHotLeads || !canExportSettings || !canImportSettings) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center space-x-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
          <span className="text-yellow-800">
            You have limited access to system tools. Some export/import functions may be restricted based on your permissions.
          </span>
        </div>
      )}

      {/* Message Export */}
      {canExportMessages && (
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
      )}

      {/* Hot Leads Export */}
      {canExportHotLeads && (
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
      )}

      {/* Settings Backup & Restore */}
      {(canExportSettings || canImportSettings) && (
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
            {canExportSettings && (
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
            )}

            {/* Restore Settings */}
            {canImportSettings && (
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
            )}

            {/* If only one of the two permissions, make it full width */}
            {(canExportSettings && !canImportSettings) || (!canExportSettings && canImportSettings) ? (
              <div className="bg-gray-100 rounded-lg p-4 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-sm">
                    {!canExportSettings ? 'Settings backup not available with your permissions' : 'Settings restore not available with your permissions'}
                  </p>
                </div>
              </div>
            ) : null}
          </div>

          {(canExportSettings || canImportSettings) && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-yellow-800">
                  <strong>Warning:</strong> Restoring settings will overwrite your current configuration. 
                  Make sure to backup your current settings first if needed.
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* System Statistics */}
      {canViewSystemTools && (
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
              <div className={`text-2xl font-bold ${canExportMessages ? 'text-green-600' : 'text-gray-400'}`}>
                {canExportMessages ? 'Ready' : 'Restricted'}
              </div>
              <div className="text-sm text-gray-600 flex items-center justify-center space-x-1">
                <MessageSquare className="w-4 h-4" />
                <span>Message Export</span>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div className={`text-2xl font-bold ${canExportSettings ? 'text-blue-600' : 'text-gray-400'}`}>
                {canExportSettings ? 'Available' : 'Restricted'}
              </div>
              <div className="text-sm text-gray-600 flex items-center justify-center space-x-1">
                <Settings className="w-4 h-4" />
                <span>Settings Backup</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Show message if no tools are available */}
      {!canExportMessages && !canExportHotLeads && !canExportSettings && !canImportSettings && canViewSystemTools && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Tools Available</h3>
          <p className="text-gray-600">You don't have permission to access any system tools at this time.</p>
        </div>
      )}
    </div>
  );
}