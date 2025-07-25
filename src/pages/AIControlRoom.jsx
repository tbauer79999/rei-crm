import React, { useState, useEffect } from 'react';
import { 
  ChevronDown, 
  ChevronRight, 
  Activity, 
  Users, 
  TrendingUp, 
  Brain,
  CheckCircle,
  AlertTriangle,
  Clock,
  Lock,
  BarChart3,
  Smartphone,
  Monitor,
  Eye,
  EyeOff
} from 'lucide-react';
import clsx from 'clsx';
import OverviewMetrics from '../components/controlroom/OverviewMetrics';
import OverviewTrendAndCost from '../components/controlroom/OverviewTrendAndCost';
import LeadJourneyFunnel from '../components/controlroom/LeadJourneyFunnel';
import AiOptimizationPanel from '../components/controlroom/AiOptimizationPanel';
import HotLeadHandoffPanel from '../components/controlroom/HotLeadHandoffPanel';
import { fetchHealth, fetchHotSummary } from '../lib/api';
import { getFeatureValue } from '../lib/plans';
import { useAuth } from '../context/AuthContext';
import supabase from '../lib/supabaseClient';

const SECTIONS = [
  { 
    id: 'overview', 
    label: 'Overview & Health',
    shortLabel: 'Overview',
    description: 'System performance, lead counts, and key metrics',
    shortDescription: 'Performance & metrics',
    icon: Activity,
    status: 'healthy',
    metrics: '24 hot leads today',
    priority: 'high'
  },
  { 
    id: 'handoff', 
    label: 'Hot Lead Handoff',
    shortLabel: 'Handoff',
    description: 'Sales team notifications and response tracking',
    shortDescription: 'Sales notifications',
    icon: Users,
    status: 'attention',
    metrics: 'Avg response: 12m',
    priority: 'high'
  },
  { 
    id: 'journey', 
    label: 'Lead Journey & Funnel',
    shortLabel: 'Journey',
    description: 'Conversion rates and pipeline analytics',
    shortDescription: 'Pipeline analytics',
    icon: TrendingUp,
    status: 'healthy',
    metrics: '18% conversion rate',
    priority: 'medium'
  },
  { 
    id: 'optimization', 
    label: 'AI Optimization',
    shortLabel: 'AI Optimize',
    description: 'Message analysis, keywords, and conversation insights',
    shortDescription: 'AI insights',
    icon: Brain,
    status: 'healthy',
    metrics: '89% AI accuracy',
    priority: 'medium'
  },
];

const getStatusConfig = (status) => {
  switch (status) {
    case 'healthy':
      return {
        icon: CheckCircle,
        color: 'text-green-500',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        dotColor: 'bg-green-400'
      };
    case 'attention':
      return {
        icon: AlertTriangle,
        color: 'text-orange-500',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        dotColor: 'bg-orange-400'
      };
    case 'review':
      return {
        icon: Clock,
        color: 'text-blue-500',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        dotColor: 'bg-blue-400'
      };
    default:
      return {
        icon: CheckCircle,
        color: 'text-gray-500',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200',
        dotColor: 'bg-gray-400'
      };
  }
};

