// src/components/dashboard/MessageQualityCard.jsx
import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Card } from '../ui/card';
import Skeleton from '../ui/skeleton';
import { fetchMessageQualityMetrics } from '../../lib/api';

export default function MessageQualityCard({ campaignFilter, timeFilter }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const result = await fetchMessageQualityMetrics({ campaignFilter, timeFilter });
      setStats(result);
      setLoading(false);
    };
    load();
  }, [campaignFilter, timeFilter]);

  const quality = stats?.average_quality_score?.toFixed(1);
  const failRate = stats?.failure_rate?.toFixed(1);
  const flagged = stats?.flagged_count || 0;

  return (
    <Card className="h-64 p-5 transition-shadow duration-200 hover:shadow-lg group rounded-2xl flex flex-col justify-between">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <Sparkles className="h-5 w-5 text-gray-400 group-hover:text-blue-500 transition-colors duration-200" />
          <h2 className="text-lg font-semibold text-gray-700">Message Quality</h2>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ) : (
        <div className="mt-4 space-y-3 text-sm text-gray-600">
          <div className="flex items-center justify-between">
            <span className="font-medium text-gray-800">Avg. AI Message Score:</span>
            <span className="text-blue-600 text-lg font-bold">{quality || 'N/A'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium text-gray-800">Failure Rate:</span>
            <span className={`text-lg font-semibold ${failRate > 5 ? 'text-red-500' : 'text-green-600'}`}>
              {failRate}%
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium text-gray-800">Flagged Messages:</span>
            <span className={`text-lg font-semibold ${flagged > 0 ? 'text-yellow-600' : 'text-gray-400'}`}>
              {flagged}
            </span>
          </div>
        </div>
      )}
    </Card>
  );
}
