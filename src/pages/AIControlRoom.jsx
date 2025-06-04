import React, { useState, useEffect } from 'react';
import { 
  ChevronDown, 
  ChevronRight, 
  Activity, 
  Users, 
  TrendingUp, 
  Brain, 
  Server, 
  Settings,
  CheckCircle,
  AlertTriangle,
  Clock
} from 'lucide-react';
import clsx from 'clsx';
import OverviewMetrics from '../components/controlroom/OverviewMetrics';
import OverviewTrendAndCost from '../components/controlroom/OverviewTrendAndCost';
import LeadJourneyFunnel from '../components/controlroom/LeadJourneyFunnel';
import AiOptimizationPanel from '../components/controlroom/AiOptimizationPanel';
import HotLeadHandoffPanel from '../components/controlroom/HotLeadHandoffPanel';
import SystemMetricsPanel from '../components/controlroom/SystemMetricsPanel';
import CustomizationPanel from '../components/controlroom/CustomizationPanel';
import { fetchHealth, fetchHotSummary } from '../lib/api'; // Import your API helper

const SECTIONS = [
  { 
    id: 'overview', 
    label: 'Overview & Health',
    description: 'System performance, lead counts, and key metrics',
    icon: Activity,
    status: 'healthy',
    metrics: '24 hot leads today'
  },
  { 
    id: 'handoff', 
    label: 'Hot Lead Handoff',
    description: 'Sales team notifications and response tracking',
    icon: Users,
    status: 'attention',
    metrics: 'Avg response: 12m'
  },
  { 
    id: 'journey', 
    label: 'Lead Journey & Funnel',
    description: 'Conversion rates and pipeline analytics',
    icon: TrendingUp,
    status: 'healthy',
    metrics: '18% conversion rate'
  },
  { 
    id: 'optimization', 
    label: 'AI Optimization',
    description: 'Message analysis, keywords, and conversation insights',
    icon: Brain,
    status: 'healthy',
    metrics: '89% AI accuracy'
  },
  { 
    id: 'system', 
    label: 'System Metrics',
    description: 'API uptime, message delivery, and infrastructure health',
    icon: Server,
    status: 'healthy',
    metrics: '99.9% uptime'
  },
  { 
    id: 'customization', 
    label: 'Customization & Control',
    description: 'AI prompts, escalation rules, and system configuration',
    icon: Settings,
    status: 'review',
    metrics: '3 pending updates'
  },
];

const getStatusConfig = (status) => {
  switch (status) {
    case 'healthy':
      return {
        icon: CheckCircle,
        color: 'text-green-500',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200'
      };
    case 'attention':
      return {
        icon: AlertTriangle,
        color: 'text-orange-500',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200'
      };
    case 'review':
      return {
        icon: Clock,
        color: 'text-blue-500',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200'
      };
    default:
      return {
        icon: CheckCircle,
        color: 'text-gray-500',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200'
      };
  }
};

