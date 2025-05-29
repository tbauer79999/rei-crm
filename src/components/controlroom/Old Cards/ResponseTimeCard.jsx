// src/components/controlroom/ResponseTimeCard.jsx
import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { Card } from '../ui/card';
import Skeleton from '../ui/skeleton';
import { fetchResponseTimeMetrics } from '../../lib/api';

export default function ResponseTimeCard({ campaignFilter, timeFilter }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const result = await fetchResponseTimeMetrics({ campaignFilter, timeFilter });
      setData(result);
      setLoading(false);
    };
    load();
  }, [campaignFilter, timeFilter]);

  return (
    <Card className="h-64 p-5 transition-shadow duration-200 hover:shadow-lg group rounded-2xl flex flex-col justify-between">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <Clock className="h-5 w-5 text-gray-400 group-hover:text-purple-600 transition-colors duration-200" />
          <h2 className="text-lg font-semibold text-gray-700">AI Response Time</h2>
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
            <span className="font-medium text-gray-800">Avg. Response Time:</span>
            <span className="text-purple-600 text-lg font-bold">{data?.avg_minutes ?? '--'} min</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium text-gray-800">Fast Responses (&lt; 2 min):</span>
            <span className="text-green-600 text-lg font-semibold">{data?.under_2_min ?? 0}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium text-gray-800">Slow Responses (&gt; 10 min):</span>
            <span className="text-red-600 text-lg font-semibold">{data?.over_10_min ?? 0}</span>
          </div>
        </div>
      )}
    </Card>
  );
}
