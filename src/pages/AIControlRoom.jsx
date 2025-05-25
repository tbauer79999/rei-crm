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
      await apiClient.patch('/settings', { key: 'AIOverride', value: !aiOverride });
    } catch (err) {
      console.error('Failed to update override setting', err);
    }
  };

  function handleDragEnd(event) {
    const { active, over } = event;

    if (active.id !== over.id) {
      setCardOrder((items) => {
        const oldIndex = items.indexOf(active.id);
        const newIndex = items.indexOf(over.id);

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }

  // Card components mapping
  const cardComponents = {
    pipeline: (
      <Card>
        <CardContent className="p-4">
          <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
            <BarChart2 size={20} /> AI Pipeline
          </h2>
          <div className="space-y-1 text-sm text-gray-700">
            <p>Total Leads: {totalLeads}</p>
            <p>Engaged: {engagedLeads}</p>
            <p className="text-red-600">Hot: {hotLeads}</p>
          </div>
        </CardContent>
      </Card>
    ),

    override: (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Override AI Hours</h2>
              <p className="text-sm text-gray-600">Allow replies outside business hours</p>
            </div>
            <Switch checked={aiOverride} onCheckedChange={handleOverrideToggle} />
          </div>
        </CardContent>
      </Card>
    ),

    threshold: (
      <Card>
        <CardContent className="p-4">
          <h2 className="text-lg font-semibold mb-2">Response Threshold</h2>
          <Slider 
            value={[responseThreshold]} 
            onValueChange={([val]) => setResponseThreshold(val)} 
            min={0} 
            max={100} 
            step={1} 
          />
          <p className="text-sm mt-2 text-gray-600">Current: {responseThreshold}%</p>
        </CardContent>
      </Card>
    ),

    actions: (
      <Card>
        <CardContent className="p-4 flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Manual Actions</h2>
          <Button variant="secondary" className="flex items-center gap-2">
            <Flame size={16} /> Trigger AI Escalation
          </Button>
          <Button variant="ghost" className="flex items-center gap-2">
            <Send size={16} /> Force Message Now
          </Button>
          <Button variant="outline" className="flex items-center gap-2">
            <Zap size={16} /> Reset AI Status
          </Button>
        </CardContent>
      </Card>
    ),

    monitor: (
      <Card>
        <CardContent className="p-4">
          <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
            <GaugeCircle size={18} /> Lead Flow Monitor
          </h2>
          <p className="text-sm text-gray-600">Tracking lead progression through AI stages.</p>
          <div className="mt-4 h-2 w-full bg-gray-200 rounded-full">
            <div 
              className="h-2 bg-indigo-500 rounded-full" 
              style={{ width: `${(engagedLeads / (totalLeads || 1)) * 100}%` }}
            ></div>
          </div>
        </CardContent>
      </Card>
    ),

    messages: (
      <Card>
        <CardContent className="p-4">
          <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
            <MessageSquare size={18} /> AI Message Stats
          </h2>
          <ul className="text-sm mt-2 space-y-1 text-gray-700">
            <li>Pending Replies: 12</li>
            <li>Messages Sent Today: 34</li>
            <li>Queued: 7</li>
          </ul>
        </CardContent>
      </Card>
    ),

    performance: (
      <Card>
        <CardContent className="p-4">
          <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
            <Cpu size={18} /> AI Performance
          </h2>
          <ul className="text-sm space-y-1 text-gray-700">
            <li>Accuracy Score: 88/100</li>
            <li>Avg Messages per Lead: 4.2</li>
            <li>Common Objection: "Not ready yet"</li>
          </ul>
        </CardContent>
      </Card>
    ),

    escalation: (
      <Card>
        <CardContent className="p-4">
          <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
            <Flame size={18} /> Escalation Stats
          </h2>
          <ul className="text-sm space-y-1 text-gray-700">
            <li>Hot Leads Today: 3</li>
            <li>Avg Time to Escalation: 8 min</li>
            <li>Replied After Escalation: 66%</li>
          </ul>
        </CardContent>
      </Card>
    ),

    motivation: (
      <Card>
        <CardContent className="p-4">
          <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
            <TrendingUp size={18} /> Seller Motivation Radar
          </h2>
          <ul className="text-sm space-y-1 text-gray-700">
            <li>Tired Landlord – 6</li>
            <li>Job Relocation – 3</li>
            <li>Behind on Taxes – 2</li>
          </ul>
        </CardContent>
      </Card>
    ),

    funnel: (
      <Card className="xl:col-span-1 row-span-2">
        <CardContent className="p-4">
          <FunnelChart />
        </CardContent>
      </Card>
    )
  };

  return (
  <div className="p-4">
    <div className="mb-6">
      <h1 className="text-3xl font-bold text-gray-900">AI Control Room</h1>
      <p className="text-gray-600 mt-2">Drag cards to customize your dashboard layout</p>
    </div>

    <div className="flex flex-col xl:flex-row gap-6">
      {/* Left Column: Moveable Cards */}
      <div className="flex-1">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={cardOrder} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {cardOrder.map((cardId) => (
                <SortableCard key={cardId} id={cardId}>
                  {cardComponents[cardId]}
                </SortableCard>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      {/* Right Column: Fixed Funnel */}
      <div className="w-full xl:w-[400px] shrink-0">
        <FunnelChart />
      </div>
    </div>
  </div>
);


}