const AIControlRoom = () => {
  const [collapsed, setCollapsed] = useState({});
  const [sectionStatuses, setSectionStatuses] = useState({});
  const [sectionMetrics, setSectionMetrics] = useState({});
  const [statusReasons, setStatusReasons] = useState({});

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

    // Fetch dynamic status for Overview & Health
    const fetchOverviewStatus = async () => {
      try {
        // ✅ Use your API helper instead of direct fetch
        const data = await fetchHealth();
        
        setSectionStatuses(prev => ({
          ...prev,
          overview: data.status || 'healthy'
        }));
        
        setSectionMetrics(prev => ({
          ...prev,
          overview: data.message || 'System operational'
        }));
        
        setStatusReasons(prev => ({
          ...prev,
          overview: data.metrics ? 
            `Leads today: ${data.metrics.totalToday || 0}, Hot: ${data.metrics.hotToday || 0}, Last hour: ${data.metrics.lastHour || 0}` :
            'Health check complete'
        }));
      } catch (err) {
        console.error('Error fetching overview status:', err);
        // Set fallback values on error
        setSectionStatuses(prev => ({ ...prev, overview: 'attention' }));
        setSectionMetrics(prev => ({ ...prev, overview: 'Unable to fetch data' }));
      }
    };

    // Fetch dynamic status for Hot Lead Handoff
    const fetchHandoffStatus = async () => {
      try {
        // ✅ Use your API helper instead of direct fetch
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
        // Set fallback values on error
        setSectionStatuses(prev => ({ ...prev, handoff: 'attention' }));
        setSectionMetrics(prev => ({ ...prev, handoff: 'Unable to fetch data' }));
      }
    };

    // Fetch dynamic status for Lead Journey & Funnel
    const fetchJourneyStatus = async () => {
      try {
        // For now, use overview data or create a specific funnel health endpoint
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
        // Set fallback values on error
        setSectionStatuses(prev => ({ ...prev, journey: 'healthy' }));
        setSectionMetrics(prev => ({ ...prev, journey: 'Default metrics' }));
      }
    };

    fetchOverviewStatus();
    fetchHandoffStatus();
    fetchJourneyStatus();
  }, []);

  const toggleSection = (id) => {
    const updated = { ...collapsed, [id]: !collapsed[id] };
    setCollapsed(updated);
    localStorage.setItem('controlroom-collapse', JSON.stringify(updated));
  };

  return (
    <div className="p-6 space-y-4">
      {SECTIONS.map((section) => {
        const { id, label, description, icon: SectionIcon } = section;
        
        // Use dynamic status/metrics if available, fallback to static
        const status = sectionStatuses[id] || section.status;
        const metrics = sectionMetrics[id] || section.metrics;
        
        const statusConfig = getStatusConfig(status);
        const StatusIcon = statusConfig.icon;
        
        return (
          <div 
            key={id} 
            className={clsx(
              "bg-white rounded-2xl shadow-sm border transition-all duration-200 hover:shadow-md",
              statusConfig.borderColor
            )}
          >
            <button
              onClick={() => toggleSection(id)}
              className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-gray-50/50 transition-colors rounded-2xl"
            >
              <div className="flex items-center space-x-4 flex-1">
                {/* Section Icon */}
                <div className={clsx(
                  "w-12 h-12 rounded-xl flex items-center justify-center",
                  statusConfig.bgColor
                )}>
                  <SectionIcon className={clsx("w-6 h-6", statusConfig.color)} />
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3 mb-1">
                    <h3 className="text-lg font-semibold text-gray-900">{label}</h3>
                    <div 
                      className="flex items-center space-x-1 cursor-help"
                      title={statusReasons[id] || `Status: ${status}`}
                    >
                      <StatusIcon className={clsx("w-4 h-4", statusConfig.color)} />
                      <span className={clsx("text-xs font-medium capitalize", statusConfig.color)}>
                        {status}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 mb-1">{description}</p>
                  <span className="text-xs text-gray-400 font-medium">{metrics}</span>
                </div>
              </div>

              {/* Chevron */}
              <div className="ml-4">
                {collapsed[id] ? (
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </div>
            </button>

            {/* Expandable Content */}
            <div
              className={clsx(
                'transition-all duration-300 ease-in-out',
                collapsed[id] 
                  ? 'max-h-0 opacity-0 overflow-hidden' 
                  : 'opacity-100 overflow-visible'
              )}
            >
              <div className="px-6 pb-6 border-t border-gray-100">
                <div className="pt-6">
                  {label === 'Overview & Health' && (
                    <>
                      <OverviewMetrics />
                      <OverviewTrendAndCost />
                    </>
                  )}
                  {label === 'Lead Journey & Funnel' && (<LeadJourneyFunnel />)}
                  {label === 'AI Optimization' && (<AiOptimizationPanel />)}
                  {label === 'Hot Lead Handoff' && (<HotLeadHandoffPanel />)}
                  {label === 'System Metrics' && (<SystemMetricsPanel />)}
                  {label === 'Customization & Control' && (<CustomizationPanel />)}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AIControlRoom;