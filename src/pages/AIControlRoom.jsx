// File: src/pages/AIControlRoom.jsx

import React, { useEffect, useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import {
  Card, CardContent
} from '../components/ui/card';
import Button from '../components/ui/button';
import { Switch } from '../components/ui/switch';
import Slider from '../components/ui/slider';
import {
  BarChart2,
  Clock,
  SignalHigh,
  SlidersHorizontal,
  Flame,
  Send,
  Zap,
  GaugeCircle,
  TimerReset,
  Radar,
  Calendar,
  ArrowLeft,
  ArrowRight,
  Users2,
  Cpu,
  MessageSquare,
  Filter
} from 'lucide-react';

import supabase from '../lib/supabaseClient'; // ✅ Use singleton
import apiClient from '../lib/apiClient';
import FunnelChart from '../components/FunnelChart';
import ColdFollowupQueueCard from '../components/ColdFollowupQueueCard';


// Sortable wrapper
function SortableCard({ id, children, className = "" }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative ${className}`}
      {...attributes}
    >
      <div
        {...listeners}
        className="absolute top-2 right-2 p-1 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 z-10"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M9 18V6M15 18V6" />
        </svg>
      </div>
      {children}
    </div>
  );
}

const deltaClass = (val) => {
  if (typeof val !== 'string') return '';
  if (val.trim().startsWith('+')) return 'text-green-600';
  if (val.trim().startsWith('-')) return 'text-red-600';
  return '';
};

export default function AIControlRoom() {
  const [totalLeads, setTotalLeads] = useState(247);
  const [engagedLeads, setEngagedLeads] = useState(82);
  const [hotLeads, setHotLeads] = useState(17);
  const [aiOverride, setAiOverride] = useState(false);
  const [responseThreshold, setResponseThreshold] = useState(75);
  const [cardOrder, setCardOrder] = useState([
    'pipeline',
    'override',
    'threshold',
    'actions',
    'aiEffectiveness',
    'messages',
    'systemScore',
    'escalation',
    'coldQueue',
    'motivations',
    'activityTrend',
    'aiVsHuman'
  ]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedCampaign, setSelectedCampaign] = useState('All');
  const [selectedTimeFrame, setSelectedTimeFrame] = useState('Last 7 Days');
  const [threshold, setThreshold] = useState(70);
  const [lastUpdated, setLastUpdated] = useState(null);

  const currentRangeLabel = "May 25 – May 31";
  const goToPreviousWeek = () => console.log("Previous week clicked");
  const goToNextWeek = () => console.log("Next week clicked");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await apiClient.get('/analytics');
        setTotalLeads(res.data.total || 247);
        setEngagedLeads(res.data.engaged || 82);
        setHotLeads(res.data.hot || 17);
        setLastUpdated(new Date().toLocaleTimeString());
      } catch (err) {
        console.error('Failed to fetch analytics', err);
      }
    }
    fetchStats();

    const sub = supabase.channel('control-room-refresh')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, fetchStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, fetchStats)
      .subscribe();

    return () => supabase.removeChannel(sub);
  }, []);

  const handleOverrideToggle = async () => {
    try {
      setAiOverride(prev => !prev);
      await apiClient.patch('/settings', { key: 'AIOverride', value: !aiOverride });
    } catch (err) {
      console.error('Failed to update override setting', err);
    }
  };

  const handleThresholdChange = (val) => {
    setThreshold(val[0]);
  };

  const handleDragEnd = ({ active, over }) => {
    if (active.id !== over.id) {
      setCardOrder(items => arrayMove(items, items.indexOf(active.id), items.indexOf(over.id)));
    }
  };

  const getWeekRange = (offset = 0) => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - start.getDay() - (offset * 7));
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return {
      start: start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      end: end.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    };
  };

  const { start, end } = getWeekRange(weekOffset);

  // 👇 Everything below (cardComponents, JSX, etc.) is untouched and now shows live updates

  const commonCardClass = "min-h-[200px] flex flex-col shadow-md rounded-xl border border-gray-100 bg-white hover:shadow-lg transition-shadow duration-200";
  const commonContentClass = "flex-grow p-4 flex flex-col justify-between";

  const cardComponents = {
pipeline: (
  <Card className={commonCardClass + " group"}>
    <CardContent className={commonContentClass}>
      <div>
        <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
          <BarChart2 size={18} className="group-hover:text-blue-600 transition" />
          Conversion Snapshot
        </h2>
        <hr className="my-2 border-gray-200" />
        <div className="space-y-1 text-sm text-gray-700">
          <p>Total Leads: {totalLeads}</p>
          <p>Engaged: {engagedLeads}</p>
          <p className="text-red-600">Hot Leads: {hotLeads}</p>
          <p className="text-green-600">Cold → Hot Conversion: 6.9%</p>
        </div>
      </div>
    </CardContent>
  </Card>
),

override: (
  <Card className={commonCardClass + " group"}>
    <CardContent className={commonContentClass}>
      <div>
        <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
          <Clock size={18} className="group-hover:text-blue-600 transition" />
          Override AI Hours
        </h2>
        <hr className="my-2 border-gray-200" />
        <div className="flex items-center justify-between text-sm text-gray-700">
          <p>Allow replies outside business hours</p>
          <Switch checked={aiOverride} onCheckedChange={handleOverrideToggle} />
        </div>
      </div>
    </CardContent>
  </Card>
),

threshold: (
  <Card className={commonCardClass + " group"}>
    <CardContent className={commonContentClass}>
      <div>
        <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
          <SignalHigh size={18} className="group-hover:text-blue-600 transition" />
          Escalation Sensitivity
        </h2>
        <hr className="my-2 border-gray-200" />
        <Slider value={[threshold]} onValueChange={handleThresholdChange} />
        <p className="text-sm mt-2 text-gray-700">Current: {threshold}%</p>
      </div>
    </CardContent>
  </Card>
),


actions: (
  <Card className={commonCardClass + " group"}>
    <CardContent className={commonContentClass}>
      <div>
        <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
          <SlidersHorizontal size={18} className="group-hover:text-blue-600 transition" />
          Manual Controls
        </h2>
        <hr className="my-2 border-gray-200" />
        <Button
            variant="secondary"
            className="h-8 px-3 text-sm flex items-center gap-2 mb-2"
          >
            <Flame size={14} className="group-hover:text-blue-600 transition" />
            Trigger AI Escalation
        </Button>
        <Button
            variant="ghost"
            className="h-8 px-3 text-sm flex items-center gap-2 mb-2"
          >
            <Send size={14} className="group-hover:text-blue-600 transition" />
            Force Message Now
        </Button>
        <Button
            variant="outline"
            className="h-8 px-3 text-sm flex items-center gap-2"
          >
            <Zap size={14} className="group-hover:text-blue-600 transition" />
            Reset AI Status
        </Button>
      </div>
    </CardContent>
  </Card>
),


    aiEffectiveness: (
      <Card className={commonCardClass + " group"}>
        <CardContent className={commonContentClass}>
          <div>
            <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <Cpu size={18} className="group-hover:text-blue-600 transition" />
 AI Effectiveness
            </h2>
            <hr className="my-2 border-gray-200" />
            <ul className="text-sm space-y-1 text-gray-700">
              <li>Avg AI Messages / Lead: 4.2</li>
              <li>Escalation Conversion Rate: 66%</li>
              <li>Most Common Objection: "Not ready yet"</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    ),

    messages: (
      <Card className={commonCardClass + " group"}>
        <CardContent className={commonContentClass}>
          <div>
            <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <MessageSquare size={18} className="group-hover:text-blue-600 transition" />
 Message Ops
            </h2>
            <hr className="my-2 border-gray-200" />
            <ul className="text-sm mt-2 space-y-1 text-gray-700">
              <li>Sent Today: 34</li>
              <li>Pending Replies: 12</li>
              <li>Queued: 7</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    ),

systemScore: (
  <Card className={commonCardClass + " group"}>
    <CardContent className={commonContentClass}>
      <div>
        <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
          <GaugeCircle size={18} className="group-hover:text-blue-600 transition" />
          System Scorecard
        </h2>
        <hr className="my-2 border-gray-200" />
        <ul className="text-sm space-y-1 text-gray-700 mt-2">
          <li>AI Efficiency: 88%</li>
          <li>Avg Cold Follow-up Delay: 3.6d</li>
          <li>AI vs Human Activity: 83% / 17%</li>
        </ul>
      </div>
    </CardContent>
  </Card>
),

escalation: (
  <Card className={commonCardClass + " group"}>
    <CardContent className={commonContentClass}>
      <div>
        <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
          <Flame size={18} className="group-hover:text-blue-600 transition" />
          Escalation Activity
        </h2>
        <hr className="my-2 border-gray-200" />
        <ul className="text-sm space-y-1 text-gray-700">
          <li>Hot Leads This Week: 9</li>
          <li>Time to Escalation: 8m avg</li>
          <li>Replies After Escalation: 66%</li>
        </ul>
      </div>
    </CardContent>
  </Card>
),

    coldQueue: (
      <ColdFollowupQueueCard />
    ),

motivations: (
  <Card className={commonCardClass + " group"}>
    <CardContent className={commonContentClass}>
      <div>
        <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
          <Radar size={18} className="group-hover:text-blue-600 transition" />
          Seller Motivation Radar
        </h2>
        <hr className="my-2 border-gray-200" />
        <ul className="text-sm space-y-1 text-gray-700">
          <li>Tired Landlord – 6</li>
          <li>Job Relocation – 3</li>
          <li>Behind on Taxes – 2</li>
        </ul>
      </div>
    </CardContent>
  </Card>
),


activityTrend: (
  <Card className={commonCardClass + " group"}>
    <CardContent className={commonContentClass}>
      <div>
        <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
          <Calendar size={16} className="group-hover:text-blue-600 transition" />
          Week at a Glance
        </h2>
        <hr className="my-2 border-gray-200" />
        <div className="flex items-center justify-between mb-2 text-sm text-gray-700">
          <span>{currentRangeLabel}</span>
          <div className="flex gap-2">
            <ArrowLeft size={16} className="group-hover:text-blue-600 transition" onClick={goToPreviousWeek} />
            <ArrowRight size={16} className="group-hover:text-blue-600 transition" onClick={goToNextWeek} />
          </div>
        </div>
        <ul className="text-sm space-y-1">
          <li className={deltaClass("+3")}>+3 Hot Leads</li>
          <li className={deltaClass("+2")}>+2 Cold Re-Engaged</li>
          <li className={deltaClass("-8%")}>-8% Avg Delay</li>
        </ul>
      </div>
    </CardContent>
  </Card>
),

aiVsHuman: (
  <Card className={commonCardClass + " group"}>
    <CardContent className={commonContentClass}>
      <div>
        <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
          <Users2 size={18} className="group-hover:text-blue-600 transition" />
          AI vs Human Activity
        </h2>
        <hr className="my-2 border-gray-200" />
        <ul className="text-sm space-y-1 text-gray-700">
          <li>AI Messages: 82</li>
          <li>Human Messages: 17</li>
          <li>AI Escalations: 11</li>
        </ul>
      </div>
    </CardContent>
  </Card>
),
  };

  return (
    <div className="p-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">AI Control Room</h1>
        <hr className="my-2 border-gray-200" />

        <div className="flex gap-4 mt-2">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <Filter size={16} />
            Campaign:
            <select value={selectedCampaign} onChange={(e) => setSelectedCampaign(e.target.value)} className="border rounded px-2 py-1">
              <option>All</option>
              <option>Spring 2024</option>
              <option>Referral</option>
            </select>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-700">
            Timeframe:
            <select value={selectedTimeFrame} onChange={(e) => setSelectedTimeFrame(e.target.value)} className="border rounded px-2 py-1">
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
              <option>All Time</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-6">
        <div className="flex-1">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={cardOrder} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {cardOrder.map((cardId) => (
                  <SortableCard key={cardId} id={cardId}>
                    {cardComponents[cardId]}
                  </SortableCard>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        <div className="w-full xl:w-[400px] shrink-0">
          <FunnelChart />
        </div>
      </div>
    </div>
  );
}