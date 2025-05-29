// src/components/controlroom/AIEfficiencyCard.jsx
import { useEffect, useState } from 'react';
import { Gauge } from 'lucide-react';
import { Card } from '../ui/card';
import Skeleton from '../ui/skeleton';
import { fetchAIEfficiency } from '../../lib/api';

export default function AIEfficiencyCard({ campaignFilter, timeFilter }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const result = await fetchAIEfficiency({ campaignFilter, timeFilter });
      setData(result);
      setLoading(false);
    };
    load();
  }, [campaignFilter, timeFilter]);

  return (
    <Card className="h-64 p-5 transition-shadow duration-200 hover:shadow-lg group rounded-2xl flex flex-col justify-between">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <Gauge className="h-5 w-5 text-gray-400 group-hover:text-indigo-600 transition-colors duration-200" />
          <h2 className="text-lg font-semibold text-gray-700">AI Efficiency</h2>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ) : (
        <div className="space-y-3 text-sm text-gray-700">
          <div>
            <span className="font-medium text-gray-800">Total AI Replies:</span>{' '}
            <span className="text-blue-600 font-semibold">{data?.aiReplies ?? 0}</span>
          </div>
          <div>
            <span className="font-medium text-gray-800">Replied Back:</span>{' '}
            <span className="text-green-600 font-semibold">{data?.leadReplies ?? 0}</span>
          </div>
          <div>
            <span className="font-medium text-gray-800">Efficiency Rate:</span>{' '}
            <span className="text-indigo-600 font-bold">
              {data?.efficiencyPercent ?? '--'}%
            </span>
          </div>
        </div>
      )}
    </Card>
  );
}
