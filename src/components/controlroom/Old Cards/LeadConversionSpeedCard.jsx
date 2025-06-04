// src/components/controlroom/LeadConversionSpeedCard.jsx
import { useEffect, useState } from 'react';
import { TimerReset, TrendingDown, TrendingUp } from 'lucide-react';
import { Card } from '../ui/card';
import Skeleton from '../ui/skeleton';
import { fetchLeadConversionSpeed } from '../../lib/api';

export default function LeadConversionSpeedCard({ campaignFilter, timeFilter }) {
  const [conversionSpeed, setConversionSpeed] = useState(null);
  const [previousSpeed, setPreviousSpeed] = useState(null); // Simulated for delta preview
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const result = await fetchLeadConversionSpeed({ campaignFilter, timeFilter });
      setConversionSpeed(result);
      setPreviousSpeed(result?.avgHours ? result.avgHours + 1.3 : null); // Simulated trend
      setLoading(false);
    };
    load();
  }, [campaignFilter, timeFilter]);

  const hours = conversionSpeed?.avgHours ?? null;
  const delta = hours && previousSpeed ? previousSpeed - hours : 0;
  const isFaster = delta > 0;
  const TrendIcon = delta === 0 ? null : isFaster ? TrendingDown : TrendingUp;

  return (
    <Card className="h-64 p-5 transition-shadow duration-200 hover:shadow-lg group rounded-2xl flex flex-col justify-between">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <TimerReset className="h-5 w-5 text-gray-400 group-hover:text-orange-600 transition-colors duration-200 animate-pulse-slow" />
          <h2 className="text-lg font-semibold text-gray-700">Lead Conversion Speed</h2>
        </div>
      </div>

      {loading ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <div className="text-center mt-6 text-gray-700 space-y-2">
          <div className="flex items-baseline justify-center gap-2">
            <span className="text-4xl font-bold text-orange-600">
              {hours ?? '--'}
            </span>
            <span className="text-sm text-gray-500">hrs</span>
          </div>
          {TrendIcon && (
            <div className={`flex items-center justify-center text-sm ${isFaster ? 'text-green-600' : 'text-red-500'}`}>
              <TrendIcon className="h-4 w-4 mr-1" />
              {Math.abs(delta).toFixed(1)} hrs {isFaster ? 'faster' : 'slower'}
            </div>
          )}
          <p className="text-sm text-gray-500">
            Avg time from cold → hot/escalated
          </p>
        </div>
      )}
    </Card>
  );
}
