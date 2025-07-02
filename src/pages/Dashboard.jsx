import React, { useEffect, useState } from 'react';
import apiClient from '../lib/apiClient';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AddLead from '../pages/AddLead';
import ProductTour from '../components/ProductTour';
import { 
  Search, 
  Plus, 
  Filter, 
  Download, 
  Upload, 
  Users, 
  Phone, 
  Mail, 
  Calendar,
  TrendingUp,
  MoreHorizontal,
  ChevronDown,
  FileText,
  Eye,
  MapPin,
  Building2,
  DollarSign,
  Clock,
  AlertCircle,
  Flame,
  Activity,
  Zap
} from 'lucide-react';
import Papa from 'papaparse';
import supabase from '../lib/supabaseClient';

export default function Dashboard() {
  const { user } = useAuth();
  const [leads, setLeads] = useState([]);
  const [filteredLeads, setFilteredLeads] = useState([]);
  const [leadFields, setLeadFields] = useState([]);
  const [filterStatus, setFilterStatus] = useState(null);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [tab, setTab] = useState('single');
  const [fileReady, setFileReady] = useState(false);
  const [parsedRecords, setParsedRecords] = useState([]);
  const [uploadMessage, setUploadMessage] = useState('');
  const [uploadError, setUploadError] = useState(false);
  const [sortBy, setSortBy] = useState('hot_score'); // Changed from 'created_at'
  const [sortDirection, setSortDirection] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const navigate = useNavigate();

  // Get leads that need immediate attention - EXCLUDE already handled leads
  const alertLeads = leads.filter(lead => 
    lead.requires_immediate_attention && 
    !(lead.status === 'Hot Lead' && lead.assigned_to_sales_team_id) // Exclude hot leads that are assigned
  );
  
  const criticalAlerts = alertLeads.filter(lead => 
    lead.alert_priority === 'critical'
  );

  // Icon mapping for field types
  const getFieldIcon = (fieldName) => {
    const iconMap = {
      'name': Users,
      'phone': Phone, 
      'email': Mail,
      'property_address': MapPin,
      'company_name': Building2,
      'current_vehicle': 'Car',
      'salary_expectations': DollarSign,
      'budget_range': DollarSign,
      'timeline': Clock,
      'status': TrendingUp,
      'campaign': 'Rocket'
    };
    return iconMap[fieldName] || FileText;
  };

  useEffect(() => {
    fetchLeadFields();
    fetchLeads();
  }, [user]);

  // Fetch the dynamic field configuration for this tenant
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

      // ✅ Remove duplicates by field_name
      const uniqueFields = data?.reduce((acc, field) => {
        const exists = acc.find(f => f.field_name === field.field_name);
        if (!exists) {
          acc.push(field);
        }
        return acc;
      }, []) || [];

      console.log(`Loaded ${data?.length} total fields, ${uniqueFields.length} unique fields`);
      setLeadFields(uniqueFields);
    } catch (err) {
      console.error('Error fetching lead fields:', err);
    }
  };

  const fetchLeads = async () => {
    // Check if user is logged in
    if (!user) return; // Only proceed if user object exists

    let query = supabase
      .from('leads')
      .select(`
        *,
        campaigns(name)
      `)
      .order(sortBy === 'hot_score' ? 'created_at' : sortBy, { ascending: sortDirection === 'asc' });

    // --- MODIFIED LOGIC FOR GLOBAL ADMIN ACCESS ---
    const isGlobalAdmin = user?.role === 'global_admin' || user?.user_metadata?.role === 'global_admin';

    if (!isGlobalAdmin) {
      // For regular tenant users, filter by their tenant_id
      if (!user.tenant_id) { // Still ensure tenant_id exists for regular users
        console.warn("User is not admin and tenant_id is missing. Cannot fetch leads.");
        return; // Exit if not admin and tenant_id is missing
      }
      query = query.eq('tenant_id', user.tenant_id);
      console.log("Fetching leads for tenant_id:", user.tenant_id);
    } else {
      console.log("Fetching ALL leads as Global Admin.");
    }
    // --- END MODIFIED LOGIC ---

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching leads:', error);
      return;
    }

    // Fetch lead scores separately
    const leadIds = data?.map(lead => lead.id) || [];
    
    if (leadIds.length > 0) {
      const { data: leadScores, error: scoresError } = await supabase
        .from('lead_scores')
        .select('*')
        .in('lead_id', leadIds);

      if (scoresError) {
        console.error('Error fetching lead scores:', scoresError);
      }

      // Create a map for quick lookup
      const scoresMap = {};
      leadScores?.forEach(score => {
        scoresMap[score.lead_id] = score;
      });

      // Transform the data to include campaign name and lead scores
      const transformedData = data?.map(lead => ({
        ...lead,
        campaign: lead.campaigns?.name || 'No Campaign',
        // Merge all score data if it exists
        ...(scoresMap[lead.id] || {}),
        // Ensure hot_score has a default value
        hot_score: scoresMap[lead.id]?.hot_score || 0,
        requires_immediate_attention: scoresMap[lead.id]?.requires_immediate_attention || false,
        alert_priority: scoresMap[lead.id]?.alert_priority || 'none',
        alert_triggers: scoresMap[lead.id]?.alert_triggers || {},
        attention_reasons: scoresMap[lead.id]?.attention_reasons || [],
        funnel_stage: scoresMap[lead.id]?.funnel_stage || lead.status
      })) || [];

      setLeads(transformedData);
      setFilteredLeads(transformedData);
    } else {
      // No leads found
      setLeads([]);
      setFilteredLeads([]);
    }
  };

  useEffect(() => {
    let updated = [...leads];
    
    // Apply status filter
    if (filterStatus) {
      if (filterStatus === 'All') {
        // Show all
      } else if (filterStatus === 'Alerts') {
        // Only show alerts that aren't hot leads assigned to sales
        updated = updated.filter(lead => 
          lead.requires_immediate_attention && 
          !(lead.status === 'Hot Lead' && lead.assigned_to_sales_team_id)
        );
      } else if (filterStatus === 'Hot (80+)') {
        updated = updated.filter(lead => lead.hot_score >= 80);
      } else if (filterStatus === 'Active (60+)') {
        updated = updated.filter(lead => lead.hot_score >= 60);
      } else if (filterStatus === 'Cold (<60)') {
        updated = updated.filter(lead => lead.hot_score < 60);
      }
    }
    
    // Apply search filter across all configured fields
    if (search.trim()) {
      const lower = search.toLowerCase();
      updated = updated.filter(lead => {
        return leadFields.some(field => {
          const value = lead[field.field_name];
          return value && value.toString().toLowerCase().includes(lower);
        });
      });
    }
    
    // Apply sorting
    updated.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];
      
      // Handle null/undefined values
      if (aVal === null || aVal === undefined) aVal = 0;
      if (bVal === null || bVal === undefined) bVal = 0;
      
      if (sortBy === 'created_at') {
        aVal = new Date(aVal);
        bVal = new Date(bVal);
      }
      
      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
    
    setFilteredLeads(updated);
    setCurrentPage(1);
  }, [search, filterStatus, leads, sortBy, sortDirection, leadFields]);

  // Pagination
  const totalPages = Math.ceil(filteredLeads.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentLeads = filteredLeads.slice(startIndex, endIndex);

  const handleRowClick = (id) => {
    navigate(`/lead/${id}`);
  };

  // Updated status options - SIMPLIFIED
  const actualStatuses = [
    'All',
    'Alerts',
    'Hot (80+)',
    'Active (60+)',
    'Cold (<60)'
  ];

  const getStatusCount = (status) => {
    if (status === 'All') return leads.length;
    if (status === 'Alerts') {
      // Only count alerts that aren't hot leads assigned to sales
      return leads.filter(lead => 
        lead.requires_immediate_attention && 
        !(lead.status === 'Hot Lead' && lead.assigned_to_sales_team_id)
      ).length;
    }
    if (status === 'Hot (80+)') return leads.filter(lead => lead.hot_score >= 80).length;
    if (status === 'Active (60+)') return leads.filter(lead => lead.hot_score >= 60).length;
    if (status === 'Cold (<60)') return leads.filter(lead => lead.hot_score < 60).length;
    return 0;
  };

  const getStatusConfig = (status) => {
    const configs = {
      'Alerts': {
        color: 'bg-red-600',
        bgColor: 'bg-red-50',
        textColor: 'text-red-700',
        borderColor: 'border-red-300',
        icon: '🚨'
      },
      'Hot (80+)': {
        color: 'bg-red-500',
        bgColor: 'bg-red-50',
        textColor: 'text-red-700',
        borderColor: 'border-red-200',
        icon: '🔥'
      },
      'Active (60+)': {
        color: 'bg-orange-500',
        bgColor: 'bg-orange-50',
        textColor: 'text-orange-700',
        borderColor: 'border-orange-200',
        icon: '⚡'
      },
      'Cold (<60)': {
        color: 'bg-blue-500',
        bgColor: 'bg-blue-50',
        textColor: 'text-blue-700',
        borderColor: 'border-blue-200',
        icon: '❄️'
      },
      'Hot Lead': { 
        color: 'bg-red-500', 
        bgColor: 'bg-red-50', 
        textColor: 'text-red-700',
        borderColor: 'border-red-200',
        icon: '🔥'
      },
      'Hot': { 
        color: 'bg-red-500', 
        bgColor: 'bg-red-50', 
        textColor: 'text-red-700',
        borderColor: 'border-red-200',
        icon: '🔥'
      },
      'Engaged': {
        color: 'bg-orange-500',
        bgColor: 'bg-orange-50',
        textColor: 'text-orange-700',
        borderColor: 'border-orange-200',
        icon: '💬'
      },
      'Warm': {
        color: 'bg-yellow-500',
        bgColor: 'bg-yellow-50',
        textColor: 'text-yellow-700',
        borderColor: 'border-yellow-200',
        icon: '☀️'
      },
      'Engaging': { 
        color: 'bg-orange-500', 
        bgColor: 'bg-orange-50', 
        textColor: 'text-orange-700',
        borderColor: 'border-orange-200',
        icon: '💬'
      },
      'Responding': { 
        color: 'bg-green-500', 
        bgColor: 'bg-green-50', 
        textColor: 'text-green-700',
        borderColor: 'border-green-200',
        icon: '↩️'
      },
      'Cold Lead': { 
        color: 'bg-blue-500', 
        bgColor: 'bg-blue-50', 
        textColor: 'text-blue-700',
        borderColor: 'border-blue-200',
        icon: '❄️'
      },
      'Cold': { 
        color: 'bg-blue-500', 
        bgColor: 'bg-blue-50', 
        textColor: 'text-blue-700',
        borderColor: 'border-blue-200',
        icon: '❄️'
      },
      'Unsubscribed': { 
        color: 'bg-gray-500', 
        bgColor: 'bg-gray-50', 
        textColor: 'text-gray-700',
        borderColor: 'border-gray-200',
        icon: '🚫'
      }
    };
    return configs[status] || configs['Cold Lead'];
  };

  // Generate CSV headers based on configured fields
  const downloadSampleCSV = () => {
    if (!leadFields || leadFields.length === 0) {
      console.error('No field configuration loaded');
      alert('Field configuration is still loading. Please try again in a moment.');
      return;
    }

    // Helper function to properly escape CSV values
    const escapeCSVValue = (value) => {
      if (value === null || value === undefined) return '';
      const stringValue = value.toString();
      // If the value contains comma, newline, or double quotes, wrap in quotes and escape internal quotes
      if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
        return '"' + stringValue.replace(/"/g, '""') + '"';
      }
      return stringValue;
    };

    // Create headers from the configured fields
    const headers = leadFields.map(field => field.field_label || field.field_name);
    
    // Create a sample row with example data for each field type
    const sampleData = leadFields.map(field => {
      // Provide example data based on field name
      const exampleData = {
        'name': 'John Doe',
        'phone': '+1-555-123-4567',
        'email': 'john.doe@example.com',
        'property_address': '123 Main St, City, State 12345',
        'company_name': 'ABC Company',
        'current_vehicle': '2020 Toyota Camry',
        'salary_expectations': '$50,000-$70,000',
        'budget_range': '$200,000-$300,000',
        'timeline': '3-6 months',
        'status': 'Hot Lead',
        'campaign': 'Q1 Outreach',
        'notes': 'Interested in our services',
        'assigned_to': 'Sales Team'
      };
      
      // Return example data or a placeholder
      return exampleData[field.field_name] || `Example ${field.field_label || field.field_name}`;
    });

    // Create CSV content with properly escaped values
    const csvContent = [
      headers.map(escapeCSVValue).join(','),
      sampleData.map(escapeCSVValue).join(',')
    ].join('\n');

    // Create and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const timestamp = new Date().toISOString().split('T')[0];
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `lead_import_template_${timestamp}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!leadFields || leadFields.length === 0) {
      alert('Field configuration is still loading. Please try again.');
      e.target.value = null;
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        console.log('Parsed CSV data:', results.data);
        
        // Create a mapping of field labels to field names
        const labelToFieldMap = {};
        leadFields.forEach(field => {
          labelToFieldMap[field.field_label] = field.field_name;
          // Also map the field_name to itself in case CSV uses field names
          labelToFieldMap[field.field_name] = field.field_name;
        });

        const records = results.data.map((row, index) => {
          const fields = {};
          
          // For each configured field, try to find matching data in the CSV
          leadFields.forEach(field => {
            // Try to match by field_label first, then field_name
            const value = row[field.field_label] || row[field.field_name] || '';
            fields[field.field_name] = value;
          });

          // Log the mapped record for debugging
          console.log(`Record ${index + 1} mapped:`, fields);
          
          return { fields };
        });

        setParsedRecords(records);
        setFileReady(true);
        setUploadMessage(`Ready to upload ${records.length} leads`);
        setUploadError(false);
      },
      error: (error) => {
        console.error('CSV parsing error:', error);
        setUploadMessage('Error parsing CSV file. Please check the format.');
        setUploadError(true);
      }
    });
  };

  const handleBulkSubmit = async () => {
    try {
      const res = await apiClient.post('/leads/bulk', { records: parsedRecords });
      const { uploaded = 0, skipped = 0, added = 0 } = res.data;
      setUploadMessage(`${uploaded} uploaded. ${skipped} failed. ${added} added.`);
      setUploadError(skipped > 0);
      setFileReady(false);
      setParsedRecords([]);
      await fetchLeads();
    } catch (err) {
      const data = err.response?.data;
      if (data?.uploaded !== undefined) {
        setUploadMessage(`${data.uploaded} uploaded. ${data.skipped} failed. ${data.added} added.`);
        setUploadError(true);
      } else {
        setUploadMessage('Bulk upload failed.');
        setUploadError(true);
      }
    }
  };

  // Get the primary display fields (first few most important ones)
  const getDisplayFields = () => {
    const priorityOrder = ['name', 'phone', 'email', 'property_address', 'company_name', 'current_vehicle'];
    const configuredFields = leadFields.filter(field => 
      !['status', 'campaign', 'created_at'].includes(field.field_name)
    );
    
    // Sort by priority, then by configured order
    const sorted = configuredFields.sort((a, b) => {
      const aIndex = priorityOrder.indexOf(a.field_name);
      const bIndex = priorityOrder.indexOf(b.field_name);
      
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return 0;
    });
    
    // Return first 3-4 most important fields for table display
    return sorted.slice(0, 3); // Reduced to 3 to make room for hot score
  };

  const displayFields = getDisplayFields();

  // Render field value with appropriate formatting
  const renderFieldValue = (lead, field) => {
    const value = lead[field.field_name];
    const Icon = getFieldIcon(field.field_name);
    
    if (!value) return <span className="text-gray-400">—</span>;

    // Special formatting for certain field types
    if (field.field_name === 'phone') {
      return (
        <div className="flex items-center text-sm text-gray-900">
          <Phone size={14} className="mr-2 text-gray-400" />
          {value}
        </div>
      );
    }
    
    if (field.field_name === 'email') {
      return (
        <div className="flex items-center text-sm text-gray-900">
          <Mail size={14} className="mr-2 text-gray-400" />
          {value}
        </div>
      );
    }

    if (field.field_name === 'property_address') {
      return (
        <div className="flex items-center text-sm text-gray-900">
          <MapPin size={14} className="mr-2 text-gray-400" />
          <span className="truncate max-w-xs">{value}</span>
        </div>
      );
    }

    return <span className="text-sm text-gray-900">{value}</span>;
  };

  // Get row styling based on hot score
  const getRowStyling = (lead) => {
    if (lead.hot_score >= 80) {
      return 'border-l-4 border-orange-400 bg-gradient-to-r from-orange-50 to-transparent';
    } else if (lead.hot_score >= 60) {
      return 'border-l-4 border-green-400 bg-gradient-to-r from-green-50 to-transparent';
    } else {
      return 'border-l-4 border-blue-400 bg-gradient-to-r from-blue-50 to-transparent';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800 flex items-center gap-3">
              Surfox Radar
              <div className="flex items-center gap-1">
                <span className="flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                <span className="text-gray-400 text-xs animate-pulse">• • •</span>
              </div>
            </h1>
            <p className="text-sm text-gray-500 mt-1">Real-time signal prioritization. No manual CRM nonsense.</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={downloadSampleCSV}
              className="tour-export flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Download size={16} />
              Export
            </button>
            <div className="relative group">
              <button
                onClick={() => setShowForm(!showForm)}
                className="tour-add-lead w-10 h-10 flex items-center justify-center text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus size={20} />
              </button>
              <div className="absolute bottom-full right-0 mb-2 px-3 py-1 bg-gray-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap">
                Start Manual Engagement
                <div className="absolute top-full right-3 w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-transparent border-t-4 border-t-gray-900"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Lead Form */}
      {showForm && (
        <div className="bg-white border-b border-gray-200 px-6 py-6">
          <div className="max-w-4xl">
            <div className="flex items-center gap-4 mb-6">
             
            </div>
            <AddLead 
              onSuccess={() => {
                fetchLeads();
                setShowForm(false);
              }} 
              onCancel={() => setShowForm(false)}
            />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="p-6">

        {/* Stats Cards - UPDATED */}
        <div className="tour-stats grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          {/* Critical Alerts */}
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 relative group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600 flex items-center gap-2">
                  Critical Alerts
                  <span className="text-xs text-red-500">ⓘ</span>
                  <span className="flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </span>
                </p>
                <p className="text-2xl font-semibold text-red-900">
                  {criticalAlerts.length}
                </p>
                <p className="text-xs text-red-600 mt-1">Need immediate action</p>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <AlertCircle size={20} className="text-red-600 animate-pulse" />
              </div>
            </div>
            {/* Tooltip */}
            <div className="absolute bottom-full left-0 mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <p className="font-semibold mb-1">What are Critical Alerts?</p>
              <p>Leads who have explicitly requested contact:</p>
              <ul className="mt-1 space-y-0.5 text-xs">
                <li>• Agreed to a meeting/call</li>
                <li>• Asked to be contacted</li>
                <li>• Showed buying intent</li>
              </ul>
              <p className="mt-2 font-semibold">Action: Call immediately!</p>
              <div className="absolute top-full left-8 w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-t-8 border-t-gray-900"></div>
            </div>
          </div>
          
          {/* Hot Leads */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 relative group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 flex items-center gap-1">
                  Hot Leads (80+)
                  <span className="text-xs text-gray-400">ⓘ</span>
                </p>
                <p className="text-2xl font-semibold text-gray-900">
                  {leads.filter(l => l.hot_score >= 80).length}
                </p>
                <p className="text-xs text-gray-500 mt-1">Highest quality prospects</p>
              </div>
              <div className="p-3 bg-orange-50 rounded-full">
                <Flame size={20} className="text-orange-600" />
              </div>
            </div>
            {/* Tooltip */}
            <div className="absolute bottom-full left-0 mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <p className="font-semibold mb-1">What is a Hot Lead?</p>
              <p>Leads with engagement scores of 80-100 based on:</p>
              <ul className="mt-1 space-y-0.5 text-xs">
                <li>• Response speed & frequency</li>
                <li>• Positive sentiment</li>
                <li>• Low hesitation</li>
                <li>• Clear intent</li>
              </ul>
              <p className="mt-2">High quality but may not need immediate action.</p>
              <div className="absolute top-full left-8 w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-t-8 border-t-gray-900"></div>
            </div>
          </div>

          {/* Active Leads */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 relative group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 flex items-center gap-1">
                  Active (60+)
                  <span className="text-xs text-gray-400">ⓘ</span>
                </p>
                <p className="text-2xl font-semibold text-gray-900">
                  {leads.filter(l => l.hot_score >= 60).length}
                </p>
                <p className="text-xs text-gray-500 mt-1">Engaged & responding</p>
              </div>
              <div className="p-3 bg-green-50 rounded-full">
                <Activity size={20} className="text-green-600" />
              </div>
            </div>
            {/* Tooltip */}
            <div className="absolute bottom-full left-0 mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <p className="font-semibold mb-1">What is an Active Lead?</p>
              <p>Leads with scores 60+ showing good engagement:</p>
              <ul className="mt-1 space-y-0.5 text-xs">
                <li>• Regular responses</li>
                <li>• Asking questions</li>
                <li>• Positive interactions</li>
              </ul>
              <p className="mt-2">Worth prioritizing for follow-up.</p>
              <div className="absolute top-full left-8 w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-t-8 border-t-gray-900"></div>
            </div>
          </div>

          {/* Total Leads */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Leads</p>
                <p className="text-2xl font-semibold text-gray-900">{leads.length}</p>
                <p className="text-xs text-gray-500 mt-1">All conversations</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-full">
                <Users size={20} className="text-blue-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Search */}
            <div className="tour-search relative flex-1 max-w-md">
              <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search leads..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Status Filters - UPDATED */}
            <div className="tour-filters flex flex-wrap gap-2">
              {actualStatuses.map((status) => {
                const count = getStatusCount(status);
                const isActive = (filterStatus === status || (status === 'All' && filterStatus === null));
                const config = getStatusConfig(status);
                
                return (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status === 'All' ? null : status)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {status !== 'All' && <span>{config.icon}</span>}
                    {status}
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      isActive ? 'bg-white/20 text-white' : 'bg-white text-gray-600'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Leads Table - UPDATED */}
        <div className="tour-leads-table bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Table Header */}
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">
                {filteredLeads.length} Lead{filteredLeads.length !== 1 ? 's' : ''}
                {filterStatus && ` • ${filterStatus}`}
              </h3>
              <div className="flex items-center gap-2">
                <select 
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-lg"
                >
                  <option value={10}>10 per page</option>
                  <option value={25}>25 per page</option>
                  <option value={50}>50 per page</option>
                  <option value={100}>100 per page</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table Content */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Alert
                  </th>
                  {/* Dynamic headers based on configured fields */}
                  {displayFields.map((field) => (
                    <th 
                      key={field.field_name}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {field.field_label}
                    </th>
                  ))}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hot Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Campaign
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentLeads.length === 0 ? (
                  <tr>
                    <td colSpan={displayFields.length + 6} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center">
                        <Users size={48} className="text-gray-300 mb-4" />
                        <p className="text-lg font-medium text-gray-900">No leads found</p>
                        <p className="text-gray-500">
                          {leads.length === 0 
                            ? 'Get started by adding your first lead' 
                            : 'Try adjusting your filters or search term'
                          }
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  currentLeads.map((lead) => {
                    const displayStatus = lead.funnel_stage || lead.status;
                    const statusConfig = getStatusConfig(displayStatus);
                    const rowStyling = getRowStyling(lead);
                    return (
                      <tr 
                        key={lead.id} 
                        className={`hover:bg-gray-50 cursor-pointer transition-colors ${rowStyling}`}
                        onClick={() => handleRowClick(lead.id)}
                      >
                        {/* Alert Indicator */}
                        <td className="px-6 py-4">
                          {lead.requires_immediate_attention && !(lead.status === 'Hot Lead' && lead.assigned_to_sales_team_id) ? (
                            <div className="flex items-center gap-2">
                              <span className="flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                              </span>
                              {lead.alert_priority === 'critical' && (
                                <span className="text-xs text-red-600 font-medium">!</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        
                        {/* Dynamic columns based on configured fields */}
                        {displayFields.map((field) => (
                          <td key={field.field_name} className="px-6 py-4">
                            {renderFieldValue(lead, field)}
                          </td>
                        ))}
                        
                        {/* Hot Score */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{lead.hot_score || 0}</span>
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full transition-all ${
                                  lead.hot_score >= 80 ? 'bg-red-500' :
                                  lead.hot_score >= 60 ? 'bg-orange-500' :
                                  lead.hot_score >= 40 ? 'bg-yellow-500' : 'bg-blue-500'
                                }`}
                                style={{ width: `${Math.min(lead.hot_score || 0, 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        
                        {/* Status */}
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${statusConfig.bgColor} ${statusConfig.textColor} ${statusConfig.borderColor}`}>
                            <span>{statusConfig.icon}</span>
                            {displayStatus}
                          </span>
                        </td>
                        
                        {/* Campaign */}
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-900">
                            {lead.campaign || '—'}
                          </span>
                        </td>
                        
                        {/* Created */}
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-500">
                            {new Date(lead.created_at).toLocaleDateString()}
                          </span>
                        </td>
                        
                        {/* Actions */}
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {lead.requires_immediate_attention && !(lead.status === 'Hot Lead' && lead.assigned_to_sales_team_id) && lead.phone && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.location.href = `tel:${lead.phone}`;
                                }}
                                className="p-1 bg-green-100 text-green-600 rounded hover:bg-green-200"
                                title="Call Now"
                              >
                                <Phone size={14} />
                              </button>
                            )}
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRowClick(lead.id);
                              }}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <Eye size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredLeads.length)} of {filteredLeads.length} results
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1 text-sm">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Product Tour Component */}
      <ProductTour />
    </div>
  );
}