// src/components/dashboard/EscalationStatsCard.jsx
import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Card } from '../ui/card';
import { fetchEscalationStats } from '../../lib/api';
import Skeleton from '../ui/skeleton';

export default function EscalationStatsCard({ campaignFilter, timeFilter }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const result = await fetchEscalationStats({ campaignFilter, timeFilter });
      setStats(result);
      setLoading(false);
    };
    load();
  }, [campaignFilter, timeFilter]);

  const total = stats?.total || 0;
  const hotLeads = stats?.hot_leads || 0;
  const manualIntervention = stats?.manual_required || 0;

  return (
    <Card className="h-64 p-5 transition-shadow duration-200 hover:shadow-lg group rounded-2xl flex flex-col justify-between">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="h-5 w-5 text-gray-400 group-hover:text-orange-500 transition-colors duration-200" />
          <h2 className="text-lg font-semibold text-gray-700">Escalations</h2>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ) : (
        <div className="space-y-3 text-sm text-gray-600 mt-2">
          <div className="flex justify-between">
            <span className="font-medium text-gray-800">Total Escalations:</span>
            <span className="text-blue-600 font-bold">{total}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium text-gray-800">Hot Leads:</span>
            <span className="text-red-600 font-bold">{hotLeads}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium text-gray-800">Manual Review Needed:</span>
            <span className="text-yellow-600 font-semibold">{manualIntervention}</span>
          </div>
        </div>
      )}
    </Card>
  );
}
