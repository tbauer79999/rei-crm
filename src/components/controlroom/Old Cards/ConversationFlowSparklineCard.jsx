// src/components/controlroom/ConversationFlowSparklineCard.jsx
import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { MessageSquare } from 'lucide-react';
import { Card } from '../ui/card';
import Skeleton from '../ui/skeleton';
import { fetchConversationFlow } from '../../lib/api';

export default function ConversationFlowSparklineCard({ campaignFilter, timeFilter }) {
  const [flowData, setFlowData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const result = await fetchConversationFlow({ campaignFilter, timeFilter });
      setFlowData(result);
      setLoading(false);
    };
    load();
  }, [campaignFilter, timeFilter]);

  return (
    <Card className="h-64 p-5 transition-shadow duration-200 hover:shadow-lg group rounded-2xl flex flex-col justify-between">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <MessageSquare className="h-5 w-5 text-gray-400 group-hover:text-indigo-600 transition-colors duration-200" />
          <h2 className="text-lg font-semibold text-gray-700">Conversation Flow</h2>
        </div>
      </div>

      {loading ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <ResponsiveContainer width="100%" height="90%">
          <LineChart data={flowData}>
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12, fill: '#4B5563' }}
              stroke="#E5E7EB"
            />
            <YAxis hide domain={[0, 'dataMax + 2']} />
            <Tooltip contentStyle={{ fontSize: '0.75rem' }} />
            <Line
              type="monotone"
              dataKey="count"
              stroke="#6366f1"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}
