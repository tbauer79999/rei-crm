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
  Clock
} from 'lucide-react';
import clsx from 'clsx';
import OverviewMetrics from '../components/controlroom/OverviewMetrics';
import OverviewTrendAndCost from '../components/controlroom/OverviewTrendAndCost';
import LeadJourneyFunnel from '../components/controlroom/LeadJourneyFunnel';
import AiOptimizationPanel from '../components/controlroom/AiOptimizationPanel';
import HotLeadHandoffPanel from '../components/controlroom/HotLeadHandoffPanel';
import { fetchHealth, fetchHotSummary } from '../lib/api'; // Import your API helper
import supabase from '../lib/supabaseClient';

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
  const [ready, setReady] = useState(false);

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
    
    // Transform the data to match what AIControlRoom expects
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

  const toggleSection = (id) => {
    const updated = { ...collapsed, [id]: !collapsed[id] };
    setCollapsed(updated);
    localStorage.setItem('controlroom-collapse', JSON.stringify(updated));
  };

  return (
    <div className="p-6 space-y-4">
      {SECTIONS.map((section) => {
        const { id, label, description, icon: SectionIcon } = section;

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
              <div className="ml-4">
                {collapsed[id] ? (
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </div>
            </button>
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
                  {ready && label === 'Overview & Health' && (<><OverviewMetrics /><OverviewTrendAndCost /></>)}
                  {ready && label === 'Lead Journey & Funnel' && (<LeadJourneyFunnel />)}
                  {ready && label === 'AI Optimization' && (<AiOptimizationPanel />)}
                  {ready && label === 'Hot Lead Handoff' && (<HotLeadHandoffPanel />)}
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