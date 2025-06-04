// src/components/controlroom/WeeklyMomentumCard.jsx
import { useEffect, useState } from 'react';
import { TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card } from '../ui/card';
import Skeleton from '../ui/skeleton';
import { fetchWeeklyMomentumMetrics } from '../../lib/api';

function getWeekRange(offset = 0) {
  const today = new Date();
  const dayOfWeek = today.getDay(); // Sunday = 0, Monday = 1, ...
  const daysToMonday = (dayOfWeek + 6) % 7;
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - daysToMonday + offset * 7);
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  const format = (date) =>
    date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return `${format(startOfWeek)} – ${format(endOfWeek)}`;
}

export default function WeeklyMomentumCard({ campaignFilter, timeFilter }) {
  const [momentum, setMomentum] = useState(null);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0); // 0 = current week

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const result = await fetchWeeklyMomentumMetrics({ campaignFilter, timeFilter, weekOffset });
      setMomentum(result);
      setLoading(false);
    };
    load();
  }, [campaignFilter, timeFilter, weekOffset]);

  const dateLabel = getWeekRange(weekOffset);

  const changeWeek = (delta) => {
    setWeekOffset((prev) => prev + delta);
  };

  return (
    <Card className="h-64 p-5 transition-shadow duration-200 hover:shadow-lg group rounded-2xl flex flex-col justify-between">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <TrendingUp className="h-5 w-5 text-gray-400 group-hover:text-emerald-600 transition-colors duration-200" />
          <h2 className="text-lg font-semibold text-gray-700">{dateLabel} at a Glance</h2>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => changeWeek(-1)}
            className="p-1 text-gray-400 hover:text-gray-700 transition"
            aria-label="Previous week"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => changeWeek(1)}
            disabled={weekOffset === 0}
            className={`p-1 transition ${weekOffset === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-400 hover:text-gray-700'}`}
            aria-label="Next week"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
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
            <span className="font-medium text-gray-800">New Leads:</span>
            <span className="text-gray-700 font-semibold">{momentum?.new_leads ?? 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium text-gray-800">AI Responded:</span>
            <span className="text-blue-600 font-semibold">{momentum?.ai_responses ?? 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium text-gray-800">Replies Received:</span>
            <span className="text-green-600 font-semibold">{momentum?.replies ?? 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium text-gray-800">Escalations Triggered:</span>
            <span className="text-red-600 font-semibold">{momentum?.escalations ?? 0}</span>
          </div>
        </div>
      )}
    </Card>
  );
}
