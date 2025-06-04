// src/components/controlroom/LeadFunnelCard.jsx
import { useEffect, useState } from 'react';
import { Card } from '../ui/card';
import { ArrowRight } from 'lucide-react';

export function LeadFunnelCard({ campaign, timeframe }) {
  const [funnelData, setFunnelData] = useState({
    cold: 120,
    warm: 58,
    engaged: 27,
    hot: 9,
    escalated: 3,
  });

  useEffect(() => {
    // fetchFunnelData(campaign, timeframe).then(setFunnelData);
  }, [campaign, timeframe]);

  const stages = [
    { label: 'Cold', key: 'cold' },
    { label: 'Warm', key: 'warm' },
    { label: 'Engaged', key: 'engaged' },
    { label: 'Hot', key: 'hot' },
    { label: 'Escalated', key: 'escalated' },
  ];

  return (
    <Card className="h-64 p-5 transition-shadow duration-200 hover:shadow-lg group rounded-2xl flex flex-col justify-between">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <ArrowRight className="h-5 w-5 text-blue-600 group-hover:text-blue-800 transition-colors duration-200" />
          <h2 className="text-lg font-semibold text-gray-700">Lead Funnel</h2>
        </div>
      </div>

      <div className="space-y-4 text-sm text-gray-600 mt-1">
        {stages.map((stage, index) => {
          const value = funnelData[stage.key];
          const base = funnelData.cold || 1;
          const percent = ((value / base) * 100).toFixed(1);

          return (
            <div key={stage.key} className="flex items-center justify-between group/funnel">
              <span className="text-sm text-gray-600 w-24">{stage.label}</span>
              <div className="flex-1 h-2 mx-4 bg-gray-200 rounded overflow-hidden relative">
                <div
                  className="h-2 bg-blue-500 rounded transition-all duration-700 ease-out"
                  style={{ width: `${percent}%` }}
                ></div>
                <span className="absolute right-1 top-[-20px] text-xs text-gray-400 opacity-0 group-hover/funnel:opacity-100 transition-opacity">
                  {percent}%
                </span>
              </div>
              <span className="text-sm font-medium text-gray-700">{value}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
