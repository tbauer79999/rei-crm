// src/components/controlroom/FailureRateCard.jsx
import { useEffect, useState } from 'react';
import { AlertCircle, TrendingDown, TrendingUp } from 'lucide-react';
import { Card } from '../ui/card';
import Skeleton from '../ui/skeleton';
import { fetchMessageQualityMetrics } from '../../lib/api';

export default function FailureRateCard() {
  const [failureRate, setFailureRate] = useState(null);
  const [previousRate, setPreviousRate] = useState(null); // Placeholder for future backend data
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const data = await fetchMessageQualityMetrics();
      const total = data?.total ?? 0;
      const failures = data?.failures ?? 0;
      const rate = total > 0 ? (failures / total) * 100 : 0;
      setFailureRate(rate.toFixed(1));
      // Simulated placeholder: setPreviousRate(rate - 2.3) or similar
      setPreviousRate(rate - 1.2);
      setLoading(false);
    };
    load();
  }, []);

  const trend =
    failureRate !== null && previousRate !== null
      ? failureRate - previousRate
      : 0;

  const TrendIcon =
    trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : null;

  const trendColor =
    trend > 0 ? 'text-red-500' : trend < 0 ? 'text-green-500' : 'text-gray-400';

  return (
    <Card className="h-64 p-5 transition-shadow duration-200 hover:shadow-lg group rounded-2xl flex flex-col justify-between">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <AlertCircle className="h-5 w-5 text-gray-400 group-hover:text-red-600 transition-colors duration-200" />
          <h2 className="text-lg font-semibold text-gray-700">Failure Rate</h2>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ) : (
        <div className="flex flex-col space-y-2 text-center">
          <div className="text-4xl font-extrabold text-red-500">
            {failureRate}%
          </div>
          {TrendIcon && (
            <div className={`flex items-center justify-center text-sm font-medium ${trendColor}`}>
              <TrendIcon className="h-4 w-4 mr-1" />
              {Math.abs(trend).toFixed(1)}% {trend > 0 ? '↑' : '↓'}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
