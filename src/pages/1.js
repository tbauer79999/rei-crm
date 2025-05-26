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
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { Card, CardContent } from '../components/ui/card';
import Button from '../components/ui/button';
import { Switch } from '../components/ui/switch';
import Slider from '../components/ui/slider';
import {
  Flame, Send, Zap, GaugeCircle, MessageSquare, BarChart2,
  Cpu, Clock, TrendingUp, Filter, GripVertical
} from 'lucide-react';
import apiClient from '../lib/apiClient';
import FunnelChart from '../components/FunnelChart';
import ColdFollowupQueueCard from '../components/ColdFollowupQueueCard';

// Sortable Card Wrapper Component
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
      {/* Drag Handle */}
      <div
        {...listeners}
        className="absolute top-2 right-2 p-1 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 z-10"
      >
        <GripVertical size={16} />
      </div>
      {children}
    </div>
  );
}

export default function AIControlRoom() {
  const [totalLeads, setTotalLeads] = useState(247);
  const [engagedLeads, setEngagedLeads] = useState(82);
  const [hotLeads, setHotLeads] = useState(17);
  const [aiOverride, setAiOverride] = useState(false);
  const [responseThreshold, setResponseThreshold] = useState(75);
  const [selectedCampaign, setSelectedCampaign] = useState('All');
  const [selectedTimeFrame, setSelectedTimeFrame] = useState('Last 7 Days');
  const [viewMode, setViewMode] = useState('count');

  // Card order state
  const [cardOrder, setCardOrder] = useState([
    'pipeline',
    'override', 
    'threshold',
    'actions',
    'monitor',
    'messages',
    'performance',
    'escalation',
    'motivation',
    'coldQueue'
  ]);

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
      } catch (err) {
        console.error('Failed to fetch analytics', err);
      }
    }
    fetchStats();
  }, []);
  const handleOverrideToggle = async () => {
    try {
      setAiOverride(prev => !prev);
      await apiClient.patch('/settings', {
        key: 'AIOverride',
        value: !aiOverride,
      });
    } catch (err) {
      console.error('Failed to update override setting', err);
    }
  };

  const handleDragEnd = ({ active, over }) => {
    if (active.id !== over.id) {
      setCardOrder((items) =>
        arrayMove(items, items.indexOf(active.id), items.indexOf(over.id))
      );
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

  const [weekOffset, setWeekOffset] = useState(0);
  const { start, end } = getWeekRange(weekOffset);

  const commonCardClass =
    "min-h-[200px] flex flex-col shadow-md rounded-xl border border-gray-100 bg-white hover:shadow-lg transition-shadow duration-200";
  const commonContentClass =
    "flex-grow p-4 flex flex-col justify-between";

  const deltaClass = (val) => {
    if (typeof val !== 'string') return '';
    if (val.trim().startsWith('+')) return 'text-green-600';
    if (val.trim().startsWith('-')) return 'text-red-600';
    return '';
  };

  const sectionDivider = <hr className="my-2 border-gray-200" />;

  const fillerText = (
    <p className="text-sm text-gray-500">No cold leads are due yet.</p>
  );

  // Card map continues below (rendering UI cards)
  const cardComponents = {
    pipeline: (
      <Card className={commonCardClass}>
        <CardContent className={commonContentClass}>
          <div>
            <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <BarChart2 size={18} className="group-hover:text-blue-600 transition" />
              Conversion Snapshot
            </h2>
            {sectionDivider}
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
      <Card className={commonCardClass}>
        <CardContent className={commonContentClass}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock size={18} className="group-hover:text-blue-600 transition" />
              <div>
                <h2 className="text-lg font-semibold">Override AI Hours</h2>
                <p className="text-sm text-gray-600">Allow replies outside business hours</p>
              </div>
            </div>
            <Switch checked={aiOverride} onCheckedChange={handleOverrideToggle} />
          </div>
        </CardContent>
      </Card>
    ),

    threshold: (
      <Card className={commonCardClass}>
        <CardContent className={commonContentClass}>
          <div>
            <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <TrendingUp size={18} className="group-hover:text-blue-600 transition" />
              Escalation Sensitivity
            </h2>
            {sectionDivider}
            <Slider
              value={[responseThreshold]}
              onValueChange={([val]) => setResponseThreshold(val)}
              min={0}
              max={100}
              step={1}
            />
            <p className="text-sm mt-2 text-gray-600">Current: {responseThreshold}%</p>
          </div>
        </CardContent>
      </Card>
    ),

    actions: (
      <Card className={commonCardClass}>
        <CardContent className={commonContentClass}>
          <div>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Zap size={18} className="group-hover:text-blue-600 transition" />
              Manual Controls
            </h2>
            {sectionDivider}
            <div className="flex flex-col gap-2">
              <Button variant="secondary" className="flex items-center gap-2">
                <Flame size={16} /> Trigger AI Escalation
              </Button>
              <Button variant="ghost" className="flex items-center gap-2">
                <Send size={16} /> Force Message Now
              </Button>
              <Button variant="outline" className="flex items-center gap-2">
                <Zap size={16} /> Reset AI Status
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    ),
    monitor: (
      <Card className={commonCardClass}>
        <CardContent className={commonContentClass}>
          <div>
            <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <GaugeCircle size={18} className="group-hover:text-blue-600 transition" />
              System Monitor
            </h2>
            {sectionDivider}
            <ul className="text-sm space-y-1 text-gray-700">
              <li>AI Efficiency: 88%</li>
              <li>Avg Cold Follow-up Delay: 3.6d</li>
              <li>AI vs Human Activity: 83% / 17%</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    ),

    messages: (
      <Card className={commonCardClass}>
        <CardContent className={commonContentClass}>
          <div>
            <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <MessageSquare size={18} className="group-hover:text-blue-600 transition" />
              Messaging Summary
            </h2>
            {sectionDivider}
            <ul className="text-sm mt-2 space-y-1 text-gray-700">
              <li>Sent Today: 34</li>
              <li>Pending Replies: 12</li>
              <li>Queued: 7</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    ),

    performance: (
      <Card className={commonCardClass}>
        <CardContent className={commonContentClass}>
          <div>
            <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <Cpu size={18} className="group-hover:text-blue-600 transition" />
              AI Performance
            </h2>
            {sectionDivider}
            <ul className="text-sm space-y-1 text-gray-700">
              <li>Avg Messages per Lead: 4.2</li>
              <li>Escalation Success Rate: 66%</li>
              <li>Top Objection: "Not ready yet"</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    ),

    escalation: (
      <Card className={commonCardClass}>
        <CardContent className={commonContentClass}>
          <div>
            <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <Flame size={18} className="group-hover:text-blue-600 transition" />
              Escalation Activity
            </h2>
            {sectionDivider}
            <ul className="text-sm mt-2 space-y-1 text-gray-700">
              <li>Hot Leads This Week: 9</li>
              <li>Avg Time to Escalate: 8m</li>
              <li>Post-Escalation Replies: 66%</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    ),

    motivation: (
      <Card className={commonCardClass}>
        <CardContent className={commonContentClass}>
          <div>
            <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <Users2 size={18} className="group-hover:text-blue-600 transition" />
              Seller Motivation
            </h2>
            {sectionDivider}
            <ul className="text-sm space-y-1 text-gray-700">
              <li>Tired Landlord – 6</li>
              <li>Job Relocation – 3</li>
              <li>Behind on Taxes – 2</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    ),
    coldQueue: (
      <Card className={commonCardClass}>
        <CardContent className={commonContentClass}>
          <div>
            <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <Inbox size={18} className="group-hover:text-blue-600 transition" />
              Cold Follow-up Queue
            </h2>
            {sectionDivider}
            {fillerText}
          </div>
        </CardContent>
      </Card>
    )
  };

  return (
    <div className="p-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">AI Control Room</h1>
        <div className="flex flex-wrap gap-4 mt-2">
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