// Mobile Section Card Component
const MobileSectionCard = ({ 
  section, 
  status, 
  metrics, 
  statusConfig, 
  statusReason, 
  isExpanded, 
  onToggle, 
  children 
}) => {
  const StatusIcon = statusConfig.icon;
  
  return (
    <div className={clsx(
      "bg-white rounded-xl shadow-sm border transition-all duration-200 w-full min-w-0",
      statusConfig.borderColor,
      isExpanded ? "shadow-md" : "hover:shadow-md"
    )}>
      {/* Mobile Header */}
      <button
        onClick={onToggle}
        className="w-full min-w-0 p-3 text-left hover:bg-gray-50/50 transition-colors rounded-xl"
      >
        <div className="flex items-center justify-between w-full min-w-0">
          <div className="flex items-center space-x-2 min-w-0 flex-1">
            {/* Icon */}
            <div className={clsx(
              "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0",
              statusConfig.bgColor
            )}>
              <section.icon className={clsx("w-3.5 h-3.5", statusConfig.color)} />
            </div>
            
            {/* Content */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center space-x-1.5 mb-0.5">
                <h3 className="font-semibold text-gray-900 text-sm truncate">
                  {section.shortLabel}
                </h3>
                <div className="flex items-center space-x-1 flex-shrink-0">
                  <div className={clsx("w-1.5 h-1.5 rounded-full", statusConfig.dotColor)} />
                  <span className={clsx("text-xs font-medium capitalize", statusConfig.color)}>
                    {status}
                  </span>
                </div>
              </div>
              
              <p className="text-xs text-gray-500 truncate mb-0.5">
                {section.shortDescription}
              </p>
              
              <div className="text-xs text-gray-400 font-medium truncate">
                {metrics}
              </div>
            </div>
          </div>
          
          {/* Expand/Collapse Indicator */}
          <div className="ml-2 flex-shrink-0">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-400" />
            )}
          </div>
        </div>
      </button>
      
      {/* Expandable Content */}
      {isExpanded && (
        <div className="border-t border-gray-100 w-full min-w-0">
          <div className="p-3 w-full min-w-0">
            {/* Full Description on Expand */}
            <div className="mb-3 p-2.5 bg-gray-50 rounded-lg w-full min-w-0">
              <h4 className="font-medium text-gray-900 text-sm mb-1 break-words">{section.label}</h4>
              <p className="text-xs text-gray-600 break-words">{section.description}</p>
              {statusReason && (
                <p className="text-xs text-gray-500 mt-2 font-mono break-all overflow-wrap-anywhere">{statusReason}</p>
              )}
            </div>
            
            {/* Component Content */}
            <div className="w-full min-w-0">
              {children}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Desktop Section Component (Original Layout)
const DesktopSectionCard = ({ 
  section, 
  status, 
  metrics, 
  statusConfig, 
  statusReason, 
  isExpanded, 
  onToggle, 
  children 
}) => {
  const StatusIcon = statusConfig.icon;
  
  return (
    <div className={clsx(
      "control-room-section bg-white rounded-2xl shadow-sm border transition-all duration-200 hover:shadow-md",
      statusConfig.borderColor
    )}>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-gray-50/50 transition-colors rounded-2xl"
      >
        <div className="flex items-center space-x-4 flex-1">
          {/* Section Icon */}
          <div className={clsx(
            "w-12 h-12 rounded-xl flex items-center justify-center",
            statusConfig.bgColor
          )}>
            <section.icon className={clsx("w-6 h-6", statusConfig.color)} />
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-3 mb-1">
              <h3 className="text-lg font-semibold text-gray-900">{section.label}</h3>
              <div 
                className="flex items-center space-x-1 cursor-help"
                title={statusReason || `Status: ${status}`}
              >
                <StatusIcon className={clsx("w-4 h-4", statusConfig.color)} />
                <span className={clsx("text-xs font-medium capitalize", statusConfig.color)}>
                  {status}
                </span>
              </div>
            </div>
            <p className="text-sm text-gray-500 mb-1">{section.description}</p>
            <span className="text-xs text-gray-400 font-medium">{metrics}</span>
          </div>
        </div>
        <div className="ml-4">
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </button>
      
      {/* Section Content */}
      <div
        className={clsx(
          'transition-all duration-300 ease-in-out',
          isExpanded 
            ? 'opacity-100 overflow-visible' 
            : 'max-h-0 opacity-0 overflow-hidden'
        )}
      >
        <div className="px-6 pb-6 border-t border-gray-100">
          <div className="pt-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

// Status Summary Bar for Mobile
const MobileStatusBar = ({ sections, sectionStatuses, sectionMetrics }) => {
  const healthyCount = sections.filter(s => (sectionStatuses[s.id] || s.status) === 'healthy').length;
  const attentionCount = sections.filter(s => (sectionStatuses[s.id] || s.status) === 'attention').length;
  const reviewCount = sections.filter(s => (sectionStatuses[s.id] || s.status) === 'review').length;
  
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3 mb-3 w-full min-w-0">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-gray-900 text-sm truncate flex-1">System Status</h2>
        <div className="flex items-center space-x-1 flex-shrink-0">
          <BarChart3 className="w-4 h-4 text-gray-500" />
          <span className="text-xs text-gray-500">Live</span>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-2 w-full">
        <div className="text-center min-w-0">
          <div className="w-6 h-6 bg-green-50 rounded-lg flex items-center justify-center mx-auto mb-1">
            <CheckCircle className="w-3 h-3 text-green-500" />
          </div>
          <div className="text-base font-bold text-green-600">{healthyCount}</div>
          <div className="text-xs text-gray-500 truncate">Healthy</div>
        </div>
        
        <div className="text-center min-w-0">
          <div className="w-6 h-6 bg-orange-50 rounded-lg flex items-center justify-center mx-auto mb-1">
            <AlertTriangle className="w-3 h-3 text-orange-500" />
          </div>
          <div className="text-base font-bold text-orange-600">{attentionCount}</div>
          <div className="text-xs text-gray-500 truncate">Attention</div>
        </div>
        
        <div className="text-center min-w-0">
          <div className="w-6 h-6 bg-blue-50 rounded-lg flex items-center justify-center mx-auto mb-1">
            <Clock className="w-3 h-3 text-blue-500" />
          </div>
          <div className="text-base font-bold text-blue-600">{reviewCount}</div>
          <div className="text-xs text-gray-500 truncate">Review</div>
        </div>
      </div>
    </div>
  );
};

// Quick Actions for Mobile
const MobileQuickActions = ({ onExpandAll, onCollapseAll, allExpanded }) => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3 mb-3 w-full min-w-0">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-gray-900 text-sm truncate flex-1">Quick Actions</h3>
        <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
          <button
            onClick={onExpandAll}
            disabled={allExpanded}
            className="flex items-center space-x-1 px-2 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Eye className="w-3 h-3" />
            <span className="hidden xs:inline">Expand</span>
          </button>
          
          <button
            onClick={onCollapseAll}
            disabled={!allExpanded}
            className="flex items-center space-x-1 px-2 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <EyeOff className="w-3 h-3" />
            <span className="hidden xs:inline">Collapse</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// Mobile Header Component
const MobileHeader = () => {
  return (
    <div className="lg:hidden mb-3 w-full min-w-0">
      <div className="bg-white rounded-xl border border-gray-200 p-3">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <Brain className="w-4 h-4 text-blue-600" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-bold text-gray-900 truncate">AI Control Room</h1>
            <p className="text-xs text-gray-600 truncate">Monitor your AI pipeline</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const AIControlRoom = () => {
  const { currentPlan } = useAuth();
  const [collapsed, setCollapsed] = useState({});
  const [sectionStatuses, setSectionStatuses] = useState({});
  const [sectionMetrics, setSectionMetrics] = useState({});
  const [statusReasons, setStatusReasons] = useState({});
  const [ready, setReady] = useState(false);
  const [viewMode, setViewMode] = useState('responsive'); // 'mobile', 'desktop', 'responsive'

  console.log('🎛️ AI Control Room - Plan:', currentPlan);

  // Auto-detect screen size for responsive mode
  useEffect(() => {
    const handleResize = () => {
      if (viewMode === 'responsive') {
        // No need to update state, just rely on CSS classes
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [viewMode]);

  useEffect(() => {
    document.title = "Control Room – SurFox";
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('controlroom-collapse');
    if (saved) {
      setCollapsed(JSON.parse(saved));
    } else {
      const defaultState = {};
      SECTIONS.forEach(section => {
        defaultState[section.id] = false;
      });
      setCollapsed(defaultState);
    }

    const fetchOverviewStatus = async () => {
      try {
        const data = await fetchHealth();
        
        const status = data.totalLeads > 0 ? 'healthy' : 'attention';
        const message = `${data.weeklyLeads} leads this week`;
        
        setSectionStatuses(prev => ({
          ...prev,
          overview: status
        }));

        setSectionMetrics(prev => ({
          ...prev,
          overview: message
        }));

        setStatusReasons(prev => ({
          ...prev,
          overview: `Total: ${data.totalLeads}, Active: ${data.activeLeads}, Hot rate: ${data.hotLeadRate}%`
        }));
      } catch (err) {
        console.error('Error fetching overview status:', err);
        setSectionStatuses(prev => ({ ...prev, overview: 'attention' }));
        setSectionMetrics(prev => ({ ...prev, overview: 'Unable to fetch data' }));
      }
    };

    const fetchHandoffStatus = async () => {
      try {
        const data = await fetchHotSummary();

        setSectionStatuses(prev => ({
          ...prev,
          handoff: data.status || 'healthy'
        }));

        setSectionMetrics(prev => ({
          ...prev,
          handoff: data.message || data.avg_response || 'Response tracking active'
        }));

        setStatusReasons(prev => ({
          ...prev,
          handoff: data.connected !== undefined ? 
            `Connected: ${data.connected}, Voicemail: ${data.voicemail || 0}, No answer: ${data.no_answer || 0}` :
            'Handoff monitoring active'
        }));
      } catch (err) {
        console.error('Error fetching handoff status:', err);
        setSectionStatuses(prev => ({ ...prev, handoff: 'attention' }));
        setSectionMetrics(prev => ({ ...prev, handoff: 'Unable to fetch data' }));
      }
    };

    const fetchJourneyStatus = async () => {
      try {
        const data = await fetchHealth();

        setSectionStatuses(prev => ({
          ...prev,
          journey: data.status || 'healthy'
        }));

        setSectionMetrics(prev => ({
          ...prev,
          journey: 'Funnel analysis complete'
        }));

        setStatusReasons(prev => ({
          ...prev,
          journey: data.metrics ? 
            `Total leads: ${data.metrics.totalToday || 0}, Processing pipeline` :
            'Journey tracking active'
        }));
      } catch (err) {
        console.error('Error fetching journey status:', err);
        setSectionStatuses(prev => ({ ...prev, journey: 'healthy' }));
        setSectionMetrics(prev => ({ ...prev, journey: 'Default metrics' }));
      }
    };

    const loadData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        await fetchOverviewStatus();
        await fetchHandoffStatus();
        await fetchJourneyStatus();
        setReady(true);
      }
    };

    loadData();
  }, []);

  // Add this new useEffect for tour integration
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'controlroom-collapse') {
        const newState = JSON.parse(e.newValue || '{}');
        setCollapsed(newState);
        console.log('📡 Control Room: Received collapse state update from tour');
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const toggleSection = (id) => {
    const updated = { ...collapsed, [id]: !collapsed[id] };
    setCollapsed(updated);
    localStorage.setItem('controlroom-collapse', JSON.stringify(updated));
  };

  const expandAll = () => {
    const updated = {};
    SECTIONS.forEach(section => {
      updated[section.id] = false; // false means expanded
    });
    setCollapsed(updated);
    localStorage.setItem('controlroom-collapse', JSON.stringify(updated));
  };

  const collapseAll = () => {
    const updated = {};
    SECTIONS.forEach(section => {
      updated[section.id] = true; // true means collapsed
    });
    setCollapsed(updated);
    localStorage.setItem('controlroom-collapse', JSON.stringify(updated));
  };

  const allExpanded = SECTIONS.every(section => !collapsed[section.id]);

  const renderSectionContent = (sectionLabel) => {
    // Always show the actual components - no feature gating at section level
    switch (sectionLabel) {
      case 'Overview & Health':
        return (
          <div className="space-y-3 w-full min-w-0">
            <div className="w-full min-w-0">
              <OverviewMetrics />
            </div>
            <div className="w-full min-w-0">
              <OverviewTrendAndCost />
            </div>
          </div>
        );
      case 'Lead Journey & Funnel':
        return (
          <div className="w-full min-w-0">
            <LeadJourneyFunnel />
          </div>
        );
      case 'AI Optimization':
        return (
          <div className="w-full min-w-0">
            <AiOptimizationPanel />
          </div>
        );
      case 'Hot Lead Handoff':
        return (
          <div className="w-full min-w-0">
            <HotLeadHandoffPanel />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="w-full max-w-full overflow-hidden">
      <div className="p-3 lg:p-6 space-y-3 lg:space-y-4 w-full max-w-full">
        {/* Plan indicator for debugging */}
        {process.env.NODE_ENV === 'development' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 w-full max-w-full overflow-hidden">
            <div className="text-sm break-words">
              <strong>Debug:</strong> Plan: {currentPlan} | Sections: Always Accessible | Feature Gating: At Component Level
            </div>
          </div>
        )}

        {/* Mobile Header */}
        <MobileHeader />

        {/* Mobile-Only Status Bar and Actions */}
        <div className="lg:hidden w-full max-w-full">
          <MobileStatusBar 
            sections={SECTIONS}
            sectionStatuses={sectionStatuses}
            sectionMetrics={sectionMetrics}
          />
          <MobileQuickActions 
            onExpandAll={expandAll}
            onCollapseAll={collapseAll}
            allExpanded={allExpanded}
          />
        </div>

        {/* Desktop View Toggle - Only shown on desktop */}
        <div className="hidden lg:flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI Control Room</h1>
            <p className="text-gray-600 mt-1">Monitor and manage your AI-powered pipeline</p>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('desktop')}
                className={clsx(
                  "px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center space-x-2",
                  viewMode === 'desktop' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                )}
              >
                <Monitor className="w-4 h-4" />
                <span>Desktop</span>
              </button>
              <button
                onClick={() => setViewMode('responsive')}
                className={clsx(
                  "px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center space-x-2",
                  viewMode === 'responsive' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                )}
              >
                <Smartphone className="w-4 h-4" />
                <span>Auto</span>
              </button>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={expandAll}
                disabled={allExpanded}
                className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Eye className="w-4 h-4" />
                <span>Expand All</span>
              </button>
              
              <button
                onClick={collapseAll}
                disabled={!allExpanded}
                className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <EyeOff className="w-4 h-4" />
                <span>Collapse All</span>
              </button>
            </div>
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-3 lg:space-y-4 w-full max-w-full">
          {SECTIONS.map((section) => {
            const status = sectionStatuses[section.id] || section.status;
            const metrics = sectionMetrics[section.id] || section.metrics;
            const statusConfig = getStatusConfig(status);
            const statusReason = statusReasons[section.id];
            const isExpanded = !collapsed[section.id];

            const content = ready ? renderSectionContent(section.label) : null;

            return (
              <div key={section.id} data-section={section.id} className="w-full max-w-full">
                {/* Mobile View */}
                <div className={clsx(
                  "lg:hidden w-full max-w-full",
                  viewMode === 'desktop' && "hidden"
                )}>
                  <MobileSectionCard
                    section={section}
                    status={status}
                    metrics={metrics}
                    statusConfig={statusConfig}
                    statusReason={statusReason}
                    isExpanded={isExpanded}
                    onToggle={() => toggleSection(section.id)}
                  >
                    {content}
                  </MobileSectionCard>
                </div>

                {/* Desktop View */}
                <div className={clsx(
                  "hidden lg:block",
                  viewMode === 'responsive' && "lg:block"
                )}>
                  <DesktopSectionCard
                    section={section}
                    status={status}
                    metrics={metrics}
                    statusConfig={statusConfig}
                    statusReason={statusReason}
                    isExpanded={isExpanded}
                    onToggle={() => toggleSection(section.id)}
                  >
                    {content}
                  </DesktopSectionCard>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AIControlRoom;