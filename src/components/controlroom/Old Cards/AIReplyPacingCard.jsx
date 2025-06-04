// src/components/dashboard/AIReplyPacingCard.jsx
import { useEffect, useState } from 'react';
import { Timer } from 'lucide-react';
import { Card } from '../ui/card';
import Skeleton from '../ui/skeleton';
import { fetchReplyPacingStats } from '../../lib/api';

export default function AIReplyPacingCard({ campaignFilter, timeFilter }) {
  const [pacing, setPacing] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const result = await fetchReplyPacingStats({ campaignFilter, timeFilter });
      setPacing(result);
      setLoading(false);
    };
    load();
  }, [campaignFilter, timeFilter]);

  const avgDelay = pacing?.average_delay_minutes ?? '--';
  const fastReplies = pacing?.under_5_min ?? 0;
  const slowReplies = pacing?.over_10_min ?? 0;

  return (
    <Card className="h-64 p-5 transition-shadow duration-200 hover:shadow-lg group rounded-2xl flex flex-col justify-between">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <Timer className="h-5 w-5 text-gray-400 group-hover:text-indigo-600 transition-colors duration-200" />
          <h2 className="text-lg font-semibold text-gray-700">AI Reply Pacing</h2>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ) : (
        <div className="space-y-4 text-sm text-gray-600">
          <div>
            <span className="font-medium text-gray-800">Average Delay:</span>{' '}
            <span className="text-indigo-600 font-bold">{avgDelay} min</span>
          </div>
          <div>
            <span className="font-medium text-gray-800">Replied &lt; 5 min:</span>{' '}
            <span className="text-green-600 font-semibold">{fastReplies}</span>
          </div>
          <div>
            <span className="font-medium text-gray-800">Replied &gt; 10 min:</span>{' '}
            <span className="text-rose-600 font-semibold">{slowReplies}</span>
          </div>
        </div>
      )}
    </Card>
  );
}
