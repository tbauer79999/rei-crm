import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import OverviewMetrics from '../components/controlroom/OverviewMetrics';
import OverviewTrendAndCost from '../components/controlroom/OverviewTrendAndCost';
import LeadJourneyFunnel from '../components/controlroom/LeadJourneyFunnel';
import AiOptimizationPanel from '../components/controlroom/AiOptimizationPanel';
import HotLeadHandoffPanel from '../components/controlroom/HotLeadHandoffPanel';
import SystemMetricsPanel from '../components/controlroom/SystemMetricsPanel';
import CustomizationPanel from '../components/controlroom/CustomizationPanel';




const SECTIONS = [
  { id: 'overview', label: 'Overview & Health' },
  { id: 'handoff', label: 'Hot Lead Handoff' },
  { id: 'journey', label: 'Lead Journey & Funnel' },
  { id: 'optimization', label: 'AI Optimization' },
  { id: 'system', label: 'System Metrics' },
  { id: 'customization', label: 'Customization & Control' },
];

const AIControlRoom = () => {
  const [collapsed, setCollapsed] = useState({});

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
  }, []);

  const toggleSection = (id) => {
    const updated = { ...collapsed, [id]: !collapsed[id] };
    setCollapsed(updated);
    localStorage.setItem('controlroom-collapse', JSON.stringify(updated));
  };

  return (
    <div className="p-6 space-y-6">
      {SECTIONS.map(({ id, label }) => (
        <div key={id} className="bg-white rounded-2xl shadow-md border border-gray-200">
          <button
            onClick={() => toggleSection(id)}
            className="w-full flex items-center justify-between px-6 py-4 text-left text-xl font-semibold text-gray-800 hover:bg-gray-50 transition-colors"
          >
            <span>{label}</span>
            {collapsed[id] ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </button>

          <div
  className={clsx(
    'px-6 pb-6 transition-all duration-300 overflow-hidden',
    collapsed[id] ? 'max-h-0 opacity-0' : 'max-h-screen opacity-100'
  )}
>
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
      ))}
    </div>
  );
};

export default AIControlRoom;
