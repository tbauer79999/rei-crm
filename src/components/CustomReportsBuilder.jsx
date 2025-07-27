import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getFeatureValue } from '../lib/plans';
import { callEdgeFunction } from '../lib/edgeFunctionAuth';
import { 
  Plus, 
  Download, 
  Calendar, 
  Layout, 
  BarChart3, 
  Users, 
  TrendingUp, 
  DollarSign,
  Target,
  Activity,
  FileText,
  Mail,
  Clock,
  Save,
  Eye,
  Trash2,
  GripVertical,
  Settings,
  ChevronDown,
  Filter,
  X,
  Lock,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

// Edge Function URL - Unified analytics endpoint
const buildApiUrl = (component, tenantId, period = '30days') => {
  return `https://wuuqrdlfgkasnwydyvgk.supabase.co/functions/v1/sync_sales_metrics?action=fetch&component=${component}&tenant_id=${tenantId}&period=${period}`;
};

const CustomReportsBuilder = () => {
  const { user, currentPlan } = useAuth();
  
  // Get access level from plan
  const controlRoomAccess = getFeatureValue(currentPlan, 'aiControlRoomAccess');
  const canAccessDetailedAnalytics = controlRoomAccess === 'full' || controlRoomAccess === 'team_metrics';

  // Component state
  const [activeView, setActiveView] = useState('builder'); // builder, templates, saved
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [reportConfig, setReportConfig] = useState({
    name: '',
    description: '',
    dateRange: '30days',
    sections: [],
    schedule: null
  });
  const [draggedItem, setDraggedItem] = useState(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  
  // Data state
  const [reportData, setReportData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastFetch, setLastFetch] = useState(null);

  // Available report sections with API mapping
  const reportSections = [
    {
      id: 'executive-summary',
      name: 'Executive Summary',
      description: 'High-level KPIs and performance overview',
      icon: BarChart3,
      type: 'summary',
      apiComponent: 'overview',
      preview: 'Key metrics, conversion rates, ROI summary',
      requiresAccess: false
    },
    {
      id: 'campaign-performance',
      name: 'Campaign Performance',
      description: 'Detailed campaign metrics and comparison',
      icon: Target,
      type: 'table',
      apiComponent: 'campaign_performance',
      preview: 'Campaign names, leads, conversions, costs',
      requiresAccess: true
    },
    {
      id: 'lead-funnel',
      name: 'Lead Funnel Analysis',
      description: 'Conversion funnel with stage breakdown',
      icon: TrendingUp,
      type: 'funnel',
      apiComponent: 'lead_journey',
      preview: 'Funnel stages, conversion rates, drop-off points',
      requiresAccess: false
    },
    {
      id: 'team-performance',
      name: 'Sales Team Performance',
      description: 'Individual and team performance metrics',
      icon: Users,
      type: 'table',
      apiComponent: 'team_performance',
      preview: 'Rep names, handoffs, conversions, pipeline value',
      requiresAccess: true
    },
    {
      id: 'roi-analysis',
      name: 'ROI Analysis',
      description: 'Return on investment by source and campaign',
      icon: DollarSign,
      type: 'table',
      apiComponent: 'roi_analysis',
      preview: 'Lead sources, costs, revenue, ROI percentages',
      requiresAccess: true
    },
    {
      id: 'ai-insights',
      name: 'AI Performance Insights',
      description: 'AI conversation metrics and optimization data',
      icon: Activity,
      type: 'insights',
      apiComponent: 'ai_optimization',
      preview: 'Response rates, conversation quality, optimization tips',
      requiresAccess: true
    }
  ];

  // Pre-built templates
  const templates = [
    {
      id: 'executive-overview',
      name: 'Executive Overview',
      description: 'High-level performance summary for leadership',
      sections: ['executive-summary', 'roi-analysis', 'lead-funnel'],
      icon: FileText,
      requiresAccess: true
    },
    {
      id: 'sales-performance',
      name: 'Sales Performance Report',
      description: 'Detailed sales team and campaign analysis',
      sections: ['campaign-performance', 'team-performance', 'lead-funnel'],
      icon: Users,
      requiresAccess: true
    },
    {
      id: 'operational-deep-dive',
      name: 'Operational Deep Dive',
      description: 'Comprehensive operational metrics and AI insights',
      sections: ['executive-summary', 'campaign-performance', 'ai-insights', 'roi-analysis'],
      icon: BarChart3,
      requiresAccess: true
    },
    {
      id: 'basic-overview',
      name: 'Basic Overview',
      description: 'Essential metrics for all users',
      sections: ['executive-summary', 'lead-funnel'],
      icon: BarChart3,
      requiresAccess: false
    }
  ];

  // Check if user can access a section
  const canAccessSection = (section) => {
    if (!section.requiresAccess) return true;
    return canAccessDetailedAnalytics;
  };

  // Check if user can access a template
  const canAccessTemplate = (template) => {
    if (!template.requiresAccess) return true;
    return canAccessDetailedAnalytics;
  };

  // Fetch data for a specific component
  const fetchComponentData = async (component, period = '30days') => {
    if (!user?.tenant_id) {
      throw new Error('No tenant ID available');
    }

    const apiUrl = buildApiUrl(component, user.tenant_id, period);
    console.log(`🔍 Fetching data for ${component}:`, apiUrl);
    
    const data = await callEdgeFunction(apiUrl);
    
    if (data.error) {
      throw new Error(data.error.details || data.error || 'API returned an error');
    }
    
    return data;
  };

  // Fetch all data for current report sections
  const fetchReportData = async () => {
    if (!user?.tenant_id || reportConfig.sections.length === 0) {
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const dataPromises = reportConfig.sections.map(async (section) => {
        if (!canAccessSection(section)) {
          return { [section.id]: { error: 'Access restricted' } };
        }
        
        try {
          const data = await fetchComponentData(section.apiComponent, reportConfig.dateRange);
          return { [section.id]: data };
        } catch (error) {
          console.error(`Error fetching ${section.id}:`, error);
          return { [section.id]: { error: error.message } };
        }
      });

      const results = await Promise.all(dataPromises);
      const newReportData = results.reduce((acc, result) => ({ ...acc, ...result }), {});
      
      setReportData(newReportData);
      setLastFetch(new Date());
      console.log('✅ Report data fetched:', newReportData);
      
    } catch (error) {
      console.error('❌ Error fetching report data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch data when sections or date range changes
  useEffect(() => {
    if (reportConfig.sections.length > 0) {
      fetchReportData();
    }
  }, [reportConfig.sections, reportConfig.dateRange, user?.tenant_id]);

  // Handle section access check
  const handleSectionAdd = (section) => {
    if (!canAccessSection(section)) {
      setShowUpgradePrompt(true);
      return;
    }
    
    if (!reportConfig.sections.find(s => s.id === section.id)) {
      setReportConfig(prev => ({
        ...prev,
        sections: [...prev.sections, section]
      }));
    }
  };

  // Handle template access check
  const handleTemplateSelect = (template) => {
    if (!canAccessTemplate(template)) {
      setShowUpgradePrompt(true);
      return;
    }
    
    applyTemplate(template);
  };

  const handleDragStart = (e, section) => {
    setDraggedItem(section);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (draggedItem) {
      handleSectionAdd(draggedItem);
    }
    setDraggedItem(null);
  };

  const removeSection = (sectionId) => {
    setReportConfig(prev => ({
      ...prev,
      sections: prev.sections.filter(s => s.id !== sectionId)
    }));
  };

  const moveSection = (fromIndex, toIndex) => {
    const newSections = [...reportConfig.sections];
    const [removed] = newSections.splice(fromIndex, 1);
    newSections.splice(toIndex, 0, removed);
    setReportConfig(prev => ({ ...prev, sections: newSections }));
  };

  const applyTemplate = (template) => {
    const templateSections = template.sections
      .map(sectionId => reportSections.find(s => s.id === sectionId))
      .filter(Boolean)
      .filter(section => canAccessSection(section)); // Only include accessible sections
    
    setReportConfig(prev => ({
      ...prev,
      name: template.name,
      description: template.description,
      sections: templateSections
    }));
    setSelectedTemplate(template.id);
    setActiveView('builder');
  };

  // Upgrade Prompt Component
  const UpgradePrompt = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
        onClick={() => setShowUpgradePrompt(false)}
      />
      
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md m-4 overflow-hidden">
        <div className="p-6 text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Advanced Reports Require Upgrade
          </h3>
          <p className="text-gray-600 mb-6">
            Unlock detailed analytics sections and advanced reporting features with a plan upgrade.
          </p>
          <div className="space-y-2 text-sm text-gray-500 mb-6">
            <p>✓ Advanced analytics sections</p>
            <p>✓ Detailed performance metrics</p>
            <p>✓ ROI and team analysis</p>
            <p>✓ AI optimization insights</p>
          </div>
          <button 
            onClick={() => setShowUpgradePrompt(false)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors mb-3"
          >
            Upgrade to Growth Plan
          </button>
          <p className="text-xs text-gray-500">
            Starting at $397/month
          </p>
          <button 
            onClick={() => setShowUpgradePrompt(false)}
            className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
      </div>
    </div>
  );

  // Render section preview with real data
  const renderSectionPreview = (section, data) => {
    if (!data) {
      return (
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-center h-20 text-gray-500">
            <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
            Loading data...
          </div>
        </div>
      );
    }

    if (data.error) {
      return (
        <div className="bg-white rounded-lg p-4 border border-red-200">
          <div className="flex items-center text-red-600">
            <AlertCircle className="w-4 h-4 mr-2" />
            {data.error === 'Access restricted' ? 'Upgrade required for this section' : `Error: ${data.error}`}
          </div>
        </div>
      );
    }

    // Render preview based on section type and real data
    return (
      <div className="bg-white rounded-lg p-4 border border-gray-200">
        {section.type === 'summary' && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">{data.totalLeads || 0}</div>
              <div className="text-gray-600">Total Leads</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">{data.hotLeadRate || '0%'}</div>
              <div className="text-gray-600">Hot Lead Rate</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-purple-600">{data.replyRate || '0%'}</div>
              <div className="text-gray-600">Reply Rate</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-orange-600">{data.activeLeads || 0}</div>
              <div className="text-gray-600">Active Leads</div>
            </div>
          </div>
        )}
        
        {section.type === 'table' && (
          <div className="space-y-2">
            <div className="grid grid-cols-4 gap-2 text-xs font-medium text-gray-600">
              <div className="bg-gray-50 p-2 rounded">Name</div>
              <div className="bg-gray-50 p-2 rounded">Leads</div>
              <div className="bg-gray-50 p-2 rounded">Conversions</div>
              <div className="bg-gray-50 p-2 rounded">Rate</div>
            </div>
            {data.campaigns && data.campaigns.slice(0, 3).map((item, i) => (
              <div key={i} className="grid grid-cols-4 gap-2 text-xs">
                <div className="p-2">{item.name || `Item ${i + 1}`}</div>
                <div className="p-2">{item.totalLeads || 0}</div>
                <div className="p-2">{item.hotLeads || 0}</div>
                <div className="p-2">{item.conversionRate || '0%'}</div>
              </div>
            ))}
          </div>
        )}
        
        {section.type === 'funnel' && (
          <div className="space-y-2">
            {data.funnelData && data.funnelData.slice(0, 4).map((stage, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-sm">{stage.stage || stage.name}</span>
                <span className="font-medium">{stage.count || stage.value} ({stage.rate || '0%'})</span>
              </div>
            ))}
          </div>
        )}
        
        {section.type === 'insights' && (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Sentiment: Positive</span>
              <span className="font-medium">{data.sentimentBreakdown?.positive || 0}%</span>
            </div>
            <div className="flex justify-between">
              <span>Avg. Time to Hot</span>
              <span className="font-medium">{data.timeToHot?.avgTimeHours || 0}h</span>
            </div>
            <div className="flex justify-between">
              <span>Manual Overrides</span>
              <span className="font-medium">{data.manualOverrides?.thisMonth || 0}</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  const TemplatesView = () => (
    <div className="space-y-6">
      <div className="text-center py-8">
        <Layout className="w-16 h-16 mx-auto text-blue-600 mb-4" />
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Choose a Report Template</h3>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Start with a professionally designed template, then customize to your needs
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {templates.map((template) => {
          const isAccessible = canAccessTemplate(template);
          return (
            <div
              key={template.id}
              className={`bg-white rounded-2xl border border-gray-200 p-6 transition-all duration-300 relative ${
                isAccessible 
                  ? 'hover:shadow-lg cursor-pointer group' 
                  : 'opacity-60 cursor-not-allowed'
              }`}
              onClick={() => handleTemplateSelect(template)}
            >
              {!isAccessible && (
                <div className="absolute top-2 right-2">
                  <Lock className="w-4 h-4 text-gray-400" />
                </div>
              )}
              
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center transition-colors ${
                  isAccessible ? 'group-hover:bg-blue-100' : ''
                }`}>
                  <template.icon className="w-6 h-6 text-blue-600" />
                </div>
                <div className="text-sm text-gray-500">
                  {template.sections.length} sections
                </div>
              </div>
              
              <h4 className="text-lg font-semibold text-gray-900 mb-2">{template.name}</h4>
              <p className="text-gray-600 text-sm mb-4">{template.description}</p>
              
              <div className="space-y-2">
                {template.sections.slice(0, 3).map((sectionId) => {
                  const section = reportSections.find(s => s.id === sectionId);
                  const sectionAccessible = section ? canAccessSection(section) : false;
                  return (
                    <div key={sectionId} className="flex items-center text-xs">
                      <div className={`w-1.5 h-1.5 rounded-full mr-2 ${
                        sectionAccessible ? 'bg-blue-400' : 'bg-gray-300'
                      }`} />
                      <span className={sectionAccessible ? 'text-gray-500' : 'text-gray-400'}>
                        {section?.name}
                      </span>
                      {!sectionAccessible && <Lock className="w-3 h-3 ml-1 text-gray-400" />}
                    </div>
                  );
                })}
                {template.sections.length > 3 && (
                  <div className="text-xs text-gray-400">
                    +{template.sections.length - 3} more sections
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-center pt-8">
        <button
          onClick={() => setActiveView('builder')}
          className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
        >
          Or start from scratch
        </button>
      </div>
    </div>
  );

  const BuilderView = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left Panel - Configuration */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-2xl border border-gray-200 p-6 sticky top-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Report Configuration</h3>
          
          {/* Basic Info */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Report Name</label>
              <input
                type="text"
                value={reportConfig.name}
                onChange={(e) => setReportConfig(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Monthly Executive Summary"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                value={reportConfig.description}
                onChange={(e) => setReportConfig(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of this report..."
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
              <select
                value={reportConfig.dateRange}
                onChange={(e) => setReportConfig(prev => ({ ...prev, dateRange: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
                <option value="60days">Last 60 Days</option>
                <option value="90days">Last 90 Days</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>
          </div>

          {/* Available Sections */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Available Sections</h4>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {reportSections.map((section) => {
                const isAdded = reportConfig.sections.find(s => s.id === section.id);
                const hasAccess = canAccessSection(section);
                
                return (
                  <div
                    key={section.id}
                    draggable={!isAdded && hasAccess}
                    onDragStart={(e) => hasAccess && handleDragStart(e, section)}
                    onDragEnd={() => setDraggedItem(null)}
                    className={`p-3 rounded-lg border border-gray-200 transition-all relative ${
                      isAdded 
                        ? 'bg-gray-50 opacity-50 cursor-not-allowed' 
                        : hasAccess
                          ? 'bg-white hover:border-blue-300 cursor-grab active:cursor-grabbing hover:shadow-md'
                          : 'bg-gray-50 opacity-60 cursor-not-allowed'
                    }`}
                    onClick={() => !isAdded && handleSectionAdd(section)}
                  >
                    {!hasAccess && (
                      <div className="absolute top-2 right-2">
                        <Lock className="w-4 h-4 text-gray-400" />
                      </div>
                    )}
                    
                    <div className="flex items-start space-x-3">
                      <section.icon className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900">{section.name}</div>
                        <div className="text-xs text-gray-500 mt-1">{section.description}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={() => fetchReportData()}
              disabled={loading || reportConfig.sections.length === 0}
              className="w-full flex items-center justify-center px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Refreshing Data...' : 'Refresh Data'}
            </button>
            
            <button
              onClick={() => setShowScheduleModal(true)}
              className="w-full flex items-center justify-center px-4 py-2 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Schedule Report
            </button>
            
            <div className="grid grid-cols-2 gap-3">
              <button className="flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                <Save className="w-4 h-4 mr-2" />
                Save
              </button>
              <button className="flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                <Eye className="w-4 h-4 mr-2" />
                Preview
              </button>
            </div>
          </div>
          
          {lastFetch && (
            <div className="mt-4 text-xs text-gray-500 text-center">
              Last updated: {lastFetch.toLocaleTimeString()}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Report Builder */}
      <div className="lg:col-span-2">
        <div className="bg-white rounded-2xl border border-gray-200 min-h-[600px]">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {reportConfig.name || 'Untitled Report'}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {reportConfig.description || 'Drag sections from the left panel to build your report'}
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <div className="text-sm text-gray-500">
                  {reportConfig.sections.length} sections
                </div>
                {error && (
                  <div className="flex items-center text-red-600 text-sm">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    Error
                  </div>
                )}
                <div className="flex items-center space-x-2">
                  <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
                    <Download className="w-4 h-4" />
                  </button>
                  <div className="relative">
                    <button className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                      <Download className="w-4 h-4 mr-2" />
                      Export
                      <ChevronDown className="w-4 h-4 ml-2" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={`p-6 min-h-[500px] transition-colors ${
              draggedItem ? 'bg-blue-50 border-2 border-dashed border-blue-300' : ''
            }`}
          >
            {reportConfig.sections.length === 0 ? (
              <div className={`text-center py-20 rounded-xl transition-colors ${
                draggedItem 
                  ? 'border-2 border-dashed border-blue-400 bg-blue-50' 
                  : 'border-2 border-dashed border-gray-300'
              }`}>
                <Layout className={`w-16 h-16 mx-auto mb-4 ${
                  draggedItem ? 'text-blue-500' : 'text-gray-400'
                }`} />
                <h4 className={`text-lg font-medium mb-2 ${
                  draggedItem ? 'text-blue-900' : 'text-gray-900'
                }`}>
                  {draggedItem ? `Drop "${draggedItem.name}" here` : 'Start Building Your Report'}
                </h4>
                <p className={`mb-6 ${
                  draggedItem ? 'text-blue-700' : 'text-gray-600'
                }`}>
                  {draggedItem 
                    ? 'Release to add this section to your report'
                    : 'Drag sections from the left panel to create your custom report'
                  }
                </p>
                {!draggedItem && (
                  <button
                    onClick={() => setActiveView('templates')}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Or choose a template
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {reportConfig.sections.map((section, index) => (
                  <div
                    key={`${section.id}-${index}`}
                    className="bg-gray-50 rounded-xl border border-gray-200 p-6 group"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <GripVertical className="w-5 h-5 text-gray-400 cursor-move" />
                        <section.icon className="w-5 h-5 text-blue-600" />
                        <div>
                          <h4 className="font-medium text-gray-900">{section.name}</h4>
                          <p className="text-sm text-gray-600">{section.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg">
                          <Settings className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => removeSection(section.id)}
                          className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    {/* Section Preview with Real Data */}
                    {renderSectionPreview(section, reportData[section.id])}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const SavedReportsView = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-gray-900">Saved Reports</h3>
          <p className="text-gray-600 mt-1">Manage your saved report configurations</p>
        </div>
        <button
          onClick={() => setActiveView('templates')}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Report
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Example saved reports */}
        {[
          { name: 'Monthly Executive Summary', lastRun: '2 days ago', sections: 4, scheduled: true },
          { name: 'Weekly Sales Performance', lastRun: '1 week ago', sections: 3, scheduled: true },
          { name: 'Q4 Campaign Analysis', lastRun: '3 days ago', sections: 5, scheduled: false }
        ].map((report, index) => (
          <div key={index} className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <FileText className="w-8 h-8 text-blue-600" />
              <div className="flex items-center space-x-2">
                {report.scheduled && (
                  <div className="w-2 h-2 bg-green-500 rounded-full" title="Scheduled" />
                )}
                <button className="text-gray-400 hover:text-gray-600">
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <h4 className="font-semibold text-gray-900 mb-2">{report.name}</h4>
            <div className="space-y-1 text-sm text-gray-600 mb-4">
              <div>{report.sections} sections</div>
              <div>Last run: {report.lastRun}</div>
            </div>
            
            <div className="flex items-center space-x-2">
              <button className="flex-1 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 text-sm">
                Run Now
              </button>
              <button className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200">
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Schedule Modal Component
  const ScheduleModal = () => {
    if (!showScheduleModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-6 w-full max-w-md">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Schedule Report</h3>
            <button
              onClick={() => setShowScheduleModal(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Frequency</label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                <option>Daily</option>
                <option>Weekly</option>
                <option>Monthly</option>
                <option>Quarterly</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email Recipients</label>
              <input
                type="email"
                placeholder="email@company.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center space-x-3 mt-6">
            <button
              onClick={() => setShowScheduleModal(false)}
              className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={() => setShowScheduleModal(false)}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Schedule
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Show access denied if no analytics access
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <Lock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Please Log In</h3>
          <p className="text-gray-600">You need to be logged in to create custom reports.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Custom Reports</h1>
            <p className="text-gray-600 mt-1">Create professional reports with real-time data</p>
          </div>
          
          {/* Navigation */}
          <div className="flex items-center space-x-1 bg-gray-100 rounded-xl p-1">
            {[
              { id: 'templates', label: 'Templates', icon: Layout },
              { id: 'builder', label: 'Builder', icon: Settings },
              { id: 'saved', label: 'Saved', icon: FileText }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveView(tab.id)}
                className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeView === tab.id
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <tab.icon className="w-4 h-4 mr-2" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center text-red-600">
              <AlertCircle className="w-5 h-5 mr-2" />
              <span className="font-medium">Error loading report data:</span>
            </div>
            <p className="text-red-600 text-sm mt-1">{error}</p>
          </div>
        )}
        
        {activeView === 'templates' && <TemplatesView />}
        {activeView === 'builder' && <BuilderView />}
        {activeView === 'saved' && <SavedReportsView />}
      </div>

      <ScheduleModal />
      {showUpgradePrompt && <UpgradePrompt />}
    </div>
  );
};

export default CustomReportsBuilder;