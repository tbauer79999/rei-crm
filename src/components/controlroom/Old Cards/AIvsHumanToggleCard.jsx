// src/components/controlroom/AIvsHumanToggleCard.jsx
import { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { Card } from '../ui/card';
import { Switch } from '../ui/switch';
import Skeleton from '../ui/skeleton';
import { fetchAIvsHumanSplit } from '../../lib/api';

export default function AIvsHumanToggleCard({ campaignFilter, timeFilter }) {
  const [aiView, setAiView] = useState(true);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const result = await fetchAIvsHumanSplit({ campaignFilter, timeFilter });
      setStats(result);
      setLoading(false);
    };
    load();
  }, [campaignFilter, timeFilter]);

  return (
    <Card className="h-64 p-5 flex flex-col justify-between rounded-2xl shadow-md transition-shadow hover:shadow-lg group">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Users className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors duration-200" />
          <h2 className="text-lg font-semibold text-gray-700">AI Workload Efficiency</h2>
        </div>
        <Switch
          checked={aiView}
          onCheckedChange={setAiView}
          className="bg-gray-200 data-[state=checked]:bg-blue-600"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ) : (
        <div className="text-sm text-gray-600 space-y-2">
          {aiView ? (
            <>
              <div>
                <span className="font-medium text-gray-800">Avg. AI Messages per Lead:</span>{' '}
                <span className="text-blue-600 font-bold">{stats?.avg_ai_msgs_per_lead ?? '--'}</span>
              </div>
              <div>
                <span className="font-medium text-gray-800">Replies per AI Message:</span>{' '}
                <span className="text-green-600 font-bold">{stats?.reply_rate_per_ai_msg ?? '--'}%</span>
              </div>
              <div>
                <span className="font-medium text-gray-800">Ghosted After 1 Msg:</span>{' '}
                <span className="text-yellow-600 font-semibold">{stats?.ghosted_after_1_msg ?? '--'}%</span>
              </div>
              <div>
                <span className="font-medium text-gray-800">AI Conversations Started:</span>{' '}
                <span className="text-indigo-600 font-semibold">{stats?.total_ai_convos_started ?? '--'}</span>
              </div>
            </>
          ) : (
            <p className="text-gray-500 italic">
              No manual user actions are tracked in this platform. All communication is AI-driven.
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
