import React, { useState, useEffect } from 'react';
import { 
  X, Upload, FileText, AlertCircle, CheckCircle2, Download, Loader2, Users, Phone, Mail, Building2, Tag, Sparkles, Zap, TrendingUp, ChevronDown,
  Clock, Activity, RefreshCw, Pause, Play, Calendar, BarChart3
} from 'lucide-react';
import Papa from 'papaparse';
import supabase from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import FieldMappingInterface from '../components/FieldMappingInterface';

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
  
  // Upload Status Tab State
  const [jobs, setJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [jobsError, setJobsError] = useState('');
  const [pollingActive, setPollingActive] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [hiddenJobIds, setHiddenJobIds] = useState(new Set());
  const [showAllJobs, setShowAllJobs] = useState(false);
  
  // Mapping
  const [showMappingInterface, setShowMappingInterface] = useState(false);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [csvPreviewData, setCsvPreviewData] = useState([]);
  const [fieldMapping, setFieldMapping] = useState({});

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

  // Fetch upload jobs for status tab
  const fetchUploadJobs = async () => {
    if (!user?.tenant_id || activeTab !== 'status') return;

    try {
      const { data, error } = await supabase
        .from('bulk_upload_jobs')
        .select('*')
        .eq('tenant_id', user.tenant_id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      setJobs(data || []);
      setLastUpdated(new Date());
      setJobsError('');
    } catch (err) {
      console.error('Error fetching upload jobs:', err);
      setJobsError('Failed to load upload status');
    } finally {
      setJobsLoading(false);
    }
  };

  // Poll for job updates when status tab is active
  useEffect(() => {
    if (activeTab === 'status') {
      fetchUploadJobs();

      let interval;
      if (pollingActive) {
        interval = setInterval(fetchUploadJobs, 5000);
      }

      return () => {
        if (interval) clearInterval(interval);
      };
    }
  }, [user?.tenant_id, pollingActive, activeTab]);

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

  const handleMappingComplete = (mapping) => {
  setFieldMapping(mapping);
  setShowMappingInterface(false);
  setFileReady(true);
  setUploadStatus(`✅ Ready to import ${parsedRecords.length} leads with ${Object.keys(mapping).length} mapped fields`);
};

const handleMappingCancel = () => {
  localStorage.removeItem('draft_field_mapping'); // ADD THIS LINE
  setShowMappingInterface(false);
  setSelectedFile(null);
  setParsedRecords([]);
  setCsvHeaders([]);
  setCsvPreviewData([]);
  setFieldMapping({});
  setUploadStatus('');
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

  setSelectedFile(file);
  setUploadStatus('');
  setUploadError(false);

  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: (results) => {
      if (results.data.length === 0) {
        setUploadStatus('CSV file appears to be empty');
        setUploadError(true);
        return;
      }

      // Extract headers and preview data
      const headers = Object.keys(results.data[0] || {});
      setCsvHeaders(headers);
      setCsvPreviewData(results.data.slice(0, 5)); // First 5 rows for preview
      setParsedRecords(results.data); // Keep for later use
      
      // Show mapping interface instead of "ready to import"
      setShowMappingInterface(true);
      setUploadStatus(`Found ${results.data.length} records. Please map your fields.`);
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
  
  // Updated bulk submit to use new job queue system
  const handleBulkSubmit = async () => {
    if (!bulkCampaignId && campaigns.length > 0) {
      alert('Please select a campaign for the bulk import');
      return;
    }
    
    if (!selectedFile) {
      alert('Please select a CSV file to upload');
      return;
    }
    
    setIsUploading(true);
    try {
      // Upload file to Supabase Storage first
      const fileName = `bulk-uploads/${user.tenant_id}/${Date.now()}-${selectedFile.name}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('bulk-uploads')
        .upload(fileName, selectedFile);

      if (uploadError) {
        throw new Error(`File upload failed: ${uploadError.message}`);
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('bulk-uploads')
        .getPublicUrl(fileName);

      // Create bulk upload job
const { data: jobData, error: jobError } = await supabase
  .rpc('create_bulk_upload_job', {
    p_tenant_id: user.tenant_id,
    p_created_by: user.id,
    p_file_name: selectedFile.name,
    p_file_url: publicUrl,
    p_file_size: selectedFile.size,
    p_campaign_id: bulkCampaignId || null,
    p_total_records: parsedRecords.length,
    p_field_mapping: fieldMapping
  });

      if (jobError) {
        throw new Error(`Failed to create upload job: ${jobError.message}`);
      }

      setUploadStatus(`✅ Upload queued successfully! Processing ${parsedRecords.length} leads in background.`);
      setUploadError(false);
      setSelectedFile(null);
      setParsedRecords([]);
      setFileReady(false);
      setBulkCampaignId('');
      setFieldMapping({});
      setCsvHeaders([]);
      setCsvPreviewData([]);
      setShowMappingInterface(false);
      // Switch to status tab to show progress
      setActiveTab('status');
      fetchUploadJobs(); // Refresh jobs
      
    } catch (err) {
      console.error('Bulk upload error:', err);
      setUploadStatus(`❌ ${err.message}`);
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

  // Helper functions for Upload Status tab
  const timeAgo = (date) => {
    const now = new Date();
    const diffMs = now - new Date(date);
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const formatEstimatedCompletion = (estimatedTime) => {
    if (!estimatedTime) return 'Calculating...';
    
    const now = new Date();
    const estimated = new Date(estimatedTime);
    const diffMs = estimated - now;
    
    if (diffMs <= 0) return 'Completing soon...';
    
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    
    if (diffMins < 60) return `~${diffMins} minutes`;
    return `~${diffHours}h ${diffMins % 60}m`;
  };

  // Download failed rows CSV
  const downloadFailedRows = async (jobId, fileName) => {
    try {
      const { data: errors, error } = await supabase
        .from('bulk_upload_errors')
        .select('*')
        .eq('job_id', jobId);

      if (error) throw error;

      if (!errors || errors.length === 0) {
        alert('No failed rows to download');
        return;
      }

      // Convert errors to CSV
      const headers = ['Row Number', 'Error Type', 'Error Message', 'Field', 'Original Data'];
      const csvData = errors.map(error => [
        error.row_number,
        error.error_type,
        error.error_message,
        error.error_field || '',
        JSON.stringify(error.raw_data)
      ]);

      const csvContent = [
        headers.join(','),
        ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `failed_rows_${fileName}_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading failed rows:', err);
      alert('Failed to download error report');
    }
  };

  // Separate active and completed jobs
  const activeJobs = jobs.filter(job => ['pending', 'processing'].includes(job.status));
  const completedJobs = jobs.filter(job => ['completed', 'failed', 'cancelled'].includes(job.status));

  // Hide dismissed jobs and limit completed jobs if not showing all
  const visibleJobs = jobs.filter(job => !hiddenJobIds.has(job.id));
  const displayedJobs = showAllJobs ? visibleJobs : [
    ...visibleJobs.filter(job => ['pending', 'processing'].includes(job.status)),
    ...visibleJobs.filter(job => ['completed', 'failed', 'cancelled'].includes(job.status)).slice(0, 5)
  ];

  const hasMoreJobs = visibleJobs.length > displayedJobs.length;

  // Function to dismiss a job
  const dismissJob = (jobId) => {
    setHiddenJobIds(prev => new Set([...prev, jobId]));
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
                <button
                  onClick={() => {
                    setActiveTab('status');
                    setJobsLoading(true);
                    fetchUploadJobs();
                  }}
                  className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'status'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Activity className="w-4 h-4 inline-block mr-2" />
                  Upload Status
                  {activeJobs.length > 0 && (
                    <span className="ml-2 px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                      {activeJobs.length}
                    </span>
                  )}
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
              ) : activeTab === 'bulk' ? (
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

                  {showMappingInterface ? (
                    <FieldMappingInterface
                      csvHeaders={csvHeaders}
                      csvPreviewData={csvPreviewData}
                      tenantId={user?.tenant_id}
                      onMappingComplete={handleMappingComplete}
                      onCancel={handleMappingCancel}
                    />
                  ) : (
                    <>
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
                                setFieldMapping({});
                                setCsvHeaders([]);
                                setCsvPreviewData([]);
                                setShowMappingInterface(false);
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
                      {parsedRecords.length > 0 && fileReady && (
                        <div className="bg-gray-50 rounded-lg p-4">
                          <p className="text-sm font-medium text-gray-700 mb-2">
                            Ready to import: {parsedRecords.length} records
                          </p>
                          <div className="text-xs text-gray-600">
                            Mapped fields: {Object.keys(fieldMapping).length > 0 ? Object.values(fieldMapping).join(', ') : 'None'}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Guidelines */}
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-blue-900 mb-2">Enterprise Import System</h4>
                    <ul className="space-y-1 text-sm text-blue-800">
                      <li>• Upload files up to 100,000+ leads</li>
                      <li>• Background processing with real-time progress</li>
                      <li>• Automatic deduplication and validation</li>
                      <li>• Switch to "Upload Status" tab to monitor progress</li>
                      <li>• Email notifications when processing completes</li>
                    </ul>
                  </div>
                </div>
              ) : (
                /* Upload Status Tab - NEW IMPROVED VERSION */
                <div className="space-y-6">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">Upload Status</h3>
                      <p className="text-sm text-gray-500">Monitor your bulk upload progress</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={fetchUploadJobs}
                        className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                        title="Refresh"
                      >
                        <RefreshCw size={16} />
                      </button>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <div className={`w-2 h-2 rounded-full ${pollingActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                        Auto-refresh {pollingActive ? 'on' : 'off'}
                      </div>
                    </div>
                  </div>

                  {jobsError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center text-sm">
                      <AlertCircle className="w-4 h-4 text-red-600 mr-2 flex-shrink-0" />
                      <span className="text-red-800">{jobsError}</span>
                    </div>
                  )}

                  {jobsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                    </div>
                  ) : jobs.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                      <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600">No uploads yet</p>
                      <p className="text-sm text-gray-500">Start a bulk import to see progress here</p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-3">
                        {displayedJobs.map((job) => {
                        const isActive = ['pending', 'processing'].includes(job.status);
                        const isCompleted = job.status === 'completed';
                        const isFailed = job.status === 'failed';
                        
                        const progressPercent = Math.min(job.progress_percentage || 0, 100);
                        const successRate = job.total_records > 0 ? ((job.successful_records || 0) / job.total_records * 100) : 0;
                        
                        return (
                          <div key={job.id} className={`border rounded-lg p-4 transition-all ${
                            isActive ? 'bg-blue-50 border-blue-200' : 
                            isCompleted ? 'bg-white border-gray-200' : 
                            'bg-red-50 border-red-200'
                          }`}>
                            
                            {/* Header Row */}
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div className={`p-1.5 rounded-full ${
                                  isActive ? 'bg-blue-100' :
                                  isCompleted ? 'bg-green-100' : 
                                  'bg-red-100'
                                }`}>
                                  {isActive ? <Activity className="w-4 h-4 text-blue-600" /> :
                                   isCompleted ? <CheckCircle2 className="w-4 h-4 text-green-600" /> :
                                   <AlertCircle className="w-4 h-4 text-red-600" />}
                                </div>
                                
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-medium text-gray-900 truncate">{job.file_name}</h4>
                                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                                      isActive ? 'bg-blue-100 text-blue-800' :
                                      isCompleted ? 'bg-green-100 text-green-800' :
                                      'bg-red-100 text-red-800'
                                    }`}>
                                      {job.status === 'pending' ? 'Queued' :
                                       job.status === 'processing' ? 'Processing' :
                                       job.status === 'completed' ? 'Complete' :
                                       'Failed'}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-500">
                                    {timeAgo(job.created_at)} • {job.total_records?.toLocaleString() || 0} records
                                  </p>
                                </div>
                              </div>
                              
                              {/* Actions */}
                              <div className="flex items-center gap-1">
                                {job.failed_records > 0 && (
                                  <button
                                    onClick={() => downloadFailedRows(job.id, job.file_name)}
                                    className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors"
                                    title="Download failed rows"
                                  >
                                    <Download size={14} />
                                  </button>
                                )}
                                {!['pending', 'processing'].includes(job.status) && (
                                  <button
                                    onClick={() => dismissJob(job.id)}
                                    className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                                    title="Dismiss"
                                  >
                                    <X size={14} />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Progress Bar for Active Jobs */}
                            {isActive && (
                              <div className="mb-3">
                                <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                                  <span>{job.processed_records?.toLocaleString() || 0} / {job.total_records?.toLocaleString() || 0}</span>
                                  <span>{progressPercent.toFixed(0)}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-1.5">
                                  <div 
                                    className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                                    style={{ width: `${progressPercent}%` }}
                                  />
                                </div>
                                {job.status === 'processing' && job.average_records_per_minute && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    ~{job.average_records_per_minute} records/min • ETA: {formatEstimatedCompletion(job.estimated_completion_at)}
                                  </p>
                                )}
                              </div>
                            )}

                            {/* Results Summary */}
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-4">
                                {job.successful_records > 0 && (
                                  <div className="flex items-center gap-1 text-green-700">
                                    <CheckCircle2 size={14} />
                                    <span className="font-medium">{job.successful_records?.toLocaleString()}</span>
                                    <span className="text-gray-500">success</span>
                                  </div>
                                )}
                                
                                {job.failed_records > 0 && (
                                  <div className="flex items-center gap-1 text-red-700">
                                    <AlertCircle size={14} />
                                    <span className="font-medium">{job.failed_records?.toLocaleString()}</span>
                                    <span className="text-gray-500">failed</span>
                                  </div>
                                )}
                                
                                {job.duplicate_records > 0 && (
                                  <div className="flex items-center gap-1 text-yellow-700">
                                    <Users size={14} />
                                    <span className="font-medium">{job.duplicate_records?.toLocaleString()}</span>
                                    <span className="text-gray-500">dupes</span>
                                  </div>
                                )}
                              </div>
                              
                              {/* Success Rate for Completed Jobs */}
                              {isCompleted && job.total_records > 0 && (
                                <div className="text-xs text-gray-500">
                                  {successRate.toFixed(1)}% success rate
                                </div>
                              )}
                            </div>

                            {/* Error Message */}
                            {isFailed && job.error_message && (
                              <div className="mt-3 pt-3 border-t border-red-200">
                                <p className="text-xs text-red-600 flex items-start gap-1">
                                  <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />
                                  <span>{job.error_message}</span>
                                </p>
                              </div>
                            )}
                          </div>
                        );
})}
                    </div>

                    {/* Show More/Less Button */}
                    {hasMoreJobs && (
                      <div className="text-center pt-4">
                        <button
                          onClick={() => setShowAllJobs(!showAllJobs)}
                          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                          {showAllJobs ? 'Show Less' : `Show ${visibleJobs.length - displayedJobs.length} More`}
                        </button>
                      </div>
                    )}

                    {hiddenJobIds.size > 0 && (
                      <div className="text-center pt-2">
                        <button
                          onClick={() => setHiddenJobIds(new Set())}
                          className="text-xs text-gray-500 hover:text-gray-700"
                        >
                          Show {hiddenJobIds.size} dismissed job{hiddenJobIds.size === 1 ? '' : 's'}
                        </button>
                      </div>
                    )}
                  </>
                  )}


                  {/* Summary Stats */}
                  {jobs.length > 0 && (
                    <div className="grid grid-cols-4 gap-4 pt-4 border-t border-gray-200">
                      <div className="text-center">
                        <div className="text-lg font-semibold text-gray-900">
                          {visibleJobs.reduce((sum, job) => sum + (job.total_records || 0), 0).toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500">Total Records</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold text-green-600">
                          {visibleJobs.reduce((sum, job) => sum + (job.successful_records || 0), 0).toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500">Successful</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold text-red-600">
                          {visibleJobs.reduce((sum, job) => sum + (job.failed_records || 0), 0).toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500">Failed</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold text-yellow-600">
                          {visibleJobs.reduce((sum, job) => sum + (job.duplicate_records || 0), 0).toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500">Duplicates</div>
                      </div>
                    </div>
                  )}
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
              ) : activeTab === 'bulk' ? (
                <button
                  onClick={handleBulkSubmit}
                  disabled={!fileReady || isUploading || !bulkCampaignId || Object.keys(fieldMapping).length === 0}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Queuing Upload...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Queue {parsedRecords.length} Leads
                    </>
                  )}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}