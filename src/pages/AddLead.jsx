import React, { useState, useEffect } from 'react';
import { X, Upload, FileText, AlertCircle, CheckCircle2, Download, Loader2, Users, Phone, Mail, Building2, Tag, Sparkles, Zap, TrendingUp, ChevronDown } from 'lucide-react';
import Papa from 'papaparse';
import apiClient from '../lib/apiClient';
import supabase from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

export default function AddLead({ onSuccess, onCancel }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('single');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('');
  const [uploadError, setUploadError] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [parsedData, setParsedData] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [leadFields, setLeadFields] = useState([]);
  const [parsedRecords, setParsedRecords] = useState([]);
  const [fileReady, setFileReady] = useState(false);
  
  // Form state
  const [campaigns, setCampaigns] = useState([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState('');
  const [creatingCampaign, setCreatingCampaign] = useState(false);

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    company: '',
    campaign_id: '',
    status: 'Hot Lead',
    property_address: '',
    notes: ''
  });

  const statuses = [
    { value: 'New Lead', icon: Sparkles, color: 'text-blue-600 bg-blue-50' },
    { value: 'Hot Lead', icon: Zap, color: 'text-red-600 bg-red-50' },
    { value: 'Cold Lead', icon: TrendingUp, color: 'text-gray-600 bg-gray-50' }
  ];

  useEffect(() => {
    fetchLeadFields();
    fetchCampaigns();
  }, [user]);

  const fetchLeadFields = async () => {
    if (!user?.tenant_id) return;

    try {
      const { data, error } = await supabase
        .from('lead_field_config')
        .select('*')
        .eq('tenant_id', user.tenant_id)
        .order('field_name');

      if (error) {
        console.error('Error fetching lead fields:', error);
        return;
      }

      const uniqueFields = data?.reduce((acc, field) => {
        const exists = acc.find(f => f.field_name === field.field_name);
        if (!exists) {
          acc.push(field);
        }
        return acc;
      }, []) || [];

      setLeadFields(uniqueFields);
    } catch (err) {
      console.error('Error fetching lead fields:', err);
    }
  };

  const fetchCampaigns = async () => {
    if (!user || !user.tenant_id) {
      setLoadingCampaigns(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('id, name')
        .eq('tenant_id', user.tenant_id)
        .eq('is_active', true);

      if (error) {
        throw error;
      }
      setCampaigns(data || []);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    } finally {
      setLoadingCampaigns(false);
    }
  };

  const handleCreateCampaign = async () => {
    if (!newCampaignName.trim()) {
      alert('Please enter a campaign name');
      return;
    }

    setCreatingCampaign(true);
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('campaigns')
        .insert([
          {
            name: newCampaignName.trim(),
            tenant_id: user.tenant_id,
            is_active: true,
            created_at: now,
            start_date: now,
          }
        ])
        .select()
        .single();

      if (error) {
        throw error;
      }

      setCampaigns([...campaigns, data]);
      setForm({ ...form, campaign_id: String(data.id) });
      setBulkCampaignId(String(data.id)); // Also set for bulk if that's active
      setNewCampaignName('');
      setShowCreateCampaign(false);
      setShowCreateCampaignBulk(false);
    } catch (error) {
      console.error('Error creating campaign:', error);
      alert(`Error creating campaign: ${error.message}`);
    } finally {
      setCreatingCampaign(false);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (file) => {
    if (!file) return;
    
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      setUploadStatus('Please upload a CSV file');
      setUploadError(true);
      return;
    }

    if (!leadFields || leadFields.length === 0) {
      alert('Field configuration is still loading. Please try again.');
      return;
    }

    setSelectedFile(file);
    setUploadStatus('');
    setUploadError(false);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const labelToFieldMap = {};
        leadFields.forEach(field => {
          labelToFieldMap[field.field_label] = field.field_name;
          labelToFieldMap[field.field_name] = field.field_name;
        });

        const records = results.data.map((row, index) => {
          const fields = {};
          
          leadFields.forEach(field => {
            const value = row[field.field_label] || row[field.field_name] || '';
            fields[field.field_name] = value;
          });

          console.log(`Record ${index + 1} mapped:`, fields);
          return { fields };
        });

        setParsedRecords(records);
        setFileReady(true);
        setUploadStatus(`Ready to import ${records.length} leads`);
      },
      error: (error) => {
        console.error('CSV parsing error:', error);
        setUploadStatus('Error parsing CSV file');
        setUploadError(true);
      }
    });
  };

  const [showCreateCampaignBulk, setShowCreateCampaignBulk] = useState(false);
  const [bulkCampaignId, setBulkCampaignId] = useState('');
  
  const handleBulkSubmit = async () => {
    if (!bulkCampaignId && campaigns.length > 0) {
      alert('Please select a campaign for the bulk import');
      return;
    }
    
    setIsUploading(true);
    try {
      // Add campaign_id to all records
      const recordsWithCampaign = parsedRecords.map(record => ({
        ...record,
        fields: {
          ...record.fields,
          campaign_id: bulkCampaignId
        }
      }));
      
      const res = await apiClient.post('/leads/bulk', { records: recordsWithCampaign });
      const { uploaded = 0, skipped = 0, added = 0 } = res.data;
      setUploadStatus(`✅ Successfully imported ${added} leads (${skipped} skipped)`);
      setUploadError(false);
      setSelectedFile(null);
      setParsedRecords([]);
      setFileReady(false);
      setBulkCampaignId('');
      setTimeout(() => {
        onSuccess && onSuccess();
      }, 1500);
    } catch (err) {
      const data = err.response?.data;
      const errorMsg = data?.error || 'Bulk upload failed';
      setUploadStatus(`❌ ${errorMsg}`);
      setUploadError(true);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSingleSubmit = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      if (!user || !user.tenant_id || !accessToken) {
        alert('User authentication information not available. Please log in.');
        return;
      }

      if (!form.campaign_id && campaigns.length > 0) {
        alert('Please select a campaign for the lead.');
        return;
      }

      const edgeFunctionUrl = 'https://wuuqrdlfgkasnwydyvgk.supabase.co/functions/v1/my-first-qualification-function'; 

      const res = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'apikey': process.env.REACT_APP_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          email: form.email,
          status: form.status,
          tenant_id: user.tenant_id,
          campaign_id: form.campaign_id || null,
          property_address: form.property_address,
          notes: form.notes
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to submit lead');
      }

      // Reset form
      setForm({
        name: '',
        phone: '',
        email: '',
        company: '',
        campaign_id: '',
        status: 'Hot Lead',
        property_address: '',
        notes: ''
      });
      
      onSuccess && onSuccess();
    } catch (error) {
      console.error('Error submitting lead:', error);
      alert(`Error: ${error.message}`);
    }
  };

  const downloadTemplate = () => {
    if (!leadFields || leadFields.length === 0) {
      alert('Field configuration is still loading. Please try again.');
      return;
    }

    const headers = leadFields.map(field => field.field_label || field.field_name);
    const sampleData = leadFields.map(field => {
      const exampleData = {
        'name': 'John Doe',
        'phone': '+1-555-123-4567',
        'email': 'john.doe@example.com',
        'property_address': '123 Main St, City, State 12345',
        'company_name': 'ABC Company',
        'status': 'Hot Lead',
        'campaign': 'Q1 Outreach',
        'notes': 'Interested in our services'
      };
      return exampleData[field.field_name] || `Example ${field.field_label || field.field_name}`;
    });

    const csvContent = [
      headers.join(','),
      sampleData.join(',')
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lead_import_template_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
        onClick={onCancel}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <div className="relative w-full max-w-4xl bg-white rounded-xl shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Add Leads</h2>
              <button
                onClick={onCancel}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Tab Navigation */}
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex">
                <button
                  onClick={() => setActiveTab('single')}
                  className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'single'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Users className="w-4 h-4 inline-block mr-2" />
                  Single Entry
                </button>
                <button
                  onClick={() => setActiveTab('bulk')}
                  className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'bulk'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Upload className="w-4 h-4 inline-block mr-2" />
                  Bulk Import
                </button>
              </nav>
            </div>

            {/* Content */}
            <div className="p-6 max-h-[calc(100vh-300px)] overflow-y-auto">
              {activeTab === 'single' ? (
                /* Single Entry Form */
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="John Doe"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="+1 (555) 123-4567"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="john@example.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Property Address
                      </label>
                      <input
                        type="text"
                        value={form.property_address}
                        onChange={(e) => setForm({ ...form, property_address: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="123 Main St, City, State"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Status
                      </label>
                      <select
                        value={form.status}
                        onChange={(e) => setForm({ ...form, status: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="Hot Lead">Hot Lead</option>
                        <option value="Cold Lead">Cold Lead</option>
                        <option value="New Lead">New Lead</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Campaign
                      </label>
                      {loadingCampaigns ? (
                        <p className="text-sm text-gray-500">Loading campaigns...</p>
                      ) : campaigns.length === 0 ? (
                        <div className="space-y-2">
                          <p className="text-sm text-gray-500">No campaigns found</p>
                          <button
                            type="button"
                            onClick={() => setShowCreateCampaign(!showCreateCampaign)}
                            className="text-sm text-blue-600 hover:text-blue-700"
                          >
                            Create new campaign
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <select
                            value={form.campaign_id}
                            onChange={(e) => setForm({ ...form, campaign_id: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                          >
                            <option value="">Select a campaign</option>
                            {campaigns.map(campaign => (
                              <option key={campaign.id} value={String(campaign.id)}>
                                {campaign.name}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => setShowCreateCampaign(!showCreateCampaign)}
                            className="text-sm text-blue-600 hover:text-blue-700"
                          >
                            Create new campaign
                          </button>
                        </div>
                      )}
                      
                      {showCreateCampaign && (
                        <div className="mt-2 flex gap-2">
                          <input
                            type="text"
                            value={newCampaignName}
                            onChange={(e) => setNewCampaignName(e.target.value)}
                            placeholder="Campaign name"
                            className="flex-1 px-3 py-1 border border-gray-300 rounded text-sm"
                            disabled={creatingCampaign}
                          />
                          <button
                            type="button"
                            onClick={handleCreateCampaign}
                            disabled={creatingCampaign}
                            className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50"
                          >
                            {creatingCampaign ? 'Creating...' : 'Create'}
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Notes
                      </label>
                      <textarea
                        value={form.notes}
                        onChange={(e) => setForm({ ...form, notes: e.target.value })}
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Additional notes..."
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* Bulk Import */
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">Upload a CSV file to import multiple leads at once</p>
                    <button
                      onClick={downloadTemplate}
                      className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Download Template
                    </button>
                  </div>

                  {/* Campaign Selection for Bulk Import */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Campaign for Import *
                    </label>
                    {loadingCampaigns ? (
                      <p className="text-sm text-gray-500">Loading campaigns...</p>
                    ) : campaigns.length === 0 ? (
                      <div className="space-y-3">
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                          <p className="text-sm text-yellow-800 mb-2">No campaigns found. Create your first campaign to start importing leads.</p>
                          <button
                            type="button"
                            onClick={() => setShowCreateCampaignBulk(!showCreateCampaignBulk)}
                            className="text-sm text-blue-600 hover:text-blue-700"
                          >
                            {showCreateCampaignBulk ? 'Cancel' : 'Create Campaign'}
                          </button>
                        </div>
                        
                        {showCreateCampaignBulk && (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={newCampaignName}
                              onChange={(e) => setNewCampaignName(e.target.value)}
                              placeholder="Campaign name"
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              disabled={creatingCampaign}
                            />
                            <button
                              type="button"
                              onClick={handleCreateCampaign}
                              disabled={creatingCampaign}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
                            >
                              {creatingCampaign ? 'Creating...' : 'Create'}
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <select
                          value={bulkCampaignId}
                          onChange={(e) => setBulkCampaignId(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          required
                        >
                          <option value="">Select a campaign</option>
                          {campaigns.map(campaign => (
                            <option key={campaign.id} value={String(campaign.id)}>
                              {campaign.name}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => setShowCreateCampaignBulk(!showCreateCampaignBulk)}
                          className="text-sm text-blue-600 hover:text-blue-700"
                        >
                          {showCreateCampaignBulk ? 'Cancel' : 'Create new campaign'}
                        </button>
                        
                        {showCreateCampaignBulk && (
                          <div className="flex gap-2 mt-2">
                            <input
                              type="text"
                              value={newCampaignName}
                              onChange={(e) => setNewCampaignName(e.target.value)}
                              placeholder="Campaign name"
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              disabled={creatingCampaign}
                            />
                            <button
                              type="button"
                              onClick={handleCreateCampaign}
                              disabled={creatingCampaign}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
                            >
                              {creatingCampaign ? 'Creating...' : 'Create'}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Drop Zone */}
                  <div
                    className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                      dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                    }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                  >
                    <input
                      type="file"
                      accept=".csv"
                      onChange={(e) => handleFileSelect(e.target.files[0])}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    
                    {selectedFile ? (
                      <div className="space-y-2">
                        <FileText className="w-10 h-10 text-blue-600 mx-auto" />
                        <p className="font-medium text-gray-900">{selectedFile.name}</p>
                        <p className="text-sm text-gray-500">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                        <button
                          onClick={() => {
                            setSelectedFile(null);
                            setParsedRecords([]);
                            setFileReady(false);
                            setUploadStatus('');
                          }}
                          className="text-sm text-red-600 hover:text-red-700"
                        >
                          Remove file
                        </button>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                        <p className="font-medium text-gray-900">Drop your CSV file here</p>
                        <p className="text-sm text-gray-500">or click to browse</p>
                      </>
                    )}
                  </div>

                  {/* Status Messages */}
                  {uploadStatus && (
                    <div className={`p-3 rounded-lg flex items-center text-sm ${
                      uploadError 
                        ? 'bg-red-50 text-red-800' 
                        : 'bg-green-50 text-green-800'
                    }`}>
                      {uploadError ? (
                        <AlertCircle className="w-4 h-4 mr-2" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                      )}
                      {uploadStatus}
                    </div>
                  )}

                  {/* Preview */}
                  {parsedRecords.length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">
                        Preview: {parsedRecords.length} records ready to import
                      </p>
                      <div className="text-xs text-gray-600">
                        Fields detected: {Object.keys(parsedRecords[0]?.fields || {}).join(', ')}
                      </div>
                    </div>
                  )}

                  {/* Guidelines */}
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-blue-900 mb-2">Import Guidelines</h4>
                    <ul className="space-y-1 text-sm text-blue-800">
                      <li>• CSV files should include headers matching your configured fields</li>
                      <li>• Required fields: name, phone, and campaign</li>
                      <li>• Duplicate leads will be automatically skipped</li>
                      <li>• Maximum 10,000 rows per import</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={onCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              {activeTab === 'single' ? (
                <button
                  onClick={handleSingleSubmit}
                  disabled={!form.name || !form.phone || (campaigns.length > 0 && !form.campaign_id)}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Add Lead
                </button>
              ) : (
                <button
                  onClick={handleBulkSubmit}
                  disabled={!fileReady || isUploading || !bulkCampaignId}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Import {parsedRecords.length} Leads
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}